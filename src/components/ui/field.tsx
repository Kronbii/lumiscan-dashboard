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
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[0.8125rem] font-semibold text-foreground">
          {label}
        </span>
        {hint ? <span className="overline text-[0.625rem]">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "h-9 w-full rounded-sm border border-border-strong bg-surface px-3 text-[0.8125rem] text-foreground outline-none transition-colors placeholder:text-faint hover:border-faint focus:border-primary focus:ring-2 focus:ring-[var(--ring)]";

export const textareaClass =
  "min-h-24 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-[0.8125rem] text-foreground outline-none transition-colors placeholder:text-faint hover:border-faint focus:border-primary focus:ring-2 focus:ring-[var(--ring)]";

/* Device-read values arrive in a sunken mono well. */
export const readonlyClass =
  "datum h-9 w-full rounded-sm border border-border bg-surface-3 px-3 text-[0.8125rem] text-muted outline-none";
