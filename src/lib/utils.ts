import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "n/a";
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return "n/a";
  return `${Math.round(numeric * 100)}%`;
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function humanize(value: string | null | undefined) {
  if (!value) return "";
  const lower = value.replaceAll("_", " ").toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function formatLesionSite(side: string, region: string) {
  const regionText = humanize(region);
  const regionEncodesSide =
    region.startsWith("LEFT_") || region.startsWith("RIGHT_");
  if (regionEncodesSide || side === "UNSPECIFIED") return regionText;
  if (side === "MIDLINE") return `Midline ${regionText.toLowerCase()}`;
  return `${humanize(side)} ${regionText.toLowerCase()}`;
}
