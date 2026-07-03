import { Activity, MonitorCog, Settings, UsersRound } from "lucide-react";
import Link from "next/link";
import { PermissionCard } from "@/components/permission-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOrgContext } from "@/server/auth/org-context";

const nav = [
  { href: "/app", label: "Dashboard", icon: Activity },
  { href: "/app/patients", label: "Patients", icon: UsersRound },
  { href: "/app/settings/devices", label: "Devices", icon: MonitorCog },
  { href: "/app/settings/org", label: "Settings", icon: Settings },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let role = "NO ACCESS";
  try {
    role = (await getOrgContext()).role;
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <PermissionCard message="The prototype workspace could not be initialized. Confirm Postgres is running and migrations have been applied." />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-surface lg:block">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Link href="/app" className="text-lg font-semibold">
            Lumiscan
          </Link>
        </div>
        <nav className="grid gap-1 p-3">
          {nav.map((item) => (
            <Button key={item.href} asChild variant="ghost" className="justify-start">
              <Link href={item.href}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">Prototype Clinic</span>
            <Badge tone="teal">{role}</Badge>
          </div>
          <Badge>Local prototype</Badge>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
