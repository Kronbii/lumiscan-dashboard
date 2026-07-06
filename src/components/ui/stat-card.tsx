import type { LucideIcon } from "lucide-react";
import { Overline } from "@/components/ui/instrument";
import { cn } from "@/lib/utils";

/*
  One cell of the instrument's stat fascia. Designed to sit inside a
  <Fascia> strip (grid gap-px bg-border) so a row of stats reads as one
  continuous milled panel, not floating cards.
*/
const tones = {
  teal: "text-primary",
  amber: "text-suspicious",
  red: "text-malignant",
  slate: "text-faint",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "slate",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <div className={cn("bg-surface p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <Overline>{label}</Overline>
        {Icon ? (
          <Icon className={cn("size-4", tones[tone])} strokeWidth={1.75} />
        ) : null}
      </div>
      <p className="datum mt-2 text-[1.75rem] font-medium leading-none text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-faint">{hint}</p> : null}
    </div>
  );
}
