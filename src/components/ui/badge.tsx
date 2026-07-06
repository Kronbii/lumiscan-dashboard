import type * as React from "react";
import { cn } from "@/lib/utils";

/*
  Rectangular status chip — never a pill. Mono uppercase with a leading
  square indicator. Tone keys are stable across the app (classificationColor
  in lib/enums.ts maps BENIGN→green, SUSPICIOUS→amber, MALIGNANT→red,
  INCONCLUSIVE→grey; "teal" is the cobalt accent tone).
*/
const toneClass = {
  green: "border-benign-border bg-benign-soft text-benign-ink",
  amber: "border-suspicious-border bg-suspicious-soft text-suspicious-ink",
  red: "border-malignant-border bg-malignant-soft text-malignant-ink",
  grey: "border-inconclusive-border bg-inconclusive-soft text-inconclusive-ink",
  teal: "border-primary-soft-border bg-primary-soft text-primary-soft-foreground",
} as const;

const dotClass = {
  green: "bg-benign",
  amber: "bg-suspicious",
  red: "bg-malignant",
  grey: "bg-inconclusive",
  teal: "bg-primary",
} as const;

export function Badge({
  className,
  tone = "grey",
  dot = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof toneClass;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "datum inline-flex min-h-5 items-center gap-1.5 rounded-sm border px-1.5 py-px text-[0.6875rem] font-medium uppercase tracking-[0.08em]",
        toneClass[tone],
        className,
      )}
      {...props}
    >
      {dot ? <span className={cn("size-1.5 shrink-0", dotClass[tone])} aria-hidden /> : null}
      {children}
    </span>
  );
}
