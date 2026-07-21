import { MobileNav } from "@/components/mobile-nav";
import { PermissionCard } from "@/components/permission-card";
import { ToastProvider } from "@/components/toast";
import { type Persona } from "@/components/persona-switcher";
import { SidebarContent } from "@/components/sidebar-content";
import { Led } from "@/components/ui/instrument";
import type { UserRole } from "@/lib/enums";
import { getOrgContext } from "@/server/auth/org-context";
import { listOrgMembers } from "@/server/db/system-repo";

const roleRank: Record<UserRole, number> = { OWNER: 0, ADMIN: 1, DOCTOR: 2, NURSE: 3 };

// The whole /app subtree depends on the DB-backed org identity resolved in this
// layout, so nothing here may be statically prerendered — otherwise a build-time
// DB blip bakes the "workspace could not be initialized" card into static HTML.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let displayName = "";
  let role = "NO ACCESS";
  let membershipId = "";
  let personas: Persona[] = [];
  try {
    const ctx = await getOrgContext();
    displayName = ctx.displayName;
    role = ctx.role;
    membershipId = ctx.membershipId;
    personas = (await listOrgMembers(ctx.orgId))
      .map((m) => ({
        membershipId: m.membership.id,
        name: m.user.displayName,
        role: m.membership.role,
      }))
      .sort(
        (a, b) =>
          (roleRank[a.role] ?? 9) - (roleRank[b.role] ?? 9) ||
          a.name.localeCompare(b.name),
      );
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <PermissionCard message="The prototype workspace could not be initialized. Confirm Postgres is running and migrations have been applied." />
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-sidebar lg:flex">
        <SidebarContent personas={personas} currentMembershipId={membershipId} />
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-border bg-surface px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <MobileNav>
              <SidebarContent personas={personas} currentMembershipId={membershipId} />
            </MobileNav>
            <span className="datum truncate text-xs font-medium uppercase tracking-[0.08em] text-foreground">
              Prototype Clinic
            </span>
            <span className="h-3 w-px shrink-0 bg-border-strong" aria-hidden />
            <span className="datum hidden min-w-0 items-center gap-1.5 truncate text-[0.6875rem] uppercase tracking-[0.08em] text-faint sm:flex">
              <span className="text-faint/70">Acting as</span>
              <span className="truncate text-muted">{displayName}</span>
              <span className="text-faint/70">· {role}</span>
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
    </ToastProvider>
  );
}
