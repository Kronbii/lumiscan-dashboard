"use client";

import { useActionState } from "react";
import { generateEvolutionInsightAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";

/*
  AI insight generation can fail (rate limit, upstream error, unset key). This
  wraps the server action in useActionState so a failure shows an inline,
  retryable message instead of throwing a 500 that takes down the whole page.
*/
export function GenerateInsightButton({
  patientId,
  lesionId,
}: {
  patientId: string;
  lesionId: string;
}) {
  const [state, formAction, pending] = useActionState(
    () => generateEvolutionInsightAction(patientId, lesionId),
    null as { ok: boolean; error?: string } | null,
  );

  return (
    <form action={formAction} className="grid gap-2">
      <Button type="submit" variant="soft" className="w-full" disabled={pending}>
        {pending ? "Generating…" : "Generate insight"}
      </Button>
      {state && !state.ok && state.error ? (
        <p role="alert" className="text-xs text-malignant">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
