"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BodyRegion } from "@/lib/enums";
import {
  BACK,
  FRONT,
  ShapeEl,
  VB_H,
  VB_W,
  naturalView,
  type View,
} from "@/components/body-map-field";
import { cn } from "@/lib/utils";

export type OverviewPin = {
  id: string;
  region: BodyRegion;
  x: number | string | null;
  y: number | string | null;
  risk: string | null;
  site: string;
  href: string;
};

const riskFill: Record<string, string> = {
  MALIGNANT: "fill-malignant",
  SUSPICIOUS: "fill-suspicious",
  BENIGN: "fill-benign",
  INCONCLUSIVE: "fill-inconclusive",
};

export function BodyMapOverview({ lesions }: { lesions: OverviewPin[] }) {
  const router = useRouter();
  const [view, setView] = useState<View>("FRONT");
  const zones = view === "FRONT" ? FRONT : BACK;

  const mapped = lesions
    .map((l) => ({ ...l, nx: l.x == null ? null : Number(l.x), ny: l.y == null ? null : Number(l.y) }))
    .filter((l) => l.nx != null && l.ny != null && Number.isFinite(l.nx) && Number.isFinite(l.ny));
  const onView = mapped.filter((l) => naturalView(l.region) === view);
  const unmapped = lesions.filter((l) => l.x == null || l.y == null);

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.8125rem] font-semibold text-foreground">Lesion map</span>
        <div className="inline-flex rounded-sm border border-border-strong">
          {(["FRONT", "BACK"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn(
                "datum h-7 border-l border-border-strong px-3 text-[0.6875rem] font-medium uppercase tracking-[0.08em] transition-colors first:border-l-0",
                view === v
                  ? "bg-foreground text-surface"
                  : "bg-surface text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="grid place-items-center rounded-sm border border-border bg-surface-3 p-4">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="h-auto w-full max-w-55"
          role="img"
          aria-label={`Lesion map — ${view.toLowerCase()}`}
        >
          {zones.map((zone) => (
            <ShapeEl
              key={`${zone.region}-${zone.side}`}
              shape={zone.shape}
              className="fill-surface stroke-border-strong"
            />
          ))}
          {onView.map((l) => (
            <g
              key={l.id}
              onClick={() => router.push(l.href)}
              style={{ cursor: "pointer" }}
            >
              <title>{`${l.site}${l.risk ? ` · ${l.risk}` : ""}`}</title>
              <circle
                cx={(l.nx as number) * VB_W}
                cy={(l.ny as number) * VB_H}
                r={7}
                className={cn(l.risk ? riskFill[l.risk] ?? "fill-primary" : "fill-primary")}
                opacity={0.2}
              />
              <circle
                cx={(l.nx as number) * VB_W}
                cy={(l.ny as number) * VB_H}
                r={3.4}
                className={cn(l.risk ? riskFill[l.risk] ?? "fill-primary" : "fill-primary")}
                stroke="white"
                strokeWidth={1.2}
              />
            </g>
          ))}
        </svg>
      </div>

      <p className="datum text-center text-[0.625rem] uppercase tracking-[0.08em] text-faint">
        {onView.length} on {view.toLowerCase()} · {mapped.length} mapped
        {unmapped.length ? ` · ${unmapped.length} unmapped` : ""}
      </p>
    </div>
  );
}
