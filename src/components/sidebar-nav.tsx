"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, MonitorCog, Settings, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  dashboard: Activity,
  patients: UsersRound,
  devices: MonitorCog,
  settings: Settings,
} as const;

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof icons;
  exact?: boolean;
};

/* Instrument-rail nav: idle dim, active = white on raised charcoal with a
   2px cobalt scanline flush to the left edge. */
export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-px">
      {items.map((item) => {
        const Icon = icons[item.icon];
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-9 items-center gap-3 px-4 text-[0.8125rem] font-medium transition-colors",
              active
                ? "bg-sidebar-raised text-white"
                : "text-ink-on-dark-dim hover:text-ink-on-dark",
            )}
          >
            <span
              className={cn(
                "absolute inset-y-0 left-0 w-0.5 bg-primary transition-opacity",
                active ? "opacity-100" : "opacity-0",
              )}
              aria-hidden
            />
            <Icon
              className={cn(
                "size-4 shrink-0 transition-colors",
                active
                  ? "text-white"
                  : "text-ink-on-dark-dim group-hover:text-ink-on-dark",
              )}
              strokeWidth={1.75}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
