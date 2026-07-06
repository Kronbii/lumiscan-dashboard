import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Datum, Overline } from "@/components/ui/instrument";
import { PageHeader } from "@/components/ui/page-header";

const details = [
  { label: "Organization", value: "Prototype Clinic", mono: false },
  { label: "Slug", value: "prototype-clinic", mono: true },
  { label: "Plan", value: "Local prototype", mono: false },
  { label: "Data residency", value: "Local PostgreSQL", mono: false },
];

export default function OrgSettingsPage() {
  return (
    <div className="grid gap-8">
      <PageHeader
        title="Organization"
        description="Workspace configuration for this clinical environment."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>01 · Workspace</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-0 divide-y divide-border py-1">
            {details.map((d) => (
              <div
                key={d.label}
                className="flex items-center justify-between gap-4 py-3 first:pt-3 last:pb-3"
              >
                <Overline>{d.label}</Overline>
                {d.mono ? (
                  <Datum className="text-[0.8125rem] text-foreground">
                    {d.value}
                  </Datum>
                ) : (
                  <span className="text-sm font-medium text-foreground">
                    {d.value}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="h-fit border-primary-soft-border bg-primary-soft">
          <CardContent className="flex gap-3">
            <ShieldCheck
              className="mt-0.5 size-5 shrink-0 text-primary"
              strokeWidth={1.75}
            />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Prototype mode
              </p>
              <p className="mt-1 text-[0.8125rem] text-muted">
                Authentication is disabled. Every page runs inside one local
                OWNER workspace for demonstration.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
