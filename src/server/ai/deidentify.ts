import "server-only";

import { createHash } from "node:crypto";
import { differenceInCalendarDays } from "date-fns";
import type { InsightKind } from "@/lib/enums";
import type { TimelinePoint } from "@/server/services/lesion";
import { lesionService } from "@/server/services/lesion";
import type { OrgContext } from "@/server/auth/org-context";
import { repo } from "@/server/db/scoped-repo";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
    .join(",")}}`;
}

export function inputHash(payload: unknown) {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function ageBand(dateOfBirth: string) {
  const date = new Date(dateOfBirth);
  if (Number.isNaN(date.getTime())) return "UNKNOWN";
  const years = Math.max(
    0,
    Math.floor(differenceInCalendarDays(new Date(), date) / 365.25),
  );
  const lower = Math.floor(years / 10) * 10;
  return `${lower}-${lower + 9}`;
}

function scanForPayload(point: TimelinePoint) {
  return {
    elapsedDaysFromBaseline: point.elapsedDaysFromBaseline,
    elapsedDaysFromPrevious: point.elapsedDaysFromPrevious,
    label: point.label,
    confidence: point.confidence,
    confidenceLabel: point.confidenceLabel,
    metrics: point.metrics,
    metricsScale: point.metricsScale,
    partialData: point.partialData,
  };
}

export async function buildDeidentifiedPayload(
  ctx: OrgContext,
  input: {
    subjectType: "SCAN" | "LESION";
    subjectId: string;
    kind: InsightKind;
  },
) {
  if (input.subjectType === "SCAN") {
    const scan = await repo(ctx).scans.getById(input.subjectId);
    const lesion = await repo(ctx).lesions.getById(scan.scan.lesionId);
    const patient = await repo(ctx).patients.getById(lesion.patientId);
    return {
      subjectType: "SCAN" as const,
      subjectId: scan.scan.id,
      patientId: patient.id,
      kind: input.kind,
      payload: {
        patient: { ageBand: ageBand(patient.dateOfBirth) },
        lesion: {
          bodyRegion: lesion.bodyRegion,
          bodySide: lesion.bodySide,
        },
        scan: {
          elapsedDaysFromBaseline: 0,
          label: scan.classification.label,
          confidence: Number(scan.classification.confidence),
          confidenceLabel: scan.classification.confidenceLabel,
          metrics: scan.classification.metrics,
          metricsScale: scan.classification.metricsScale,
        },
      },
    };
  }

  const timeline = await lesionService.timeline(ctx, input.subjectId);
  return {
    subjectType: "LESION" as const,
    subjectId: timeline.lesion.id,
    patientId: timeline.patient.id,
    kind: input.kind,
    payload: {
      patient: { ageBand: ageBand(timeline.patient.dateOfBirth) },
      lesion: {
        bodyRegion: timeline.lesion.bodyRegion,
        bodySide: timeline.lesion.bodySide,
        currentRisk: timeline.lesion.currentRisk,
      },
      scans: timeline.points.map(scanForPayload),
      trend: timeline.trend,
    },
  };
}
