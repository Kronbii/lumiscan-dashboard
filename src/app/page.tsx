import { Activity, ArrowRight, Building2, ScanLine } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Fascia,
  Led,
  Overline,
  RulerStrip,
  SectionLabel,
  Tick,
} from "@/components/ui/instrument";

const classifications = [
  {
    tone: "benign",
    label: "BENIGN",
    copy: "No features of concern. Continue routine surveillance intervals.",
  },
  {
    tone: "suspicious",
    label: "SUSPICIOUS",
    copy: "Atypical features detected. Schedule a short-interval review.",
  },
  {
    tone: "malignant",
    label: "MALIGNANT",
    copy: "High-risk pattern. Escalate for biopsy or specialist referral.",
  },
  {
    tone: "inconclusive",
    label: "INCONCLUSIVE",
    copy: "Insufficient signal. Recapture the image or assess manually.",
  },
] as const;

const features = [
  {
    index: "01",
    overline: "PROVENANCE",
    icon: ScanLine,
    title: "Scan provenance",
    copy: "Every image arrives with capture time, device serial, and source — manual or instrument — recorded at ingest and kept with the scan.",
  },
  {
    index: "02",
    overline: "EVOLUTION",
    icon: Activity,
    title: "Evolution timeline",
    copy: "Serial scans align on a single timeline. Diameter, asymmetry, and border deltas are computed against baseline, not eyeballed.",
  },
  {
    index: "03",
    overline: "ISOLATION",
    icon: Building2,
    title: "Org isolation",
    copy: "Patients, lesions, and imagery stay inside the clinic's organization. Every follow-up decision remains within its walls.",
  },
] as const;

