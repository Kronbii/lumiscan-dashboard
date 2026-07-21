import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default function AppNotFound() {
  return (
    <div className="mx-auto grid max-w-2xl gap-7">
      <PageHeader eyebrow="404" title="Not found" />
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="inline-flex size-11 items-center justify-center rounded-sm bg-surface-3 text-faint">
            <FileQuestion className="size-5" strokeWidth={1.75} />
          </span>
          <div className="grid gap-1">
            <p className="text-sm font-semibold text-foreground">
              This record doesn&apos;t exist
            </p>
            <p className="text-[0.8125rem] text-muted">
              The patient, lesion, or scan you&apos;re looking for was removed or
              the link is out of date.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/app/patients">Back to patients</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
