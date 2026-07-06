import { cn } from "@/lib/utils";

/*
  The avatar is the system's lone circular element — a human mark against
  the machined geometry. Neutral ink tints only; identity color would
  compete with the classification indicator colors.
*/
const palette = [
  "bg-surface-3 text-muted",
  "bg-inconclusive-soft text-inconclusive-ink",
  "bg-primary-soft text-primary-soft-foreground",
  "bg-sidebar-raised text-ink-on-dark",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts.at(-1)![0]!).toUpperCase();
}

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const sizes = {
  sm: "size-8 text-[0.6875rem]",
  md: "size-10 text-xs",
  lg: "size-12 text-sm",
};

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const color = palette[hash(name) % palette.length];
  return (
    <span
      className={cn(
        "datum inline-flex shrink-0 items-center justify-center rounded-full font-medium uppercase tracking-[0.06em] ring-1 ring-inset ring-black/10",
        sizes[size],
        color,
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
