import { PersonaSwitcher, type Persona } from "@/components/persona-switcher";
import { SidebarNav, type NavItem } from "@/components/sidebar-nav";
import { Led, Overline, RulerStrip } from "@/components/ui/instrument";

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

/* The instrument rail interior, shared verbatim by the fixed desktop sidebar
   and the off-canvas tablet/mobile drawer so the two never drift. */
export function SidebarContent({
  personas,
  currentMembershipId,
}: {
  personas: Persona[];
  currentMembershipId: string;
}) {
  return (
    <>
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
        <div className="border-t border-sidebar-border">
          <PersonaSwitcher personas={personas} currentMembershipId={currentMembershipId} />
        </div>
      </div>
    </>
  );
}
