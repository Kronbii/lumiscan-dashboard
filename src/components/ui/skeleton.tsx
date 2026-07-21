import { cn } from "@/lib/utils";

/* Loading placeholder — a machined bar in the panel-fill tone. Used by route
   `loading.tsx` boundaries so navigation paints an instant instrument shell
   while the server renders the real payload. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn("block animate-pulse rounded-sm bg-surface-3", className)}
      aria-hidden
    />
  );
}
