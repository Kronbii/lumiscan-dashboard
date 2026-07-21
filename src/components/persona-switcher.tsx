"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { setActingPersonaAction } from "@/app/app/actions";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type Persona = { membershipId: string; name: string; role: string };

export function PersonaSwitcher({
  personas,
  currentMembershipId,
}: {
  personas: Persona[];
  currentMembershipId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const current =
    personas.find((p) => p.membershipId === currentMembershipId) ?? personas[0];

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(membershipId: string) {
    if (membershipId === currentMembershipId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      await setActingPersonaAction(membershipId);
      setOpen(false);
    });
  }

  return (
    <div ref={ref} className="relative">
      {open ? (
        <div
          role="listbox"
          aria-label="Switch persona"
          className="absolute bottom-[calc(100%+6px)] left-2 right-2 z-30 rounded-sm border border-sidebar-border bg-sidebar-raised p-1 shadow-md"
        >
          <p className="overline block px-2 pb-1 pt-1.5 text-[0.5625rem] text-ink-on-dark-dim/70">
            Acting as · simulated
          </p>
          {personas.map((persona) => {
            const active = persona.membershipId === currentMembershipId;
            return (
              <button
                key={persona.membershipId}
                type="button"
                role="option"
                aria-selected={active}
                disabled={pending}
                onClick={() => choose(persona.membershipId)}
                className={cn(
                  "relative flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left transition-colors hover:bg-sidebar disabled:opacity-50",
                  active && "bg-sidebar",
                )}
              >
                {active ? (
                  <span className="absolute inset-y-1 left-0 w-0.5 bg-primary" aria-hidden />
                ) : null}
                <Avatar
                  name={persona.name}
                  size="sm"
                  className="bg-sidebar text-ink-on-dark ring-sidebar-border"
                />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[0.8125rem] font-medium text-ink-on-dark">
                    {persona.name}
                  </span>
                  <span className="datum block text-[0.5625rem] uppercase tracking-[0.08em] text-ink-on-dark-dim">
                    {persona.role}
                  </span>
                </span>
                {active ? (
                  <Check className="size-3.5 shrink-0 text-primary" strokeWidth={2} />
                ) : null}
              </button>
            );
          })}
          <p className="datum block border-t border-sidebar-border px-2 pb-1 pt-1.5 text-[0.5625rem] uppercase tracking-[0.08em] text-ink-on-dark-dim/60">
            No auth · simulated
          </p>
        </div>
      ) : null}

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sidebar-raised"
      >
        <Avatar
          name={current?.name ?? "?"}
          size="sm"
          className="bg-sidebar-raised text-ink-on-dark ring-sidebar-border"
        />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[0.8125rem] font-medium text-ink-on-dark">
            {current?.name}
          </span>
          <span className="datum block truncate text-[0.625rem] uppercase tracking-[0.06em] text-ink-on-dark-dim">
            {current?.role}
          </span>
        </span>
        <ChevronsUpDown
          className="size-4 shrink-0 text-ink-on-dark-dim"
          strokeWidth={1.75}
          aria-hidden
        />
      </button>
    </div>
  );
}
