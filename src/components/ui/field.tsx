import type * as React from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-1.5", className)}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint ? <span className="text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-faint hover:border-faint focus:border-primary focus:ring-2 focus:ring-[var(--ring)]";

export const textareaClass =
  "w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-faint hover:border-faint focus:border-primary focus:ring-2 focus:ring-[var(--ring)]";
