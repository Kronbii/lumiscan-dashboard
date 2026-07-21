"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { StatusChip } from "@/components/ui/instrument";
import { cn, formatDate, formatPercent } from "@/lib/utils";

export type LightboxScan = {
  scanId: string;
  capturedAt: string;
  source: string;
  label: string;
  confidence: number;
  primaryImageUrl: string;
};

const MAX_SCALE = 6;

/*
  Full-viewport dermoscopy viewer: pan/zoom the full-res image and scrub the
  whole scan series as an evolution filmstrip. The charcoal overlay is the
  sanctioned place for a scrim in the Instrument Grade system.
*/
export function ScanLightbox({
  scans,
  index: initialIndex,
  site,
  onClose,
}: {
  scans: LightboxScan[];
  index: number;
  site: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const current = scans[index];

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const step = useCallback(
    (d: number) => setIndex((i) => (i + d + scans.length) % scans.length),
    [scans.length],
  );

  useEffect(() => {
    reset();
  }, [index, reset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "+" || e.key === "=") setScale((s) => Math.min(MAX_SCALE, s + 0.5));
      else if (e.key === "-") setScale((s) => Math.max(1, s - 0.5));
      else if (e.key === "0") reset();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [step, onClose, reset]);

  if (!current) return null;

  function onWheel(e: React.WheelEvent) {
    setScale((s) => Math.min(MAX_SCALE, Math.max(1, s - Math.sign(e.deltaY) * 0.35)));
  }
  function onDown(e: React.MouseEvent) {
    if (scale <= 1) return;
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onMove(e: React.MouseEvent) {
    if (!drag.current) return;
    setOffset({
      x: drag.current.ox + (e.clientX - drag.current.x),
      y: drag.current.oy + (e.clientY - drag.current.y),
    });
  }
  const endDrag = () => {
    drag.current = null;
  };

  const iconBtn =
    "inline-flex size-8 items-center justify-center rounded-sm text-ink-on-dark-dim transition-colors hover:bg-sidebar-raised hover:text-ink-on-dark disabled:opacity-40";

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-sidebar/95" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between gap-3 border-b border-sidebar-border px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="datum truncate text-[0.6875rem] uppercase tracking-[0.08em] text-ink-on-dark-dim">
            {site} · {formatDate(current.capturedAt)} · {current.source}
          </span>
          <StatusChip label={current.label} confidence={formatPercent(current.confidence)} />
          <span className="datum hidden text-[0.625rem] uppercase tracking-[0.08em] text-ink-on-dark-dim/60 sm:inline">
            {index + 1} / {scans.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className={iconBtn} onClick={() => setScale((s) => Math.max(1, s - 0.5))} aria-label="Zoom out">
            <ZoomOut className="size-4" strokeWidth={1.75} />
          </button>
          <span className="datum w-12 text-center text-[0.625rem] tabular-nums text-ink-on-dark-dim">
            {scale.toFixed(1)}×
          </span>
          <button type="button" className={iconBtn} onClick={() => setScale((s) => Math.min(MAX_SCALE, s + 0.5))} aria-label="Zoom in">
            <ZoomIn className="size-4" strokeWidth={1.75} />
          </button>
          <button type="button" className={iconBtn} onClick={reset} aria-label="Reset zoom">
            <Maximize2 className="size-4" strokeWidth={1.75} />
          </button>
          <button type="button" className={cn(iconBtn, "ml-1")} onClick={onClose} aria-label="Close viewer">
            <X className="size-4.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div
        className="relative flex-1 overflow-hidden"
        onWheel={onWheel}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onDoubleClick={() => {
          setScale((s) => (s > 1 ? 1 : 2.5));
          setOffset({ x: 0, y: 0 });
        }}
        style={{ cursor: scale > 1 ? "grab" : "zoom-in" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.primaryImageUrl}
          alt={`Lesion scan · ${formatDate(current.capturedAt)}`}
          draggable={false}
          className="absolute left-1/2 top-1/2 max-h-[92%] max-w-[92%] select-none object-contain"
          style={{
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
          }}
        />
        {scans.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous scan"
              className={cn(iconBtn, "absolute left-3 top-1/2 size-10 -translate-y-1/2 bg-sidebar/60")}
            >
              <ChevronLeft className="size-5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next scan"
              className={cn(iconBtn, "absolute right-3 top-1/2 size-10 -translate-y-1/2 bg-sidebar/60")}
            >
              <ChevronRight className="size-5" strokeWidth={1.75} />
            </button>
          </>
        ) : null}
      </div>

      {scans.length > 1 ? (
        <div className="flex items-center gap-2 overflow-x-auto border-t border-sidebar-border px-4 py-3">
          {scans.map((scan, i) => (
            <button
              key={scan.scanId}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Scan ${formatDate(scan.capturedAt)}`}
              aria-current={i === index}
              className={cn(
                "relative size-14 shrink-0 overflow-hidden rounded-sm ring-1 transition",
                i === index
                  ? "ring-2 ring-primary"
                  : "opacity-55 ring-sidebar-border hover:opacity-100",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={scan.primaryImageUrl} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
