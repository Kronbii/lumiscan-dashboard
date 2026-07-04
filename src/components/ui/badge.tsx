import type * as React from "react";
import { cn } from "@/lib/utils";

const toneClass = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/25",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  grey: "bg-surface-3 text-muted ring-border-strong",
  teal: "bg-primary-soft text-primary-soft-foreground ring-primary/20",
} as const;

const dotClass = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  grey: "bg-faint",
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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        toneClass[tone],
        className,
      )}
      {...props}
    >
      {dot ? (
        <span className={cn("size-1.5 rounded-full", dotClass[tone])} aria-hidden />
      ) : null}
      {children}
    </span>
  );
}
