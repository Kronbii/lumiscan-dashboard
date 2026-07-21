import { Datum, Fascia, Led, Overline } from "@/components/ui/instrument";
import { cn } from "@/lib/utils";

function numeric(metrics: Record<string, unknown>, key: string): number | null {
  const v = metrics[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

type Cell = {
  letter: string;
  label: string;
  value: number | null;
  unit: string;
  flagged: boolean;
  note?: string;
};

/*
  ABCDE is how a dermatologist reads a pigmented lesion. The captured metrics
  already ARE A/B/C/D — this frames them with the clinical letters, the ≥6 mm
  diameter flag, and E (evolving) from the lesion trend. Never color alone: each
  cell spells "FLAG" / "WITHIN RANGE".
*/
export function AbcdePanel({
  metrics,
  evolving,
}: {
  metrics: Record<string, unknown>;
  evolving?: string | null;
}) {
  const asymmetry = numeric(metrics, "asymmetry_score");
  const border = numeric(metrics, "border_irregularity_score");
  const color = numeric(metrics, "color_variation_score");
  const diameter = numeric(metrics, "diameter_mm");

  const cells: Cell[] = [
    { letter: "A", label: "Asymmetry", value: asymmetry, unit: "/ 10", flagged: (asymmetry ?? 0) >= 5 },
    { letter: "B", label: "Border", value: border, unit: "/ 10", flagged: (border ?? 0) >= 5 },
    { letter: "C", label: "Color", value: color, unit: "/ 10", flagged: (color ?? 0) >= 5 },
    { letter: "D", label: "Diameter", value: diameter, unit: "mm", flagged: (diameter ?? 0) >= 6, note: "≥ 6 mm" },
  ];

  const evolvingFlag = evolving === "WORSENING";
  const evolvingTone: "malignant" | "benign" | "neutral" =
    evolving === "WORSENING" ? "malignant" : evolving === "IMPROVING" ? "benign" : "neutral";
  const evolvingWord =
    evolving === "WORSENING"
      ? "WORSENING"
      : evolving === "IMPROVING"
        ? "IMPROVING"
        : evolving === "STABLE"
          ? "STABLE"
          : "TRACK OVER TIME";

  return (
    <Fascia className="grid-cols-2 sm:grid-cols-5">
      {cells.map((cell) => (
        <div key={cell.letter} className="grid content-start gap-1 bg-surface px-3 py-2.5">
          <Overline className="block truncate">
            {cell.letter} · {cell.label}
          </Overline>
          <div className="flex items-baseline gap-1">
            <Datum className="text-sm font-medium text-foreground">
              {cell.value ?? "—"}
            </Datum>
            {cell.value !== null ? (
              <span className="text-[0.6875rem] text-faint">{cell.unit}</span>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <Led tone={cell.value === null ? "neutral" : cell.flagged ? "suspicious" : "benign"} />
            <span
              className={cn(
                "datum text-[0.5625rem] uppercase tracking-[0.08em]",
                cell.flagged ? "text-suspicious" : "text-faint",
              )}
            >
              {cell.value === null ? "—" : cell.flagged ? cell.note ?? "FLAG" : "WITHIN RANGE"}
            </span>
          </div>
        </div>
      ))}
      <div className="grid content-start gap-1 bg-surface px-3 py-2.5">
        <Overline className="block truncate">E · Evolving</Overline>
        <div className="flex items-center gap-1.5 pt-0.5">
          <Led tone={evolvingTone} />
          <span
            className={cn(
              "datum text-[0.625rem] uppercase tracking-[0.06em]",
              evolvingFlag ? "text-malignant" : "text-muted",
            )}
          >
            {evolvingWord}
          </span>
        </div>
      </div>
    </Fascia>
  );
}
