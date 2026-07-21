"use client";

import { useActionState } from "react";
import type { GenerateInsightState } from "@/app/app/actions";
import { Button } from "@/components/ui/button";

/*
  AI insight generation can fail (rate limit, upstream error, unset key). This
  wraps the server action in useActionState so a failure shows an inline,
  retryable message instead of throwing a 500. `action` is any bound insight
  action (evolution narrative, clinical summary, patient handout).
*/
export function GenerateInsightButton({
  action,
  label = "Generate insight",
  pendingLabel = "Generating…",
}: {
  action: () => Promise<GenerateInsightState>;
  label?: string;
  pendingLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(
    () => action(),
    null as GenerateInsightState | null,
  );

  return (
    <form action={formAction} className="grid gap-2">
      <Button type="submit" variant="soft" className="w-full" disabled={pending}>
        {pending ? pendingLabel : label}
      </Button>
      {state && !state.ok && state.error ? (
        <p role="alert" className="text-xs text-malignant">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
