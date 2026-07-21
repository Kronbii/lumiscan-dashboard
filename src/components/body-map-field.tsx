"use client";

import { useRef, useState } from "react";
import { bodyRegions, bodySides, type BodyRegion, type BodySide } from "@/lib/enums";
import { humanize } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type View = "FRONT" | "BACK";
type Shape =
  | { t: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { t: "rect"; x: number; y: number; w: number; h: number; r: number };
export type Zone = { region: BodyRegion; side: BodySide; shape: Shape };

export const VB_W = 200;
export const VB_H = 360;

// Shared limb/torso geometry (viewer coordinates). Anatomical left/right flip
// between the front and back figures, which is medically correct.
const S = {
  head: { t: "ellipse", cx: 100, cy: 26, rx: 15, ry: 18 } as Shape,
  neck: { t: "rect", x: 92, y: 42, w: 16, h: 11, r: 3 } as Shape,
  torsoUpper: { t: "rect", x: 72, y: 54, w: 56, h: 44, r: 7 } as Shape,
  torsoLower: { t: "rect", x: 75, y: 98, w: 50, h: 44, r: 7 } as Shape,
  armViewerLeft: { t: "rect", x: 46, y: 57, w: 18, h: 70, r: 9 } as Shape,
  armViewerRight: { t: "rect", x: 136, y: 57, w: 18, h: 70, r: 9 } as Shape,
  handViewerLeft: { t: "ellipse", cx: 55, cy: 135, rx: 8, ry: 10 } as Shape,
  handViewerRight: { t: "ellipse", cx: 145, cy: 135, rx: 8, ry: 10 } as Shape,
  legViewerLeft: { t: "rect", x: 76, y: 143, w: 22, h: 150, r: 8 } as Shape,
  legViewerRight: { t: "rect", x: 102, y: 143, w: 22, h: 150, r: 8 } as Shape,
  footViewerLeft: { t: "ellipse", cx: 87, cy: 300, rx: 11, ry: 9 } as Shape,
  footViewerRight: { t: "ellipse", cx: 113, cy: 300, rx: 11, ry: 9 } as Shape,
};

export const FRONT: Zone[] = [
  { region: "HEAD", side: "MIDLINE", shape: S.head },
  { region: "NECK", side: "MIDLINE", shape: S.neck },
  { region: "CHEST", side: "MIDLINE", shape: S.torsoUpper },
  { region: "ABDOMEN", side: "MIDLINE", shape: S.torsoLower },
  { region: "RIGHT_ARM", side: "RIGHT", shape: S.armViewerLeft },
  { region: "LEFT_ARM", side: "LEFT", shape: S.armViewerRight },
  { region: "RIGHT_HAND", side: "RIGHT", shape: S.handViewerLeft },
  { region: "LEFT_HAND", side: "LEFT", shape: S.handViewerRight },
  { region: "RIGHT_LEG", side: "RIGHT", shape: S.legViewerLeft },
  { region: "LEFT_LEG", side: "LEFT", shape: S.legViewerRight },
  { region: "RIGHT_FOOT", side: "RIGHT", shape: S.footViewerLeft },
  { region: "LEFT_FOOT", side: "LEFT", shape: S.footViewerRight },
];

export const BACK: Zone[] = [
  { region: "HEAD", side: "MIDLINE", shape: S.head },
  { region: "NECK", side: "MIDLINE", shape: S.neck },
  { region: "UPPER_BACK", side: "MIDLINE", shape: S.torsoUpper },
  { region: "LOWER_BACK", side: "MIDLINE", shape: S.torsoLower },
  { region: "LEFT_ARM", side: "LEFT", shape: S.armViewerLeft },
  { region: "RIGHT_ARM", side: "RIGHT", shape: S.armViewerRight },
  { region: "LEFT_HAND", side: "LEFT", shape: S.handViewerLeft },
  { region: "RIGHT_HAND", side: "RIGHT", shape: S.handViewerRight },
  { region: "LEFT_LEG", side: "LEFT", shape: S.legViewerLeft },
  { region: "RIGHT_LEG", side: "RIGHT", shape: S.legViewerRight },
  { region: "LEFT_FOOT", side: "LEFT", shape: S.footViewerLeft },
  { region: "RIGHT_FOOT", side: "RIGHT", shape: S.footViewerRight },
];

const BACK_REGIONS = new Set<BodyRegion>(["UPPER_BACK", "LOWER_BACK"]);
export function naturalView(region: BodyRegion): View {
  return BACK_REGIONS.has(region) ? "BACK" : "FRONT";
}
export function zonesFor(view: View) {
  return view === "FRONT" ? FRONT : BACK;
}

export function ShapeEl({
  shape,
  className,
  onClick,
}: {
  shape: Shape;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const common = { className, onClick, style: onClick ? { cursor: "pointer" } : undefined };
  if (shape.t === "ellipse") {
    return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...common} />;
  }
  return (
    <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.r} {...common} />
  );
}

