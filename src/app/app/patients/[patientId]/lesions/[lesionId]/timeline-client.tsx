"use client";

import { useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { classificationColor } from "@/lib/enums";
import { formatDate, formatPercent } from "@/lib/utils";
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

function Delta({ delta }: { delta: Point["deltas"][number] }) {
  const tone =
    delta.direction === "up"
      ? "text-red-700"
      : delta.direction === "down"
        ? "text-green-700"
        : "text-muted";
  return (
    <div className="rounded-md border border-border bg-white p-2">
      <p className="text-xs text-muted">{delta.metric.replaceAll("_", " ")}</p>
      <p className="text-sm font-semibold">
        {delta.value ?? "n/a"}{" "}
        {delta.delta !== null ? (
          <span className={tone}>
            {delta.delta > 0 ? "+" : ""}
            {delta.delta}
          </span>
        ) : null}
      </p>
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
        <CardContent className="py-12 text-center text-sm text-muted">
          No scans have been recorded for this lesion.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Current status</p>
            {latest ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge tone={classificationColor[latest.label]}>
                  {latest.label} {formatPercent(latest.confidence)}
                </Badge>
                <span className="text-sm text-muted">{formatDate(latest.capturedAt)}</span>
                <Badge tone={data.trend === "WORSENING" ? "red" : "grey"}>
                  {data.trend}
                </Badge>
              </div>
            ) : null}
          </div>
          <div className="inline-flex rounded-md border border-border bg-white p-1">
            {(["timeline", "trends", "compare"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`h-8 rounded px-3 text-sm capitalize ${
                  mode === item ? "bg-teal-700 text-white" : "text-muted"
                }`}
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
          {data.points.map((point, index) => (
            <Card
              key={point.scanId}
              className={
                point.label === "SUSPICIOUS" || point.label === "MALIGNANT"
                  ? "border-l-4 border-l-red-600"
                  : ""
              }
            >
              <CardContent className="grid gap-4 md:grid-cols-[160px_1fr]">
                <div className="aspect-[4/3] overflow-hidden rounded-md bg-zinc-100">
                  {point.primaryImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={point.primaryImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={classificationColor[point.label]}>
                        {point.label} {formatPercent(point.confidence)}
                      </Badge>
                      <Badge>{point.source}</Badge>
                      {point.partialData ? <Badge tone="amber">PARTIAL DATA</Badge> : null}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <span>{formatDate(point.capturedAt)}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCompareA(index)}
                      >
                        A
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCompareB(index)}
                      >
                        B
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    {point.deltas.map((delta) => (
                      <Delta key={delta.metric} delta={delta} />
                    ))}
                  </div>
                  <p className="text-xs text-muted">
                    {point.elapsedDaysFromPrevious === null
                      ? "Baseline"
                      : `${point.elapsedDaysFromPrevious} days since previous scan`}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
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
                  <h2 className="text-sm font-semibold">
                    {metric === "confidence"
                      ? "Confidence"
                      : metricLabel(metric as never)}
                  </h2>
                </CardHeader>
                <CardContent className="h-64">
                  {rows.length < 2 ? (
                    <div className="grid h-full place-items-center text-sm text-muted">
                      Not enough comparable data.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={rows}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="capturedAt"
                          tickFormatter={(value) => formatDate(String(value))}
                        />
                        <YAxis />
                        <Tooltip
                          labelFormatter={(value) => formatDate(String(value))}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#0f766e"
                          strokeWidth={2}
                          dot
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
          <CardContent className="grid gap-4 lg:grid-cols-[1fr_220px_1fr]">
            {[a, b].map((point) => (
              <div key={point.scanId} className="grid gap-3">
                <div className="aspect-[4/3] overflow-hidden rounded-md bg-zinc-100">
                  {point.primaryImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={point.primaryImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <Badge tone={classificationColor[point.label]}>
                  {point.label} {formatPercent(point.confidence)}
                </Badge>
                <p className="text-sm text-muted">{formatDate(point.capturedAt)}</p>
              </div>
            ))}
            <div className="order-last rounded-md border border-border bg-zinc-50 p-3 lg:order-none">
              <p className="text-sm font-semibold">
                {Math.abs(
                  Math.round(
                    (new Date(b.capturedAt).getTime() -
                      new Date(a.capturedAt).getTime()) /
                      86_400_000,
                  ),
                )}{" "}
                elapsed days
              </p>
              <div className="mt-3 grid gap-2">
                {chartedMetricKeys.map((metric) => {
                  const delta =
                    typeof a.metrics[metric] === "number" &&
                    typeof b.metrics[metric] === "number"
                      ? Number((b.metrics[metric]! - a.metrics[metric]!).toFixed(2))
                      : null;
                  return (
                    <div key={metric} className="text-sm">
                      <span className="text-muted">{metricLabel(metric)}: </span>
                      <span
                        className={
                          delta === null
                            ? "text-muted"
                            : delta > 0
                              ? "text-red-700"
                              : delta < 0
                                ? "text-green-700"
                                : "text-muted"
                        }
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
