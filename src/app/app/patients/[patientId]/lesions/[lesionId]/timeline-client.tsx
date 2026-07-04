"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ImageOff,
  Minus,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { classificationColor } from "@/lib/enums";
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
};

const TEAL = "#0c8577";

function ScanImage({ src, className }: { src: string | null; className?: string }) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-surface-3 to-surface-2 text-faint",
          className,
        )}
      >
        <ImageOff className="size-5" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Lesion scan"
      onError={() => setErrored(true)}
      className={cn("object-cover", className)}
    />
  );
}

function Delta({ delta }: { delta: Point["deltas"][number] }) {
  const { direction } = delta;
  const Icon =
    direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const tone =
    direction === "up"
      ? "text-red-600"
      : direction === "down"
        ? "text-emerald-600"
        : "text-faint";
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
      <p className="text-[0.68rem] font-medium uppercase tracking-wide text-faint">
        {metricLabel(delta.metric as never)}
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="nums text-sm font-semibold text-foreground">
          {delta.value ?? "—"}
        </span>
        {delta.delta !== null && delta.delta !== 0 ? (
          <span
            className={cn("nums inline-flex items-center gap-0.5 text-xs font-medium", tone)}
          >
            <Icon className="size-3" />
            {Math.abs(delta.delta)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

const trendTone = {
  WORSENING: "red",
  IMPROVING: "green",
  STABLE: "grey",
  BASELINE: "grey",
} as const;

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
        <CardContent className="py-14 text-center text-sm text-muted">
          No scans have been recorded for this lesion yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-faint">
              Current status
            </p>
            {latest ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone={classificationColor[latest.label]} dot>
                  {latest.label} {formatPercent(latest.confidence)}
                </Badge>
                <Badge tone={trendTone[data.trend]} dot={data.trend === "WORSENING"}>
                  <TrendingUp className="size-3" />
                  {data.trend}
                </Badge>
                <span className="text-sm text-faint">{formatDate(latest.capturedAt)}</span>
              </div>
            ) : null}
          </div>
          <div className="inline-flex rounded-lg border border-border bg-surface-2 p-1">
            {(["timeline", "trends", "compare"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={cn(
                  "h-8 rounded-md px-3.5 text-sm font-medium capitalize transition-colors",
                  mode === item
                    ? "bg-surface text-foreground shadow-xs"
                    : "text-muted hover:text-foreground",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {mode === "timeline" ? (
        <div className="grid gap-3">
          {data.points.length === 1 ? (
            <Card>
              <CardContent className="text-sm text-muted">
                Baseline scan recorded. Add another scan to see evolution.
              </CardContent>
            </Card>
          ) : null}
          {[...data.points]
            .reverse()
            .map((point) => {
              const flagged = point.label === "SUSPICIOUS" || point.label === "MALIGNANT";
              const index = data.points.indexOf(point);
              return (
                <Card
                  key={point.scanId}
                  className={cn(flagged && "border-l-[3px] border-l-red-500")}
                >
                  <CardContent className="grid gap-4 md:grid-cols-[136px_1fr]">
                    <ScanImage
                      src={point.primaryImageUrl}
                      className="aspect-square w-full overflow-hidden rounded-lg ring-1 ring-inset ring-border"
                    />
                    <div className="grid gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={classificationColor[point.label]} dot>
                            {point.label} {formatPercent(point.confidence)}
                          </Badge>
                          <Badge tone="grey">{point.source}</Badge>
                          {point.partialData ? (
                            <Badge tone="amber">Partial data</Badge>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-faint">
                            {formatDate(point.capturedAt)}
                          </span>
                          <div className="inline-flex overflow-hidden rounded-md border border-border">
                            <button
                              type="button"
                              onClick={() => setCompareA(index)}
                              className={cn(
                                "h-6 w-7 text-xs font-medium transition-colors",
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
                              className={cn(
                                "h-6 w-7 border-l border-border text-xs font-medium transition-colors",
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
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                        {point.deltas.map((delta) => (
                          <Delta key={delta.metric} delta={delta} />
                        ))}
                      </div>
                      <p className="text-xs text-faint">
                        {point.elapsedDaysFromPrevious === null
                          ? "Baseline scan"
                          : `${point.elapsedDaysFromPrevious} days since previous scan · day ${point.elapsedDaysFromBaseline} of monitoring`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      ) : null}

      {mode === "trends" ? (
        <div className="grid gap-4">
          {[...chartedMetricKeys, "confidence"].map((metric) => {
            const rows =
              metric === "confidence"
                ? confidenceSeries
                : data.metricSeries[metric] ?? [];
            return (
              <Card key={metric}>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {metric === "confidence"
                      ? "Confidence"
                      : metricLabel(metric as never)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-56">
                  {rows.length < 2 ? (
                    <div className="grid h-full place-items-center text-sm text-faint">
                      Not enough comparable data.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                        <defs>
                          <linearGradient id="lineFade" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={TEAL} stopOpacity={0.15} />
                            <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          vertical={false}
                          stroke="#e2e8e6"
                          strokeDasharray="4 4"
                        />
                        <XAxis
                          dataKey="capturedAt"
                          tickFormatter={(value) => formatDate(String(value))}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#8a9893", fontSize: 11 }}
                          dy={6}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#8a9893", fontSize: 11 }}
                          width={40}
                        />
                        <Tooltip
                          labelFormatter={(value) => formatDate(String(value))}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #e2e8e6",
                            boxShadow: "0 8px 24px -8px rgba(13,27,26,.18)",
                            fontSize: 12,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={TEAL}
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: TEAL, strokeWidth: 0 }}
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
        <Card>
          <CardContent className="grid gap-5 lg:grid-cols-[1fr_200px_1fr]">
            {[a, b].map((point, i) => (
              <div key={point.scanId} className="grid gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex size-5 items-center justify-center rounded bg-surface-3 text-[0.7rem] font-semibold text-muted">
                    {i === 0 ? "A" : "B"}
                  </span>
                  <span className="text-sm text-faint">{formatDate(point.capturedAt)}</span>
                </div>
                <ScanImage
                  src={point.primaryImageUrl}
                  className="aspect-square w-full overflow-hidden rounded-lg ring-1 ring-inset ring-border"
                />
                <Badge tone={classificationColor[point.label]} dot>
                  {point.label} {formatPercent(point.confidence)}
                </Badge>
              </div>
            ))}
            <div className="order-last rounded-xl border border-border bg-surface-2 p-4 lg:order-none">
              <p className="nums text-2xl font-semibold text-foreground">
                {Math.abs(
                  Math.round(
                    (new Date(b.capturedAt).getTime() -
                      new Date(a.capturedAt).getTime()) /
                      86_400_000,
                  ),
                )}
              </p>
              <p className="text-xs text-faint">elapsed days</p>
              <div className="mt-4 grid gap-2.5 border-t border-border pt-4">
                {chartedMetricKeys.map((metric) => {
                  const delta =
                    typeof a.metrics[metric] === "number" &&
                    typeof b.metrics[metric] === "number"
                      ? Number((b.metrics[metric]! - a.metrics[metric]!).toFixed(2))
                      : null;
                  return (
                    <div
                      key={metric}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted">{metricLabel(metric)}</span>
                      <span
                        className={cn(
                          "nums font-medium",
                          delta === null
                            ? "text-faint"
                            : delta > 0
                              ? "text-red-600"
                              : delta < 0
                                ? "text-emerald-600"
                                : "text-faint",
                        )}
                      >
                        {delta === null ? "n/a" : `${delta > 0 ? "+" : ""}${delta}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