export function BodyMapField({
  defaultRegion,
  defaultSide,
  defaultX,
  defaultY,
  readOnly = false,
}: {
  defaultRegion?: BodyRegion | null;
  defaultSide?: BodySide | null;
  // Postgres numeric columns come back as strings, so accept either.
  defaultX?: number | string | null;
  defaultY?: number | string | null;
  readOnly?: boolean;
}) {
  const initialRegion = (defaultRegion ?? "CHEST") as BodyRegion;
  const dx = defaultX == null ? null : Number(defaultX);
  const dy = defaultY == null ? null : Number(defaultY);
  const [region, setRegion] = useState<BodyRegion>(initialRegion);
  const [side, setSide] = useState<BodySide>((defaultSide ?? "MIDLINE") as BodySide);
  const [view, setView] = useState<View>(naturalView(initialRegion));
  const [pos, setPos] = useState<{ x: number; y: number } | null>(
    dx != null && dy != null && Number.isFinite(dx) && Number.isFinite(dy)
      ? { x: dx, y: dy }
      : null,
  );
  const svgRef = useRef<SVGSVGElement>(null);

  const zones = zonesFor(view);

  function placeAt(zone: Zone, clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    setRegion(zone.region);
    setSide(zone.side);
    setPos({ x, y });
  }

  const pinX = pos ? pos.x * VB_W : null;
  const pinY = pos ? pos.y * VB_H : null;
  const showPin = pos != null && zones.some((z) => z.region === region);

  return (
    <div className="grid gap-3">
      {!readOnly ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.8125rem] font-semibold text-foreground">
            Location on body
          </span>
          <div className="inline-flex rounded-sm border border-border-strong">
            {(["FRONT", "BACK"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn(
                  "datum h-7 border-l border-border-strong px-3 text-[0.6875rem] font-medium uppercase tracking-[0.08em] transition-colors first:border-l-0",
                  view === v
                    ? "bg-foreground text-surface"
                    : "bg-surface text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "grid place-items-center rounded-sm border border-border bg-surface-3",
          readOnly ? "p-2" : "p-4",
        )}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className={cn("h-auto", readOnly ? "w-32" : "w-full max-w-55")}
          role="img"
          aria-label={`Body map — ${humanize(region)}`}
        >
          {zones.map((zone) => {
            const selected = zone.region === region;
            return (
              <ShapeEl
                key={`${zone.region}-${zone.side}`}
                shape={zone.shape}
                onClick={readOnly ? undefined : (e) => placeAt(zone, e.clientX, e.clientY)}
                className={cn(
                  "transition-colors",
                  selected
                    ? "fill-primary-soft stroke-primary"
                    : "fill-surface stroke-border-strong hover:fill-surface-2",
                )}
              />
            );
          })}

          {showPin && pinX != null && pinY != null ? (
            <g className="pointer-events-none">
              <circle cx={pinX} cy={pinY} r={6} className="fill-primary" opacity={0.18} />
              <circle cx={pinX} cy={pinY} r={2.6} className="fill-primary" />
              <path
                d={`M${pinX} ${pinY - 9}v5M${pinX} ${pinY + 4}v5M${pinX - 9} ${pinY}h5M${pinX + 4} ${pinY}h5`}
                className="stroke-primary"
                strokeWidth={1.4}
                strokeLinecap="round"
              />
            </g>
          ) : null}
        </svg>
      </div>

      {!readOnly ? (
        <>
          <p className="datum text-center text-[0.6875rem] uppercase tracking-[0.08em] text-faint">
            {pos
              ? `${humanize(region)} · ${humanize(side)} · ${view} · X ${pos.x.toFixed(2)} Y ${pos.y.toFixed(2)}`
              : "Tap the figure to mark the lesion location"}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="overline text-faint">Body region</span>
              <select
                name="bodyRegion"
                value={region}
                onChange={(e) => {
                  const r = e.target.value as BodyRegion;
                  setRegion(r);
                  const v = naturalView(r);
                  setView(v);
                  const z = zonesFor(v).find((z) => z.region === r);
                  if (z) setSide(z.side);
                }}
                className="h-10 rounded-sm border border-border-strong bg-surface px-3 text-sm text-foreground"
                required
              >
                {bodyRegions.map((r) => (
                  <option key={r} value={r}>
                    {humanize(r)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="overline text-faint">Side</span>
              <select
                name="bodySide"
                value={side}
                onChange={(e) => setSide(e.target.value as BodySide)}
                className="h-10 rounded-sm border border-border-strong bg-surface px-3 text-sm text-foreground"
                required
              >
                {bodySides.map((sideOption) => (
                  <option key={sideOption} value={sideOption}>
                    {humanize(sideOption)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <input type="hidden" name="bodyMapX" value={pos ? pos.x.toFixed(4) : ""} />
          <input type="hidden" name="bodyMapY" value={pos ? pos.y.toFixed(4) : ""} />
        </>
      ) : (
        <p className="datum text-center text-[0.625rem] uppercase tracking-[0.08em] text-faint">
          {humanize(region)} · {humanize(side)}
        </p>
      )}
    </div>
  );
}
