import { PermissionCard } from "@/components/permission-card";
import { SidebarNav, type NavItem } from "@/components/sidebar-nav";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getOrgContext } from "@/server/auth/org-context";

const primaryNav: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: "dashboard", exact: true },
  { href: "/app/patients", label: "Patients", icon: "patients" },
];

const systemNav: NavItem[] = [
  { href: "/app/settings/devices", label: "Devices", icon: "devices" },
  { href: "/app/settings/org", label: "Settings", icon: "settings" },
];

function Brandmark() {
  return (
    <span className="inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-sm">
      <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" opacity="0.55" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" />
        <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

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
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center gap-3 px-5">
          <Brandmark />
          <div className="leading-tight">
            <p className="text-[0.95rem] font-semibold tracking-tight text-foreground">
              Lumiscan
            </p>
            <p className="text-[0.7rem] font-medium uppercase tracking-wider text-faint">
              Clinical
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[0.68rem] font-semibold uppercase tracking-wider text-faint">
            Workspace
          </p>
          <SidebarNav items={primaryNav} />
          <p className="px-3 pb-2 pt-6 text-[0.68rem] font-semibold uppercase tracking-wider text-faint">
            System
          </p>
          <SidebarNav items={systemNav} />
        </div>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar name="Prototype Doctor" size="sm" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-foreground">
                Prototype Doctor
              </p>
              <p className="truncate text-xs text-faint">prototype@clinic</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-surface/85 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-foreground">
              Prototype Clinic
            </span>
            <Badge tone="teal" dot>
              {role}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-xs font-medium text-faint sm:flex">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Local prototype
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
