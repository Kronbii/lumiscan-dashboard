"use client";

import { useMemo, useState } from "react";
import { ImageOff, ScanLine } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Datum,
  Delta,
  type DeltaRisk,
  Fascia,
  Led,
  Overline,
  ReticleFrame,
  SectionLabel,
  SpecimenBar,
  StatusChip,
  type StatusTone,
  classificationTone,
} from "@/components/ui/instrument";
import { EmptyState } from "@/components/ui/empty-state";
import type { classificationColor } from "@/lib/enums";
import { cn, formatDate, formatPercent } from "@/lib/utils";
import { chartedMetricKeys, metricLabel } from "@/lib/schemas/metrics";

type Point = {
  scanId: string;
  capturedAt: string;
  source: "MANUAL" | "DEVICE";
  label: keyof typeof classificationColor;
  confidence: number;
  confidenceLabel: keyof typeof classificationColor;
  metrics: Record<string, unknown>;
  metricsScale: string;
  partialData: boolean;
  primaryImageUrl: string | null;
  elapsedDaysFromPrevious: number | null;
  elapsedDaysFromBaseline: number;
  deltas: Array<{
    metric: string;
    value: number | null;
    previousValue: number | null;
    delta: number | null;
    direction: "up" | "down" | "flat" | "unknown";
  }>;
};

export type TimelineClientData = {
  points: Point[];
  trend: "BASELINE" | "WORSENING" | "STABLE" | "IMPROVING";
  metricSeries: Record<
    string,
    Array<{ scanId: string; capturedAt: string; value: number; label: Point["label"] }>
  >;
  lesion: { bodySide: string; bodyRegion: string };
};

/* Trend is not a classification — tones map to clinical risk, and the word
   is always spelled out beside the mark. */
const trendChipTone = {
  WORSENING: "malignant",
  IMPROVING: "benign",
  STABLE: "neutral",
  BASELINE: "neutral",
} as const satisfies Record<TimelineClientData["trend"], StatusTone>;

/* Delta color follows clinical risk: 'up' is worsening (red), 'down' is
   improving (green) — same medically intentional inversion as before. */
function riskFromDirection(direction: Point["deltas"][number]["direction"]): DeltaRisk {
  return direction === "up" ? "worse" : direction === "down" ? "better" : "stable";
}


/* Short units for datum slots; scores are unitless 0–10. */
const metricUnitShort: Record<string, string> = {
  diameter_mm: "mm",
  area_mm2: "mm²",
  confidence: "%",
};

/* Header overline units for the trend small multiples. */
const trendChartUnit: Record<string, string> = {
  diameter_mm: "mm",
  asymmetry_score: "score 0–10",
  border_irregularity_score: "score 0–10",
  color_variation_score: "score 0–10",
  area_mm2: "mm²",
  confidence: "%",
};

function ScanImage({ src, className }: { src: string | null; className?: string }) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-surface-3 text-faint",
          className,
        )}
      >
        <ImageOff className="size-5" strokeWidth={1.75} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Lesion scan"
      onError={() => setErrored(true)}
      className={cn("block object-cover", className)}
    />
  );
}

/* One metric cell inside the per-scan fascia grid. */
function MetricCell({ delta }: { delta: Point["deltas"][number] }) {
  const unit = metricUnitShort[delta.metric];
  return (
    <div className="bg-surface px-3 py-2">
      <Overline className="block truncate">
        {metricLabel(delta.metric as never)}
      </Overline>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <Datum className="text-sm font-medium text-foreground">
          {delta.value ?? "—"}
          {unit && delta.value !== null ? (
            <span className="text-[0.6875rem] font-normal text-faint"> {unit}</span>
          ) : null}
        </Datum>
        {delta.delta !== null && delta.delta !== 0 ? (
          <Delta
            value={delta.delta}
            risk={riskFromDirection(delta.direction)}
            precision={2}
          />
        ) : null}
      </div>
    </div>
  );
}

type ChartTooltipProps = {
  active?: boolean;
  label?: unknown;
  payload?: ReadonlyArray<{
    value?: number | string;
    payload?: { label?: string };
  }>;
  unit?: string;
};

/* Spec tooltip: white face, 1px strong border, mono date header, mono value. */
function ChartTooltip({ active, label, payload, unit }: ChartTooltipProps) {
  const row = payload?.[0];
  if (!active || !row) return null;
  return (
    <div className="rounded-sm border border-border-strong bg-surface px-3 py-2 shadow-md">
      <Datum className="block text-[0.6875rem] uppercase tracking-[0.08em] text-faint">
        {label ? formatDate(String(label)) : ""}
      </Datum>
      <div className="mt-1 flex items-baseline gap-1">
        <Datum className="text-sm font-medium text-foreground">{row.value}</Datum>
        {unit ? <span className="text-[0.6875rem] text-faint">{unit}</span> : null}
      </div>
      {row.payload?.label ? (
        <StatusChip label={row.payload.label} className="mt-1.5" />
      ) : null}
    </div>
  );
}

