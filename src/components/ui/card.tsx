import type * as React from "react";
import { Tick } from "@/components/ui/instrument";
import { cn } from "@/lib/utils";

/* Flat machined panel: white face, 1px hairline, 4px radius, no shadow. */
export function Card({
  className,
  interactive,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded border border-border bg-surface",
        interactive && "transition-colors duration-100 hover:border-border-strong",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex min-h-11 items-center justify-between gap-3 border-b border-border px-4 py-2.5",
        className,
      )}
      {...props}
    />
  );
}

/* Card titles speak in the instrument's label voice: tick + mono overline. */
export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("flex items-center gap-2 text-foreground", className)}
      {...props}
    >
      <Tick />
      <span className="overline text-muted">{children}</span>
    </h2>
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[0.8125rem] text-muted", className)} {...props} />;
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-border px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}
