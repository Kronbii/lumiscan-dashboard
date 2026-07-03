import { z } from "zod";

const score = z.number().min(0).max(10);

export const metricsSchema = z
  .object({
    diameter_mm: z.number().min(0).optional(),
    asymmetry_score: score.optional(),
    border_irregularity_score: score.optional(),
    color_variation_score: score.optional(),
    area_mm2: z.number().min(0).optional(),
    raw: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type ScanMetrics = z.infer<typeof metricsSchema>;

export const chartedMetricKeys = [
  "diameter_mm",
  "asymmetry_score",
  "border_irregularity_score",
  "color_variation_score",
  "area_mm2",
] as const;

export type ChartedMetricKey = (typeof chartedMetricKeys)[number];

export function metricLabel(metric: ChartedMetricKey) {
  return (
    {
      diameter_mm: "Diameter",
      asymmetry_score: "Asymmetry",
      border_irregularity_score: "Border",
      color_variation_score: "Color variation",
      area_mm2: "Area",
    } satisfies Record<ChartedMetricKey, string>
  )[metric];
}
