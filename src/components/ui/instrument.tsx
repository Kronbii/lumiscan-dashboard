import type * as React from "react";
import type { ClassificationLabel } from "@/lib/enums";
import { cn } from "@/lib/utils";

/*
  Instrument-grade primitives. These carry the design system's signature
  motifs — use them instead of hand-rolling seams, labels, status marks,
  or image frames.
*/

export type StatusTone =
  | "benign"
  | "suspicious"
  | "malignant"
  | "inconclusive"
  | "accent"
  | "neutral";

export function classificationTone(
  label: ClassificationLabel | string | null | undefined,
): StatusTone {
  switch (label) {
    case "BENIGN":
      return "benign";
    case "SUSPICIOUS":
      return "suspicious";
    case "MALIGNANT":
      return "malignant";
    case "INCONCLUSIVE":
      return "inconclusive";
    default:
      return "neutral";
  }
}

/* The machined fascia: adjacent panels sharing 1px hairline seams.
   Children MUST set their own `bg-surface`. */
export function Fascia({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded border border-border bg-border",
        className,
      )}
      {...props}
    />
  );
}

/* Calibrated mono overline — the universal label voice. */
export function Overline({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("overline", className)} {...props} />;
}

/* A measured value: mono, tabular numerals. */
export function Datum({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("datum", className)} {...props} />;
}

/* The 8×2px cobalt registration mark that opens every section header. */
export function Tick({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block h-0.5 w-2 shrink-0 bg-primary", className)}
      aria-hidden
    />
  );
}

/* Tick + indexed overline: `01 · FLAGGED SCANS`. */
export function SectionLabel({
  index,
  title,
  className,
}: {
  index?: string;
  title: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Tick />
      <Overline className="text-muted">
        {index ? `${index} · ` : null}
        {title}
      </Overline>
    </span>
  );
}

const ledColor: Record<StatusTone, string> = {
  benign: "bg-benign border-benign-ink",
  suspicious: "bg-suspicious border-suspicious-ink",
  malignant: "bg-malignant border-malignant-ink",
  inconclusive: "bg-inconclusive border-inconclusive-ink",
  accent: "bg-primary border-primary-hover",
  neutral: "bg-faint border-muted",
};

/* Square status light. Always paired with a spelled-out label nearby. */
export function Led({
  tone,
  className,
}: {
  tone: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block size-2 shrink-0 border", ledColor[tone], className)}
      aria-hidden
    />
  );
}

const chipTone: Record<StatusTone, string> = {
  benign: "border-benign-border bg-benign-soft text-benign-ink",
  suspicious: "border-suspicious-border bg-suspicious-soft text-suspicious-ink",
  malignant: "border-malignant-border bg-malignant-soft text-malignant-ink",
  inconclusive:
    "border-inconclusive-border bg-inconclusive-soft text-inconclusive-ink",
  accent: "border-primary-soft-border bg-primary-soft text-primary-soft-foreground",
  neutral: "border-border-strong bg-surface-3 text-muted",
};

const chipDot: Record<StatusTone, string> = {
  benign: "bg-benign",
  suspicious: "bg-suspicious",
  malignant: "bg-malignant",
  inconclusive: "bg-inconclusive",
  accent: "bg-primary",
  neutral: "bg-faint",
};

/* Rectangular status chip — never a pill. `MALIGNANT · 94%` */
export function StatusChip({
  label,
  confidence,
  tone,
  className,
}: {
  label: string;
  confidence?: string | null;
  tone?: StatusTone;
  className?: string;
}) {
  const resolved = tone ?? classificationTone(label);
  return (
    <span
      className={cn(
        "datum inline-flex h-5 items-center gap-1.5 rounded-sm border px-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.08em]",
        chipTone[resolved],
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0", chipDot[resolved])} aria-hidden />
      {label}
      {confidence ? <span className="opacity-80">· {confidence}</span> : null}
    </span>
  );
}

export type DeltaRisk = "worse" | "better" | "stable";

const deltaColor: Record<DeltaRisk, string> = {
  worse: "text-malignant",
  better: "text-benign",
  stable: "text-faint",
};

/* Signed delta. The glyph follows the number; the COLOR follows clinical
   risk — a shrinking diameter reads green even though the number fell. */
export function Delta({
  value,
  unit,
  risk,
  precision = 1,
  className,
}: {
  value: number;
  unit?: string;
  risk: DeltaRisk;
  precision?: number;
  className?: string;
}) {
  const glyph = value > 0 ? "▲" : value < 0 ? "▼" : "–";
  const sign = value > 0 ? "+" : "";
  // Trim trailing zeros so a 0.5 mm change reads "+0.5", not "+0.50".
  const magnitude = String(Number(value.toFixed(precision)));
  return (
    <span
      className={cn(
        "datum inline-flex items-baseline gap-1 text-xs",
        deltaColor[risk],
        className,
      )}
    >
      <span className="text-[0.5625rem]">{glyph}</span>
      {sign}
      {magnitude}
      {unit ? <span className="text-[0.6875rem] opacity-75">{unit}</span> : null}
    </span>
  );
}

/* Optical viewfinder frame: sunken mat + four corner reticle brackets. */
export function ReticleFrame({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const corner = "absolute size-2 border-foreground/60";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-sm bg-surface-3",
        className,
      )}
      {...props}
    >
      {children}
      <span className={cn(corner, "left-1.5 top-1.5 border-l border-t")} aria-hidden />
      <span className={cn(corner, "right-1.5 top-1.5 border-r border-t")} aria-hidden />
      <span className={cn(corner, "bottom-1.5 left-1.5 border-b border-l")} aria-hidden />
      <span className={cn(corner, "bottom-1.5 right-1.5 border-b border-r")} aria-hidden />
    </div>
  );
}

/* Evidence caption under clinical imagery:
   `LSN-0042 · LEFT UPPER BACK · 2026-06-25 · MANUAL` */
export function SpecimenBar({
  items,
  className,
}: {
  items: Array<string | null | undefined>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "datum border-t border-border bg-surface-3 px-2 py-1 text-[0.625rem] uppercase tracking-[0.06em] text-muted",
        className,
      )}
    >
      {items.filter(Boolean).join(" · ")}
    </div>
  );
}

/* The dermatoscope ruler rule — brand divider. */
export function RulerStrip({
  dark,
  className,
}: {
  dark?: boolean;
  className?: string;
}) {
  return <div className={cn("ruler", dark && "ruler-dark", className)} aria-hidden />;
}