export function LesionTimelineClient({ data }: { data: TimelineClientData }) {
  const [mode, setMode] = useState<"timeline" | "trends" | "compare">("timeline");
  const [compareA, setCompareA] = useState(0);
  const [compareB, setCompareB] = useState(Math.max(0, data.points.length - 1));
  const latest = data.points.at(-1);
  const a = data.points[compareA];
  const b = data.points[compareB];

  const confidenceSeries = useMemo(
    () =>
      data.points.map((point) => ({
        scanId: point.scanId,
        capturedAt: point.capturedAt,
        value: Math.round(point.confidence * 100),
        label: point.label,
      })),
    [data.points],
  );

  if (data.points.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={ScanLine}
          title="No scans recorded"
          description="No scans have been recorded for this lesion yet."
        />
      </Card>
    );
  }

  const comparePanel = (point: Point, tag: "A" | "B") => (
    <div className="grid content-start gap-3 bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="datum inline-flex size-5 items-center justify-center rounded-sm bg-foreground text-[0.6875rem] font-medium text-surface">
          {tag}
        </span>
        <Datum className="text-xs text-faint">{formatDate(point.capturedAt)}</Datum>
      </div>
      <div className="overflow-hidden rounded-sm border border-border">
        <ReticleFrame>
          <ScanImage src={point.primaryImageUrl} className="aspect-square w-full" />
        </ReticleFrame>
        <SpecimenBar
          className="truncate"
          items={[tag, point.source, formatDate(point.capturedAt)]}
        />
      </div>
      <StatusChip
        label={point.label}
        confidence={formatPercent(point.confidence)}
        className="justify-self-start"
      />
    </div>
  );

  return (
    <div className="grid content-start gap-4">
      {/* Status strip: current status · trend · mode switcher, one fascia. */}
      <Fascia className="sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="bg-surface px-4 py-3">
          <Overline className="block">Current status</Overline>
          {latest ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusChip
                label={latest.label}
                confidence={formatPercent(latest.confidence)}
              />
              <Datum className="text-xs text-faint">
                {formatDate(latest.capturedAt)}
              </Datum>
            </div>
          ) : null}
        </div>
        <div className="bg-surface px-4 py-3">
          <Overline className="block">Trend</Overline>
          <div className="mt-2">
            <StatusChip label={data.trend} tone={trendChipTone[data.trend]} />
          </div>
        </div>
        <div className="flex items-center bg-surface px-4 py-3 sm:col-span-2 lg:col-span-1">
          <div className="inline-flex rounded-sm border border-border-strong">
            {(["timeline", "trends", "compare"] as const).map((item) => (
              <button
                key={item}
                type="button"
                data-mode={item}
                aria-pressed={mode === item}
                onClick={() => setMode(item)}
                className={cn(
                  "datum relative h-7 border-l border-border-strong px-3 text-[0.6875rem] font-medium uppercase tracking-[0.08em] transition-colors first:border-l-0 focus-visible:z-10",
                  mode === item
                    ? "bg-foreground text-surface"
                    : "bg-surface text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </Fascia>

      {mode === "timeline" ? (
        <div className="grid gap-4">
          {data.points.length === 1 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-1.5 py-8 text-center">
                <Overline>Baseline</Overline>
                <p className="text-[0.8125rem] text-muted">
                  Baseline scan recorded. Add another scan to see evolution.
                </p>
              </CardContent>
            </Card>
          ) : null}
          {/* Dotted spine: one square node per scan, newest first. */}
          <div className="ml-1 grid gap-5 border-l border-dashed border-border-strong pl-6">
            {[...data.points].reverse().map((point) => {
              const flagged =
                point.label === "SUSPICIOUS" || point.label === "MALIGNANT";
              const index = data.points.indexOf(point);
              return (
                <div key={point.scanId} className="relative">
                  <Led
                    tone={classificationTone(point.label)}
                    className="absolute -left-7 top-5"
                  />
                  <Card
                    className={cn(
                      flagged &&
                        (point.label === "MALIGNANT"
                          ? "border-l-2 border-l-malignant"
                          : "border-l-2 border-l-suspicious"),
                    )}
                  >
                    <CardContent className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
                      <div className="w-40 md:w-auto">
                        <div className="overflow-hidden rounded-sm border border-border">
                          <ReticleFrame>
                            <ScanImage
                              src={point.primaryImageUrl}
                              className="aspect-square w-full"
                            />
                          </ReticleFrame>
                          <SpecimenBar
                            className="truncate"
                            items={[point.source, formatDate(point.capturedAt)]}
                          />
                        </div>
                      </div>
                      <div className="grid content-start gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusChip
                              label={point.label}
                              confidence={formatPercent(point.confidence)}
                            />
                            <StatusChip tone="neutral" label={point.source} />
                            {point.partialData ? (
                              <StatusChip tone="suspicious" label="PARTIAL DATA" />
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <Datum className="text-xs text-faint">
                              {formatDate(point.capturedAt)}
                            </Datum>
                            <div className="inline-flex overflow-hidden rounded-sm border border-border-strong">
                              <button
                                type="button"
                                onClick={() => setCompareA(index)}
                                aria-pressed={compareA === index}
                                className={cn(
                                  "datum h-6 w-7 text-[0.6875rem] font-medium transition-colors",
                                  compareA === index
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-surface text-muted hover:bg-surface-2",
                                )}
                              >
                                A
                              </button>
                              <button
                                type="button"
                                onClick={() => setCompareB(index)}
                                aria-pressed={compareB === index}
                                className={cn(
                                  "datum h-6 w-7 border-l border-border-strong text-[0.6875rem] font-medium transition-colors",
                                  compareB === index
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-surface text-muted hover:bg-surface-2",
                                )}
                              >
                                B
                              </button>
                            </div>
                          </div>
                        </div>
                        <Fascia className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                          {point.deltas.map((delta) => (
                            <MetricCell key={delta.metric} delta={delta} />
                          ))}
                          <div aria-hidden className="bg-surface lg:hidden" />
                        </Fascia>
                        <p className="text-xs text-faint">
                          {point.elapsedDaysFromPrevious === null ? (
                            "Baseline scan"
                          ) : (
                            <>
                              <Datum>{point.elapsedDaysFromPrevious}</Datum> days since
                              previous scan · day{" "}
                              <Datum>{point.elapsedDaysFromBaseline}</Datum> of
                              monitoring
                            </>
                          )}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {mode === "trends" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[...chartedMetricKeys, "confidence"].map((metric, i) => {
            const rows =
              metric === "confidence"
                ? confidenceSeries
                : data.metricSeries[metric] ?? [];
            const title =
              metric === "confidence" ? "Confidence" : metricLabel(metric as never);
            return (
              <Card key={metric}>
                <CardHeader>
                  <SectionLabel index={String(i + 1).padStart(2, "0")} title={title} />
                  <Overline>{trendChartUnit[metric]}</Overline>
                </CardHeader>
                <CardContent className="h-56">
                  {rows.length < 2 ? (
                    <div className="grid h-full place-items-center text-[0.8125rem] text-faint">
                      Not enough comparable data.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={rows}
                        margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
                      >
                        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                        <XAxis
                          dataKey="capturedAt"
                          tickFormatter={(value) =>
                            new Intl.DateTimeFormat("en", {
                              month: "short",
                              year: "numeric",
                            }).format(new Date(String(value)))
                          }
                          tickLine={false}
                          axisLine={{ stroke: "var(--chart-axis)" }}
                          tick={{
                            fill: "#7A8089",
                            fontSize: 11,
                            fontFamily: "var(--font-mono)",
                          }}
                          dy={6}
                          padding={{ left: 24, right: 24 }}
                          minTickGap={16}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{
                            fill: "#7A8089",
                            fontSize: 11,
                            fontFamily: "var(--font-mono)",
                          }}
                          width={40}
                        />
                        <Tooltip
                          cursor={{ stroke: "var(--chart-axis)" }}
                          content={<ChartTooltip unit={metricUnitShort[metric]} />}
                        />
                        {/* Every dot is a real scan event; no draw-in animation —
                            measured data appears instantly. */}
                        <Line
                          type="linear"
                          dataKey="value"
                          stroke="#17191C"
                          strokeWidth={2}
                          isAnimationActive={false}
                          dot={{
                            r: 3,
                            fill: "#17191C",
                            stroke: "#FFFFFF",
                            strokeWidth: 1,
                          }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {mode === "compare" && a && b ? (
        <Fascia className="lg:grid-cols-[minmax(0,1fr)_260px_minmax(0,1fr)]">
          {comparePanel(a, "A")}
          <div className="order-last bg-surface p-4 lg:order-0">
            <Overline className="block">Elapsed</Overline>
            <div className="mt-1 flex items-baseline gap-1.5">
              <Datum className="text-2xl font-medium text-foreground">
                {Math.abs(
                  Math.round(
                    (new Date(b.capturedAt).getTime() -
                      new Date(a.capturedAt).getTime()) /
                      86_400_000,
                  ),
                )}
              </Datum>
              <span className="text-xs text-faint">days</span>
            </div>
            <div className="mt-4 grid gap-3 border-t border-border pt-4">
              {chartedMetricKeys.map((metric) => {
                const aVal =
                  typeof a.metrics[metric] === "number"
                    ? (a.metrics[metric] as number)
                    : null;
                const bVal =
                  typeof b.metrics[metric] === "number"
                    ? (b.metrics[metric] as number)
                    : null;
                const delta =
                  aVal !== null && bVal !== null
                    ? Number((bVal - aVal).toFixed(2))
                    : null;
                return (
                  <div key={metric} className="grid gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <Overline>{metricLabel(metric)}</Overline>
                      {delta === null ? (
                        <Datum className="text-xs text-faint">N/A</Datum>
                      ) : (
                        <Delta
                          value={delta}
                          risk={
                            delta > 0 ? "worse" : delta < 0 ? "better" : "stable"
                          }
                          precision={2}
                        />
                      )}
                    </div>
                    <Datum className="text-xs text-muted">
                      {aVal ?? "—"} → {bVal ?? "—"}
                    </Datum>
                  </div>
                );
              })}
            </div>
          </div>
          {comparePanel(b, "B")}
        </Fascia>
      ) : null}
    </div>
  );
}
