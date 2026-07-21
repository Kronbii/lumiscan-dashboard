import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionLabel } from "@/components/ui/instrument";

function Bar({ className = "" }: { className?: string }) {
  return (
    <span
      className={`block animate-pulse rounded-sm bg-surface-3 ${className}`}
      aria-hidden
    />
  );
}

export default function AppLoading() {
  return (
    <div className="grid gap-8" aria-label="Loading page">
      <PageHeader
        eyebrow={<Bar className="h-3 w-28" />}
        title={<Bar className="h-8 w-48 max-w-full" />}
        description={<Bar className="h-4 w-full max-w-xl" />}
        actions={<Bar className="h-9 w-32" />}
      />

      <section className="grid gap-3">
        <SectionLabel index="01" title={<Bar className="h-3 w-24" />} />
        <div className="grid gap-px overflow-hidden rounded border border-border bg-border sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="grid min-h-28 gap-4 bg-surface p-4">
              <Bar className="h-3 w-24" />
              <Bar className="h-8 w-16" />
              <Bar className="h-3 w-36 max-w-full" />
            </div>
          ))}
        </div>
      </section>

      <Card className="overflow-hidden">
        <CardHeader>
          <Bar className="h-4 w-40" />
          <Bar className="h-8 w-28" />
        </CardHeader>
        <CardContent className="grid gap-3">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="grid gap-2 border-b border-border pb-3 last:border-b-0 last:pb-0"
            >
              <Bar className="h-4 w-2/3" />
              <Bar className="h-3 w-1/3" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
