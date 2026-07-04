import { Building2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

const details = [
  { label: "Organization", value: "Prototype Clinic" },
  { label: "Slug", value: "prototype-clinic" },
  { label: "Plan", value: "Local prototype" },
  { label: "Data residency", value: "Local PostgreSQL" },
];

export default function OrgSettingsPage() {
  return (
    <div className="grid gap-7">
      <PageHeader
        title="Organization"
        description="Workspace configuration for this clinical environment."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Building2 className="size-4" />
              </span>
              Workspace
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-0 divide-y divide-border">
            {details.map((d) => (
              <div
                key={d.label}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <span className="text-sm text-muted">{d.label}</span>
                <span className="text-sm font-medium text-foreground">{d.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="h-fit border-primary/20 bg-primary-soft/40">
          <CardContent className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Prototype mode</p>
              <p className="mt-1 text-sm text-muted">
                Authentication is disabled. Every page runs inside one local OWNER
                workspace for demonstration.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
