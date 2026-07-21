import { PermissionCard } from "@/components/permission-card";
import { SidebarNav, type NavItem } from "@/components/sidebar-nav";
import { Avatar } from "@/components/ui/avatar";
import { Led, Overline, RulerStrip } from "@/components/ui/instrument";
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
    <span className="inline-flex size-8 items-center justify-center rounded-sm border border-sidebar-border bg-sidebar-raised text-ink-on-dark">
      <svg viewBox="0 0 24 24" className="size-4.5" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" />
        <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col bg-sidebar lg:flex">
        <div className="px-4 pb-3 pt-4">
          <div className="flex items-center gap-3">
            <Brandmark />
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-[-0.01em] text-ink-on-dark">
                Lumiscan
              </p>
              <p className="overline text-[0.625rem] text-ink-on-dark-dim">
                Dermatoscopic unit
              </p>
            </div>
          </div>
          <RulerStrip dark className="mt-3" />
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <Overline className="block px-4 pb-1.5 pt-2 text-ink-on-dark-dim/70">
            Workspace
          </Overline>
          <SidebarNav items={primaryNav} />
          <Overline className="block px-4 pb-1.5 pt-6 text-ink-on-dark-dim/70">
            System
          </Overline>
          <SidebarNav items={systemNav} />
        </div>

        <div className="border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-4 py-2.5">
            <Led tone="benign" />
            <span className="datum text-[0.625rem] uppercase tracking-[0.08em] text-ink-on-dark-dim">
              Scanner · Online
            </span>
          </div>
          <div className="flex items-center gap-3 border-t border-sidebar-border px-4 py-3">
            <Avatar name="Prototype Doctor" size="sm" className="bg-sidebar-raised text-ink-on-dark ring-sidebar-border" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[0.8125rem] font-medium text-ink-on-dark">
                Prototype Doctor
              </p>
              <p className="datum truncate text-[0.625rem] uppercase tracking-[0.06em] text-ink-on-dark-dim">
                {role}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-border bg-surface px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="datum truncate text-xs font-medium uppercase tracking-[0.08em] text-foreground">
              Prototype Clinic
            </span>
            <span className="h-3 w-px shrink-0 bg-border-strong" aria-hidden />
            <span className="datum truncate text-[0.6875rem] uppercase tracking-[0.08em] text-faint">
              {role}
            </span>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Led tone="accent" />
            <span className="datum text-[0.6875rem] uppercase tracking-[0.08em] text-faint">
              Local prototype
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-340 px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
