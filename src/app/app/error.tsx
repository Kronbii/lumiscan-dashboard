"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

// Catch-all boundary for the /app subtree so an unexpected server/render error
// shows a recoverable card instead of the raw Next error/digest screen.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto grid max-w-2xl gap-7">
      <PageHeader eyebrow="Error" title="Something went wrong" />
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="inline-flex size-11 items-center justify-center rounded-sm bg-suspicious-soft text-suspicious">
            <AlertTriangle className="size-5" strokeWidth={1.75} />
          </span>
          <div className="grid gap-1">
            <p className="text-sm font-semibold text-foreground">
              This screen failed to load
            </p>
            <p className="text-[0.8125rem] text-muted">
              An unexpected error occurred while rendering this page. You can
              retry, or head back to the patient register.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={reset}>
              Try again
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href="/app/patients">Back to patients</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
