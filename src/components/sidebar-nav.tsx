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

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1">
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
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary-soft text-primary-soft-foreground"
                : "text-muted hover:bg-surface-3 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity",
                active ? "opacity-100" : "opacity-0",
              )}
              aria-hidden
            />
            <Icon
              className={cn(
                "size-[1.15rem] shrink-0 transition-colors",
                active ? "text-primary" : "text-faint group-hover:text-muted",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
