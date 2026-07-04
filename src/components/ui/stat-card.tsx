import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  teal: "bg-primary-soft text-primary",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  slate: "bg-surface-3 text-muted",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "teal",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-sm transition-all duration-150 hover:border-border-strong hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-lg",
            tones[tone],
          )}
        >
          <Icon className="size-[1.15rem]" />
        </span>
      </div>
      <p className="nums mt-3 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-faint">{hint}</p> : null}
    </div>
  );
}
