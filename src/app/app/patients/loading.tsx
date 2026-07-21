import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function PatientsLoading() {
  return (
    <div className="grid gap-7" aria-label="Loading patients">
      <PageHeader
        eyebrow={<Skeleton className="h-3 w-36" />}
        title={<Skeleton className="h-8 w-40" />}
        description={<Skeleton className="h-4 w-full max-w-md" />}
        actions={<Skeleton className="h-9 w-32" />}
      />

      <Card className="overflow-hidden">
        <div className="h-10 border-b border-border-strong" />
        {Array.from({ length: 8 }).map((_, row) => (
          <div
            key={row}
            className="flex h-10 items-center gap-3 border-b border-border px-4 last:border-0"
          >
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        ))}
      </Card>
    </div>
  );
}
