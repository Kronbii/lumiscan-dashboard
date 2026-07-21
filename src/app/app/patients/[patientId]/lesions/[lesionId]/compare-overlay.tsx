"use client";

import { useEffect, useRef, useState } from "react";
import { ReticleFrame } from "@/components/ui/instrument";
import { cn, formatDate } from "@/lib/utils";

type Frame = { url: string | null; date: string };
type Mode = "swipe" | "fade" | "blink";

/*
  The hero longitudinal interaction: blend two scans of the same lesion so the
  change is visible, not just tabulated. Swipe (draggable divider), fade
  (cross-fade), or blink (alternate). Nothing is persisted — pure client view.
*/
export function CompareOverlay({ a, b }: { a: Frame; b: Frame }) {
  const [mode, setMode] = useState<Mode>("swipe");
  const [swipe, setSwipe] = useState(50);
  const [fade, setFade] = useState(50);
  const [blinkB, setBlinkB] = useState(false);
  const dragging = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== "blink") return;
    const id = setInterval(() => setBlinkB((v) => !v), 650);
    return () => clearInterval(id);
  }, [mode]);

  if (!a.url || !b.url) {
    return (
      <div className="rounded-sm border border-border bg-surface p-6 text-center text-[0.8125rem] text-muted">
        Both scans need an image to overlay.
      </div>
    );
  }

  function moveSwipe(clientX: number) {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSwipe(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }

  const bOpacity = mode === "fade" ? fade / 100 : mode === "blink" ? (blinkB ? 1 : 0) : 1;
  const bClip = mode === "swipe" ? `inset(0 ${100 - swipe}% 0 0)` : undefined;

  return (
    <div className="grid gap-3">
      <ReticleFrame>
        <div
          ref={stageRef}
          className="relative aspect-square w-full touch-none select-none overflow-hidden bg-surface-3"
          onPointerMove={(e) => {
            if (dragging.current) moveSwipe(e.clientX);
          }}
          onPointerUp={() => (dragging.current = false)}
          onPointerLeave={() => (dragging.current = false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={a.url}
            alt={`Baseline ${a.date}`}
            draggable={false}
            className="absolute inset-0 size-full object-cover"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={b.url}
            alt={`Latest ${b.date}`}
            draggable={false}
            className="absolute inset-0 size-full object-cover"
            style={{
              opacity: bOpacity,
              clipPath: bClip,
              transition: mode === "fade" ? "opacity 0.08s linear" : undefined,
            }}
          />

          {mode === "swipe" ? (
            <div
              className="absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-primary"
              style={{ left: `${swipe}%` }}
            >
              <button
                type="button"
                aria-label="Drag to compare"
                onPointerDown={(e) => {
                  e.preventDefault();
                  dragging.current = true;
                }}
                className="absolute left-1/2 top-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-white/40 bg-primary text-primary-foreground shadow-md"
              >
                <span className="datum text-[0.625rem] leading-none">↔</span>
              </button>
            </div>
          ) : null}

          <span className="datum absolute bottom-1.5 left-1.5 z-10 rounded-sm bg-sidebar/70 px-1.5 py-0.5 text-[0.5625rem] uppercase tracking-[0.08em] text-ink-on-dark">
            A · {formatDate(a.date)}
          </span>
          <span className="datum absolute bottom-1.5 right-1.5 z-10 rounded-sm bg-sidebar/70 px-1.5 py-0.5 text-[0.5625rem] uppercase tracking-[0.08em] text-ink-on-dark">
            B · {formatDate(b.date)}
          </span>
        </div>
      </ReticleFrame>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-sm border border-border-strong">
          {(["swipe", "fade", "blink"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "datum h-7 border-l border-border-strong px-3 text-[0.6875rem] font-medium uppercase tracking-[0.08em] transition-colors first:border-l-0",
                mode === m
                  ? "bg-foreground text-surface"
                  : "bg-surface text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              {m}
            </button>
          ))}
        </div>
        {mode === "swipe" ? (
          <input
            type="range"
            min={0}
            max={100}
            value={swipe}
            onChange={(e) => setSwipe(Number(e.target.value))}
            aria-label="Swipe position"
            className="h-1 flex-1 accent-primary sm:max-w-48"
          />
        ) : null}
        {mode === "fade" ? (
          <div className="flex flex-1 items-center gap-2 sm:max-w-48">
            <input
              type="range"
              min={0}
              max={100}
              value={fade}
              onChange={(e) => setFade(Number(e.target.value))}
              aria-label="Cross-fade"
              className="h-1 flex-1 accent-primary"
            />
            <span className="datum w-14 shrink-0 text-right text-[0.625rem] tabular-nums text-faint">
              A⇄B {fade}%
            </span>
          </div>
        ) : null}
        {mode === "blink" ? (
          <span className="datum text-[0.625rem] uppercase tracking-[0.08em] text-faint">
            Alternating {blinkB ? "B" : "A"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
