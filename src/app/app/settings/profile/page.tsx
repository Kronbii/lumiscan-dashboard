import { ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

const details = [
  { label: "Display name", value: "Prototype Doctor" },
  { label: "Email", value: "prototype@example.invalid" },
  { label: "Role", value: "Owner" },
];

export default function ProfileSettingsPage() {
  return (
    <div className="grid gap-7">
      <PageHeader
        title="Profile"
        description="Your local prototype identity for this workspace."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="h-fit">
          <CardContent className="grid gap-5">
            <div className="flex items-center gap-4">
              <Avatar name="Prototype Doctor" size="lg" />
              <div>
                <p className="text-base font-semibold text-foreground">
                  Prototype Doctor
                </p>
                <Badge tone="teal" dot>
                  OWNER
                </Badge>
              </div>
            </div>
            <div className="grid gap-0 divide-y divide-border border-t border-border pt-1">
              {details.map((d) => (
                <div
                  key={d.label}
                  className="flex items-center justify-between py-3"
                >
                  <span className="text-sm text-muted">{d.label}</span>
                  <span className="text-sm font-medium text-foreground">
                    {d.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit border-primary/20 bg-primary-soft/40">
          <CardContent className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                No external auth
              </p>
              <p className="mt-1 text-sm text-muted">
                This prototype has no auth provider configured. All access runs
                through one local identity.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
