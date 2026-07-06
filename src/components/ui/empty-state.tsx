import type { LucideIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

/* Centered reticle mark drawn in 1px strokes — no blobs, no emoji. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="relative inline-flex size-12 items-center justify-center text-faint">
        <span className="absolute left-0 top-0 size-2 border-l border-t border-border-strong" aria-hidden />
        <span className="absolute right-0 top-0 size-2 border-r border-t border-border-strong" aria-hidden />
        <span className="absolute bottom-0 left-0 size-2 border-b border-l border-border-strong" aria-hidden />
        <span className="absolute bottom-0 right-0 size-2 border-b border-r border-border-strong" aria-hidden />
        <Icon className="size-5" strokeWidth={1.5} />
      </span>
      <div className="max-w-sm">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mt-1 text-[0.8125rem] text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
