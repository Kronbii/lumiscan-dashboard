import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function LesionDetailLoading() {
  return (
    <div className="grid gap-8" aria-label="Loading lesion">
      <PageHeader
        eyebrow={<Skeleton className="h-3 w-56 max-w-full" />}
        title={<Skeleton className="h-8 w-52 max-w-full" />}
        description={<Skeleton className="h-4 w-full max-w-md" />}
        actions={
          <span className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
          </span>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent className="grid gap-4">
            <Skeleton className="h-48 w-full" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="grid gap-2 border-t border-border pt-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </CardContent>
        </Card>

        <aside className="grid h-fit gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent className="grid gap-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </aside>
      </div>
    </div>
  );
}
