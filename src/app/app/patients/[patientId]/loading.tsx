import { Card, CardContent } from "@/components/ui/card";
import { Fascia, SectionLabel } from "@/components/ui/instrument";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function PatientDetailLoading() {
  return (
    <div className="grid gap-8" aria-label="Loading patient">
      <PageHeader
        eyebrow={<Skeleton className="h-3 w-64 max-w-full" />}
        title={
          <span className="flex items-center gap-3">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <Skeleton className="h-8 w-48" />
          </span>
        }
        actions={<Skeleton className="h-9 w-32" />}
      />

      <section className="grid gap-3">
        <SectionLabel index="01" title={<Skeleton className="h-3 w-32" />} />
        <Fascia className="grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid min-w-0 gap-3 bg-surface px-4 py-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </Fascia>
      </section>

      <section className="grid gap-3">
        <SectionLabel index="02" title={<Skeleton className="h-3 w-40" />} />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-full">
              <CardContent className="grid gap-3">
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-3 w-full" />
                <div className="flex items-center justify-between border-t border-border pt-2.5">
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
