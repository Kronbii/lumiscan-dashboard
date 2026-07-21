import "server-only";

import sharp from "sharp";

/*
  Demo placeholder generator. The seed dataset ships scan-image DB rows whose
  bytes are either 1×1 stubs (local) or entirely absent from object storage
  (hosted) — so lesion pictures render blank. Rather than mirror image bytes
  between environments (the storage credentials are write-only), the image
  proxy renders a deterministic synthetic dermoscopic image in-process whenever
  the real object is missing or a stub. Same key → same image everywhere.

  This is prototype-only behavior: it fabricates illustrative imagery for
  synthetic seed lesions. A real clinical deployment must NOT generate stand-in
  images — it should surface a genuine "image unavailable" state instead.
*/

type RiskLabel = "BENIGN" | "INCONCLUSIVE" | "SUSPICIOUS" | "MALIGNANT";

const PROFILE: Record<
  RiskLabel,
  { r: number; jitter: number; base: [string, string]; patches: string[]; hairs: number }
> = {
  BENIGN: { r: 105, jitter: 0.1, base: ["#a9744e", "#6f4327"], patches: [], hairs: 3 },
  INCONCLUSIVE: { r: 118, jitter: 0.18, base: ["#8f5a34", "#4f2f19"], patches: ["#2a1a10"], hairs: 4 },
  SUSPICIOUS: { r: 132, jitter: 0.28, base: ["#7a4a2c", "#3a2213"], patches: ["#1c1109", "#6b2f2a"], hairs: 5 },
  MALIGNANT: { r: 150, jitter: 0.4, base: ["#5f3a22", "#241208"], patches: ["#0e0805", "#33424f", "#6b241f"], hairs: 6 },
};

function hashStr(str: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mkRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function blobPath(
  cx: number,
  cy: number,
  r: number,
  jitter: number,
  rand: () => number,
  n = 12,
) {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const rad = r * (1 + (rand() * 2 - 1) * jitter);
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
  }
  let d = `M ${pts[0]![0].toFixed(1)} ${pts[0]![1].toFixed(1)} `;
  for (let i = 0; i < n; i += 1) {
    const p0 = pts[(i - 1 + n) % n]!, p1 = pts[i]!, p2 = pts[(i + 1) % n]!, p3 = pts[(i + 2) % n]!;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} `;
  }
  return `${d}Z`;
}

function buildSvg(seed: number, label: RiskLabel) {
  const rand = mkRng(seed);
  const p = PROFILE[label];
  const S = 512;
  const off = label === "MALIGNANT" ? 28 : 10;
  const cx = S / 2 + (rand() * 2 - 1) * off;
  const cy = S / 2 + (rand() * 2 - 1) * off;

  let hairs = "";
  for (let i = 0; i < p.hairs; i += 1) {
    const x1 = rand() * S, y1 = rand() * S, x2 = rand() * S, y2 = rand() * S;
    const mx = (x1 + x2) / 2 + (rand() * 2 - 1) * 60, my = (y1 + y2) / 2 + (rand() * 2 - 1) * 60;
    hairs += `<path d="M ${x1.toFixed(0)} ${y1.toFixed(0)} Q ${mx.toFixed(0)} ${my.toFixed(0)} ${x2.toFixed(0)} ${y2.toFixed(0)}" stroke="#4a3020" stroke-width="${(1.4 + rand() * 1.8).toFixed(1)}" fill="none" opacity="0.28" stroke-linecap="round"/>`;
  }
  let patches = "";
  for (const col of p.patches) {
    const px = cx + (rand() * 2 - 1) * p.r * 0.55, py = cy + (rand() * 2 - 1) * p.r * 0.55;
    patches += `<path d="${blobPath(px, py, p.r * (0.28 + rand() * 0.22), 0.5, rand, 8)}" fill="${col}" opacity="0.75"/>`;
  }
  let glob = "";
  for (let i = 0; i < 3 + Math.floor(rand() * 4); i += 1) {
    const gx = cx + (rand() * 2 - 1) * p.r * 0.7, gy = cy + (rand() * 2 - 1) * p.r * 0.7, gr = 3 + rand() * 7;
    glob += `<circle cx="${gx.toFixed(0)}" cy="${gy.toFixed(0)}" r="${gr.toFixed(1)}" fill="#1a0f08" opacity="0.5"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
    <defs>
      <radialGradient id="skin" cx="48%" cy="42%" r="80%">
        <stop offset="0%" stop-color="#f4d6ba"/><stop offset="70%" stop-color="#e3b591"/><stop offset="100%" stop-color="#c9946c"/>
      </radialGradient>
      <radialGradient id="pig" cx="45%" cy="42%" r="70%">
        <stop offset="0%" stop-color="${p.base[0]}"/><stop offset="100%" stop-color="${p.base[1]}"/>
      </radialGradient>
      <radialGradient id="vig" cx="50%" cy="50%" r="72%">
        <stop offset="60%" stop-color="#000000" stop-opacity="0"/><stop offset="100%" stop-color="#0a0603" stop-opacity="0.55"/>
      </radialGradient>
    </defs>
    <rect width="${S}" height="${S}" fill="url(#skin)"/>
    <ellipse cx="${(S * 0.35).toFixed(0)}" cy="${(S * 0.3).toFixed(0)}" rx="180" ry="140" fill="#ffffff" opacity="0.06"/>
    ${hairs}
    <path d="${blobPath(cx, cy, p.r, p.jitter, mkRng(seed ^ 0x9e37), 14)}" fill="url(#pig)" opacity="0.94"/>
    ${patches}
    ${glob}
    <rect width="${S}" height="${S}" fill="url(#vig)"/>
  </svg>`;
}

const FALLBACK_LABELS: RiskLabel[] = ["BENIGN", "INCONCLUSIVE", "SUSPICIOUS", "MALIGNANT"];

export async function renderScanImage(input: {
  seed: string;
  label?: string | null;
  webp: boolean;
}): Promise<Buffer> {
  const seed = hashStr(input.seed);
  const label: RiskLabel =
    input.label && input.label in PROFILE
      ? (input.label as RiskLabel)
      : FALLBACK_LABELS[seed % FALLBACK_LABELS.length]!;
  const svg = Buffer.from(buildSvg(seed, label));
  const pipeline = sharp(svg);
  return input.webp ? pipeline.webp({ quality: 82 }).toBuffer() : pipeline.png().toBuffer();
}
