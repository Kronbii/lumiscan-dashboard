import { ExternalLink, KeyRound, MonitorCog } from "lucide-react";
import Link from "next/link";
import { createDeviceAction, revokeDeviceAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClass } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgContext } from "@/server/auth/org-context";
import { deviceService } from "@/server/services/device";

export const dynamic = "force-dynamic";

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ newKey?: string }>;
}) {
  const params = await searchParams;
  const ctx = await getOrgContext();
  const devices = await deviceService.list(ctx);

  return (
    <div className="grid gap-7">
      <PageHeader
        title="Devices"
        description="Register dermatoscopes for live firmware ingestion over the documented REST contract."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/docs/device-ingestion-api.md">
              <ExternalLink /> API contract
            </Link>
          </Button>
        }
      />

      {params.newKey ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="grid gap-2">
            <div className="flex items-center gap-2 text-amber-800">
              <KeyRound className="size-4" />
              <p className="text-sm font-semibold">Device key — copy it now</p>
            </div>
            <code className="block break-all rounded-lg border border-amber-200 bg-white p-3 font-mono text-sm text-foreground">
              {params.newKey}
            </code>
            <p className="text-xs text-amber-700">
              This key is shown only once and cannot be recovered.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Register a device</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={createDeviceAction}
            className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <Field label="Name">
              <input className={inputClass} name="name" placeholder="Exam Room 1" required />
            </Field>
            <Field label="Serial">
              <input className={inputClass} name="serial" placeholder="LSK-…" required />
            </Field>
            <Button type="submit">Register</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registered devices</CardTitle>
          {devices.length > 0 ? (
            <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-muted">
              {devices.length}
            </span>
          ) : null}
        </CardHeader>
        {devices.length === 0 ? (
          <EmptyState
            icon={MonitorCog}
            title="No devices registered"
            description="Register a dermatoscope to enable automated scan ingestion."
          />
        ) : (
          <ul className="divide-y divide-border">
            {devices.map((device) => (
              <li
                key={device.id}
                className="flex items-center justify-between gap-3 px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-9 items-center justify-center rounded-lg bg-surface-3 text-muted">
                    <MonitorCog className="size-[1.15rem]" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{device.name}</p>
                    <p className="font-mono text-xs text-faint">{device.serial}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={device.status === "ACTIVE" ? "green" : "grey"} dot>
                    {device.status}
                  </Badge>
                  {device.status === "ACTIVE" ? (
                    <form action={revokeDeviceAction}>
                      <input type="hidden" name="id" value={device.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Revoke
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
