import { differenceInCalendarDays } from "date-fns";
import type { ClassificationLabel } from "@/lib/enums";
import { isFlaggedLabel } from "@/lib/enums";
import {
  chartedMetricKeys,
  type ChartedMetricKey,
  type ScanMetrics,
} from "@/lib/schemas/metrics";
import type { LesionCreateInput, LesionUpdateInput } from "@/lib/schemas/lesion";
import type { OrgContext } from "@/server/auth/org-context";
import { audit } from "@/server/audit/audit";
import { repo, type TimelineScanRow } from "@/server/db/scoped-repo";
import { scanImageProxyPath } from "@/server/storage/presign";

export type MetricDelta = {
  metric: ChartedMetricKey;
  value: number | null;
  previousValue: number | null;
  delta: number | null;
  direction: "up" | "down" | "flat" | "unknown";
};

export type TimelinePoint = {
  scanId: string;
  capturedAt: string;
  source: "MANUAL" | "DEVICE";
  label: ClassificationLabel;
  confidence: number;
  confidenceLabel: ClassificationLabel;
  metrics: ScanMetrics;
  metricsScale: string;
  partialData: boolean;
  primaryImageUrl: string | null;
  primaryObjectKey: string | null;
  elapsedDaysFromPrevious: number | null;
  elapsedDaysFromBaseline: number;
  deltas: MetricDelta[];
};

function numericMetric(metrics: ScanMetrics, key: ChartedMetricKey) {
  const value = metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function deltaFor(
  current: ScanMetrics,
  previous: ScanMetrics | null,
  key: ChartedMetricKey,
): MetricDelta {
  const value = numericMetric(current, key);
  const previousValue = previous ? numericMetric(previous, key) : null;
  const delta =
    value === null || previousValue === null
      ? null
      : Number((value - previousValue).toFixed(2));
  const direction =
    delta === null ? "unknown" : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return { metric: key, value, previousValue, delta, direction };
}

export function buildTimelineRows(rows: TimelineScanRow[]) {
  const baseline = rows[0]?.scan.capturedAt ?? null;

  return rows.map((row, index) => {
    const previous = rows[index - 1] ?? null;
    const primary =
      row.images.find((image) => image.isPrimary) ?? row.images[0] ?? null;
    const partialData =
      row.classification.metricsScale === "UNCALIBRATED" ||
      numericMetric(row.classification.metrics, "diameter_mm") === null;

    return {
      scan: row.scan,
      classification: row.classification,
      primary,
      partialData,
      elapsedDaysFromPrevious: previous
        ? differenceInCalendarDays(row.scan.capturedAt, previous.scan.capturedAt)
        : null,
      elapsedDaysFromBaseline: baseline
        ? differenceInCalendarDays(row.scan.capturedAt, baseline)
        : 0,
      deltas: chartedMetricKeys.map((key) =>
        deltaFor(
          row.classification.metrics,
          previous?.classification.metrics ?? null,
          key,
        ),
      ),
    };
  });
}

export const lesionService = {
  list(ctx: OrgContext) {
    return repo(ctx).lesions.list();
  },

  listByPatient(ctx: OrgContext, patientId: string) {
    return repo(ctx).lesions.listByPatient(patientId);
  },

  // For callers that validate the patient separately (patient-detail page).
  listByPatientUnchecked(ctx: OrgContext, patientId: string) {
    return repo(ctx).lesions.listByPatientUnchecked(patientId);
  },

  getById(ctx: OrgContext, id: string) {
    return repo(ctx).lesions.getById(id);
  },

  async create(ctx: OrgContext, input: LesionCreateInput) {
    const lesion = await repo(ctx).lesions.create(input);
    await audit(ctx, {
      action: "lesion.create",
      resourceType: "lesion",
      resourceId: lesion.id,
    });
    return lesion;
  },

  async update(ctx: OrgContext, input: LesionUpdateInput) {
    const lesion = await repo(ctx).lesions.update(input);
    await audit(ctx, {
      action: "lesion.update",
      resourceType: "lesion",
      resourceId: lesion.id,
    });
    return lesion;
  },

  async softDelete(ctx: OrgContext, id: string) {
    const lesion = await repo(ctx).lesions.softDelete(id);
    await audit(ctx, {
      action: "lesion.soft_delete",
      resourceType: "lesion",
      resourceId: lesion.id,
    });
    return lesion;
  },

  async timeline(ctx: OrgContext, lesionId: string) {
    const scoped = repo(ctx);
    const lesion = await scoped.lesions.getById(lesionId);
    const [patient, rows] = await Promise.all([
      scoped.patients.getById(lesion.patientId),
      scoped.scans.listByLesionIds([lesionId]),
    ]);
    const prepared = buildTimelineRows(rows);

    const points: TimelinePoint[] = prepared.map((row) => ({
      scanId: row.scan.id,
      capturedAt: row.scan.capturedAt.toISOString(),
      source: row.scan.source,
      label: row.classification.label,
      confidence: Number(row.classification.confidence),
      confidenceLabel: row.classification.confidenceLabel,
      metrics: row.classification.metrics,
      metricsScale: row.classification.metricsScale,
      partialData: row.partialData,
      primaryObjectKey: row.primary?.objectKey ?? null,
      primaryImageUrl: row.primary
        ? scanImageProxyPath(row.primary.objectKey)
        : null,
      elapsedDaysFromPrevious: row.elapsedDaysFromPrevious,
      elapsedDaysFromBaseline: row.elapsedDaysFromBaseline,
      deltas: row.deltas,
    }));

    const metricSeries = Object.fromEntries(
      chartedMetricKeys.map((key) => [
        key,
        points
          .filter(
            (point) => !point.partialData && typeof point.metrics[key] === "number",
          )
          .map((point) => ({
            scanId: point.scanId,
            capturedAt: point.capturedAt,
            value: point.metrics[key] as number,
            label: point.label,
          })),
      ]),
    ) as Record<
      ChartedMetricKey,
      Array<{
        scanId: string;
        capturedAt: string;
        value: number;
        label: ClassificationLabel;
      }>
    >;

    const diameterSeries = metricSeries.diameter_mm;
    const diameterDelta =
      diameterSeries.length >= 2
        ? diameterSeries[diameterSeries.length - 1]!.value -
          diameterSeries[diameterSeries.length - 2]!.value
        : 0;
    const trend: "BASELINE" | "WORSENING" | "STABLE" | "IMPROVING" =
      points.length < 2
        ? "BASELINE"
        : diameterDelta > 0.2 || isFlaggedLabel(points.at(-1)?.label)
          ? "WORSENING"
          : diameterDelta < -0.2
            ? "IMPROVING"
            : "STABLE";

    return {
      lesion,
      patient,
      points,
      metricSeries,
      trend,
      flagged: points.some((point) => isFlaggedLabel(point.label)),
    };
  },
};
