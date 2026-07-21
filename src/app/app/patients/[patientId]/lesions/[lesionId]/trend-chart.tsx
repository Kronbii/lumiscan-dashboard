"use client";

/*
  Lives in its own chunk so recharts (+ its d3 / redux tree, ~9MB unpacked) is
  fetched and parsed ONLY when the user opens the "trends" tab. The default
  timeline view never loads it. Imported via next/dynamic({ ssr: false }) from
  timeline-client — ResponsiveContainer measures the DOM and renders nothing
  useful server-side anyway.
*/

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Datum, StatusChip } from "@/components/ui/instrument";
import { formatDate } from "@/lib/utils";

type ChartRow = {
  scanId: string;
  capturedAt: string;
  value: number;
  label?: string;
};

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

export function TrendChart({ rows, unit }: { rows: ChartRow[]; unit?: string }) {
  if (rows.length < 2) {
    return (
      <div className="grid h-full place-items-center text-[0.8125rem] text-faint">
        Not enough comparable data.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
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
          content={<ChartTooltip unit={unit} />}
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
  );
}
