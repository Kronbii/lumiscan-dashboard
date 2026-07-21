"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Led } from "@/components/ui/instrument";
import { cn } from "@/lib/utils";

type Tone = "success" | "info" | "critical";
type ToastInput = { tone?: Tone; title: string; detail?: string };
type Toast = ToastInput & { id: number };

const ledTone: Record<Tone, "benign" | "accent" | "malignant"> = {
  success: "benign",
  info: "accent",
  critical: "malignant",
};

const ToastContext = createContext<{ show: (t: ToastInput) => void }>({
  show: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((ts) => [...ts, { ...input, id }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || toasts.length === 0) return null;

  return createPortal(
    <div
      className="fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-in relative flex items-start gap-3 overflow-hidden rounded-sm border border-border bg-surface px-3.5 py-3 shadow-md"
        >
          <span className="mt-0.5 shrink-0">
            <Led tone={ledTone[t.tone ?? "success"]} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.8125rem] font-semibold leading-snug text-foreground">
              {t.title}
            </p>
            {t.detail ? (
              <p className="datum mt-0.5 truncate text-[0.6875rem] uppercase tracking-[0.06em] text-muted">
                {t.detail}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
            className="-mr-1 -mt-0.5 shrink-0 text-faint transition-colors hover:text-foreground"
          >
            <X className="size-3.5" strokeWidth={1.75} />
          </button>
          <span
            className={cn(
              "absolute inset-x-0 bottom-0 h-px origin-left bg-border-strong",
              "motion-safe:animate-[toast-countdown_4.2s_linear_forwards]",
            )}
            aria-hidden
          />
        </div>
      ))}
    </div>,
    document.body,
  );
}
