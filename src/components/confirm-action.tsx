"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" size="sm" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

/*
  Two-step destructive action: the trigger arms an inline confirm rather than a
  native dialog, so it stays inside the Instrument Grade surface. `action` is a
  bound server action (redirects on success).
*/
export function ConfirmAction({
  action,
  label,
  message = "This removes the record from your register.",
  confirmLabel = "Delete",
  pendingLabel = "Deleting…",
}: {
  action: () => void | Promise<void>;
  label: string;
  message?: string;
  confirmLabel?: string;
  pendingLabel?: string;
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button type="button" variant="danger" size="sm" onClick={() => setArmed(true)}>
        {label}
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <span className="datum text-xs text-muted">{message}</span>
      <SubmitButton label={confirmLabel} pendingLabel={pendingLabel} />
      <Button type="button" variant="ghost" size="sm" onClick={() => setArmed(false)}>
        Cancel
      </Button>
    </form>
  );
}
