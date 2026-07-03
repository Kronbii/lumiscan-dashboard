import type * as React from "react";
import { cn } from "@/lib/utils";

const toneClass = {
  green: "border-green-200 bg-green-50 text-green-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-red-800",
  grey: "border-zinc-200 bg-zinc-100 text-zinc-700",
  teal: "border-teal-200 bg-teal-50 text-teal-800",
} as const;

export function Badge({
  className,
  tone = "grey",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof toneClass;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium",
        toneClass[tone],
        className,
      )}
      {...props}
    />
  );
}
