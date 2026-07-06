import { ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Datum, Overline, StatusChip } from "@/components/ui/instrument";
import { PageHeader } from "@/components/ui/page-header";

const details = [
  { label: "Display name", value: "Prototype Doctor", mono: false },
  { label: "Email", value: "prototype@example.invalid", mono: true },
];

export default function ProfileSettingsPage() {
  return (
    <div className="grid gap-8">
      <PageHeader
        title="Profile"
        description="Your local prototype identity for this workspace."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="h-fit overflow-hidden">
          <CardHeader>
            <CardTitle>01 · IDENTITY</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-4">
              <Avatar name="Prototype Doctor" size="lg" />
              <div className="grid gap-1.5">
                <p className="text-base font-semibold text-foreground">
                  Prototype Doctor
                </p>
                <StatusChip label="OWNER" tone="accent" className="w-fit" />
              </div>
            </div>
            <div className="rounded-sm border border-border">
              {details.map((d, i) => (
                <div
                  key={d.label}
                  className={
                    "grid grid-cols-[140px_1fr] items-center gap-3 px-3 py-2.5" +
                    (i > 0 ? " border-t border-border" : "")
                  }
                >
                  <Overline>{d.label}</Overline>
                  {d.mono ? (
                    <Datum className="text-[0.8125rem] text-foreground">
                      {d.value}
                    </Datum>
                  ) : (
                    <span className="text-[0.8125rem] font-medium text-foreground">
                      {d.value}
                    </span>
                  )}
                </div>
              ))}
              <div className="grid grid-cols-[140px_1fr] items-center gap-3 border-t border-border px-3 py-2.5">
                <Overline>Role</Overline>
                <StatusChip label="OWNER" tone="accent" className="w-fit" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit border-primary-soft-border bg-primary-soft">
          <CardContent className="flex gap-3">
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0 text-primary"
              strokeWidth={1.75}
            />
            <div>
              <p className="text-[0.8125rem] font-semibold text-foreground">
                No external auth
              </p>
              <p className="mt-1 text-[0.8125rem] text-muted">
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