/*
  Engineering drawing of the LS-1 handheld dermatoscope, drawn in code.
  Monochrome 1px ink on the ivory canvas, one cobalt reticle, one status chip.
*/
function DeviceSchematic() {
  const mono = "var(--font-plex-mono), ui-monospace, monospace";
  return (
    <svg
      viewBox="0 0 460 520"
      role="img"
      aria-label="Engineering schematic of the Lumiscan LS-1 handheld dermatoscope: front elevation with dimensions, sensor and MCU callouts, and a classification readout chip"
      className="h-auto w-full"
    >
      {/* vertical centerline */}
      <line
        x1="200"
        y1="46"
        x2="200"
        y2="444"
        stroke="var(--foreground)"
        strokeOpacity="0.16"
        strokeDasharray="12 4 2 4"
      />

      {/* ---- primary silhouette ---- */}
      <g fill="none" stroke="var(--foreground)" strokeOpacity="0.75" strokeWidth="1">
        {/* optical head */}
        <rect x="118" y="64" width="164" height="140" rx="18" />
        {/* neck */}
        <path d="M162 204 L170 222 M238 204 L230 222" />
        {/* handle */}
        <rect x="158" y="222" width="84" height="196" rx="14" />
      </g>

      {/* ---- optics ---- */}
      <g fill="none" stroke="var(--foreground)" strokeWidth="1">
        <circle cx="200" cy="134" r="46" strokeOpacity="0.6" />
        <circle cx="200" cy="134" r="34" strokeOpacity="0.4" />
        <circle cx="200" cy="134" r="24" strokeOpacity="0.25" />
        {/* bezel registration ticks at 45° */}
        <path
          d="M232.5 101.5 L238.2 95.8 M167.5 101.5 L161.8 95.8 M167.5 166.5 L161.8 172.2 M232.5 166.5 L238.2 172.2"
          strokeOpacity="0.4"
        />
      </g>

      {/* cobalt reticle — the drawing's single accent */}
      <g stroke="var(--primary)" strokeWidth="1">
        <line x1="200" y1="104" x2="200" y2="164" />
        <line x1="170" y1="134" x2="230" y2="134" />
      </g>
      <circle cx="200" cy="134" r="1.5" fill="var(--primary)" />

      {/* ---- handle details ---- */}
      <g fill="none" stroke="var(--foreground)" strokeWidth="1">
        {/* capture button */}
        <circle cx="200" cy="246" r="7" strokeOpacity="0.55" />
        <circle cx="200" cy="246" r="2" fill="var(--foreground)" fillOpacity="0.45" stroke="none" />
        {/* ESP32 board, hidden line convention */}
        <rect x="174" y="272" width="52" height="92" strokeOpacity="0.45" strokeDasharray="3 3" />
        {/* meander antenna */}
        <path d="M180 278 h9 v5 h-7 v5 h9" strokeOpacity="0.4" />
        {/* module can */}
        <rect x="186" y="296" width="28" height="28" strokeOpacity="0.5" />
        {/* pins */}
        <path
          d="M181 302 h5 M181 309 h5 M181 316 h5 M214 302 h5 M214 309 h5 M214 316 h5"
          strokeOpacity="0.35"
        />
        {/* traces */}
        <path d="M182 336 h36 M182 344 h26 M182 352 h36" strokeOpacity="0.3" />
        {/* USB-C */}
        <rect x="189" y="404" width="22" height="6" rx="3" strokeOpacity="0.5" />
      </g>

      {/* ---- dimensions ---- */}
      <g fill="none" stroke="var(--foreground)" strokeOpacity="0.45" strokeWidth="1">
        {/* overall height, left */}
        <path d="M118 64 H96 M158 418 H96" />
        <line x1="100" y1="64" x2="100" y2="418" />
        <path d="M96 68 L104 60 M96 422 L104 414" />
        {/* head width, top */}
        <path d="M118 64 V40 M282 64 V40" />
        <line x1="118" y1="44" x2="282" y2="44" />
        <path d="M114 48 L122 40 M278 48 L286 40" />
      </g>
      <text
        transform="rotate(-90 86 241)"
        x="86"
        y="241"
        textAnchor="middle"
        fontFamily={mono}
        fontSize="10"
        letterSpacing="0.08em"
        fill="var(--faint)"
      >
        128 mm
      </text>
      <text
        x="200"
        y="36"
        textAnchor="middle"
        fontFamily={mono}
        fontSize="10"
        letterSpacing="0.08em"
        fill="var(--faint)"
      >
        59 mm
      </text>

      {/* ---- leader callouts ---- */}
      <g fill="none" stroke="var(--foreground)" strokeOpacity="0.4" strokeWidth="1">
        <path d="M238 108 L282 84 H452" />
        <path d="M226 318 L282 318 L302 338 H452" />
        <path d="M242 398 L302 430 H452" />
      </g>
      <g fill="var(--foreground)" fillOpacity="0.65">
        <circle cx="238" cy="108" r="1.5" />
        <circle cx="226" cy="318" r="1.5" />
        <circle cx="242" cy="398" r="1.5" />
      </g>
      <g fontFamily={mono} fontSize="10" letterSpacing="0.08em" fill="var(--muted)">
        <text x="284" y="79">SENSOR · 5 MP</text>
        <text x="304" y="333">MCU · ESP32-S3</text>
        <text x="304" y="425">SN · LS-0413</text>
      </g>

      {/* ---- classification readout: dotted signal trace from lens ---- */}
      <path
        d="M224 134 H290 V208 H310"
        fill="none"
        stroke="var(--foreground)"
        strokeOpacity="0.45"
        strokeWidth="1"
        strokeDasharray="1.5 3.5"
      />
      <text
        x="310"
        y="189"
        fontFamily={mono}
        fontSize="9"
        letterSpacing="0.08em"
        fill="var(--faint)"
      >
        CLASS
      </text>
      <rect
        x="310"
        y="195"
        width="142"
        height="26"
        rx="2"
        fill="var(--suspicious-soft)"
        stroke="var(--suspicious-border)"
      />
      <rect
        x="320"
        y="205"
        width="6"
        height="6"
        fill="var(--suspicious)"
        stroke="var(--suspicious-ink)"
      />
      <text
        x="334"
        y="212"
        dominantBaseline="middle"
        fontFamily={mono}
        fontSize="10"
        letterSpacing="0.06em"
        fill="var(--suspicious-ink)"
      >
        SUSPICIOUS · 87%
      </text>
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* ---- top bar ---- */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 items-center justify-center rounded-sm border border-border-strong bg-surface text-foreground">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.25" opacity="0.5" />
                <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="1.25" fill="currentColor" />
                <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" stroke="currentColor" strokeWidth="1.25" />
              </svg>
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold leading-none tracking-tight">
                Lumiscan
              </span>
              <Overline className="text-[0.5625rem] leading-none">
                Dermatoscopic unit
              </Overline>
            </span>
          </div>
          <span className="inline-flex items-center gap-2">
            <Led tone="neutral" />
            <Overline>Local prototype</Overline>
          </span>
        </div>
      </header>

      {/* ---- hero ---- */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
        <div>
          <span className="flex items-center gap-2">
            <Tick />
            <Overline>Dermatoscopic screening platform</Overline>
          </span>
          <h1 className="mt-6 text-[clamp(2.5rem,6vw,4rem)] font-bold leading-[1.05] tracking-tight">
            See what changes,
            <br />
            before it matters.
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-7 text-muted">
            A clinical workspace for serial dermoscopy — record lesion scans,
            measure change against baseline, and keep every follow-up decision
            inside the doctor&apos;s organization.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/app">
                Open workspace <ArrowRight strokeWidth={1.75} />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/app/patients">View patients</Link>
            </Button>
          </div>
        </div>

        <figure className="w-full max-w-115 justify-self-center lg:justify-self-end">
          <DeviceSchematic />
          <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <Overline>Fig. 01 · LS-1 handheld unit</Overline>
            <Overline>Front elevation · 1:1</Overline>
          </figcaption>
        </figure>
      </section>

      <div className="mx-auto max-w-6xl px-6">
        <RulerStrip />
      </div>

      {/* ---- classification semantics ---- */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <SectionLabel title="CLASSIFICATION INDEX" />
          <h2 className="mt-4 text-xl font-semibold tracking-tight">
            The instrument reports in four states.
          </h2>
          <p className="mt-2 text-[13px] leading-6 text-muted">
            Every scan resolves to one of four indicator lights — the same
            semantics across capture, timeline, and management.
          </p>
        </div>
        <Fascia className="mt-8 grid-cols-2 lg:grid-cols-4">
          {classifications.map((c) => (
            <div key={c.label} className="bg-surface p-5">
              <span className="flex items-center gap-2">
                <Led tone={c.tone} />
                <Overline className="text-foreground">{c.label}</Overline>
              </span>
              <p className="mt-3 text-[13px] leading-6 text-muted">{c.copy}</p>
            </div>
          ))}
        </Fascia>
      </section>

      <div className="mx-auto max-w-6xl px-6">
        <RulerStrip />
      </div>

      {/* ---- platform features ---- */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Fascia className="lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.index} className="bg-surface p-6">
              <SectionLabel index={f.index} title={f.overline} />
              <f.icon className="mt-6 size-4.5 text-muted" strokeWidth={1.75} />
              <h3 className="mt-4 text-base font-semibold tracking-tight">
                {f.title}
              </h3>
              <p className="mt-2 text-[13px] leading-6 text-muted">{f.copy}</p>
            </div>
          ))}
        </Fascia>
      </section>

      {/* ---- footer ---- */}
      <footer className="mx-auto max-w-6xl px-6 pb-10">
        <RulerStrip />
        <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
          <Overline>Lumiscan · Local prototype</Overline>
          <Overline>Not for primary diagnostic use</Overline>
        </div>
      </footer>
    </main>
  );
}
