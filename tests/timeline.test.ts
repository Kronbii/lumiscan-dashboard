import { describe, expect, it } from "vitest";
import { buildTimelineRows } from "@/server/services/lesion";

describe("buildTimelineRows", () => {
  it("computes elapsed days, deltas, and partial data", () => {
    const rows = [
      {
        scan: {
          id: "scan-a",
          capturedAt: new Date("2026-01-01T00:00:00Z"),
          source: "MANUAL",
        },
        classification: {
          metrics: { diameter_mm: 4 },
          metricsScale: "CLINICIAN_MEASURED",
        },
        images: [],
      },
      {
        scan: {
          id: "scan-b",
          capturedAt: new Date("2026-01-11T00:00:00Z"),
          source: "MANUAL",
        },
        classification: {
          metrics: { diameter_mm: 6.5 },
          metricsScale: "UNCALIBRATED",
        },
        images: [],
      },
    ] as never;

    const result = buildTimelineRows(rows);
    expect(result[1]?.elapsedDaysFromPrevious).toBe(10);
    expect(result[1]?.deltas[0]?.delta).toBe(2.5);
    expect(result[1]?.partialData).toBe(true);
  });
});
