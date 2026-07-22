"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/app/settings/org", label: "Organization" },
  { href: "/app/settings/members", label: "Members" },
  { href: "/app/settings/devices", label: "Devices" },
  { href: "/app/settings/profile", label: "Profile" },
];

/* Horizontal tab strip; active tab gets the cobalt underline scanline that the
   sidebar nav uses, so the two navigation surfaces rhyme. */
export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative -mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[0.8125rem] font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
