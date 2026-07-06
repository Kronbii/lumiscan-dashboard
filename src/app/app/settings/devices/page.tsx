import { ExternalLink, KeyRound, MonitorCog } from "lucide-react";
import Link from "next/link";
import { createDeviceAction, revokeDeviceAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClass } from "@/components/ui/field";
import { Datum, Overline, StatusChip } from "@/components/ui/instrument";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils";
import { getOrgContext } from "@/server/auth/org-context";
import { deviceService } from "@/server/services/device";
import { CopyKeyButton } from "./copy-key-button";

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
    <div className="grid gap-8">
      <PageHeader
        title="Devices"
        description="Register dermatoscopes for live firmware ingestion over the documented REST contract."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/docs/device-ingestion-api.md">
              <ExternalLink strokeWidth={1.75} /> API contract
            </Link>
          </Button>
        }
      />

      {params.newKey ? (
        <Card className="border-suspicious-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-suspicious" strokeWidth={1.75} />
              <CardTitle>Device key — copy it now</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap items-start gap-2">
              <code className="datum min-w-0 flex-1 break-all rounded-sm border border-border bg-surface-3 p-3 text-[0.8125rem] text-foreground">
                {params.newKey}
              </code>
              <CopyKeyButton value={params.newKey} />
            </div>
            <p className="text-xs text-muted">
              This key is shown only once and cannot be recovered.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>01 · Register a device</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <form
            action={createDeviceAction}
            className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <Field label="Name">
              <input
                className={inputClass}
                name="name"
                placeholder="Exam Room 1"
                required
              />
            </Field>
            <Field label="Serial">
              <input
                className={inputClass}
                name="serial"
                placeholder="LSK-…"
                required
              />
            </Field>
            <Button type="submit">Register</Button>
          </form>
          <p className="text-xs text-faint">
            Device ingestion is optional — manual scan entry works today.
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>02 · Device register</CardTitle>
          {devices.length > 0 ? (
            <Datum className="rounded-sm bg-surface-3 px-1.5 py-0.5 text-xs text-muted">
              {devices.length}
            </Datum>
          ) : null}
        </CardHeader>
        {devices.length === 0 ? (
          <EmptyState
            icon={MonitorCog}
            title="No devices registered"
            description="Register a dermatoscope to enable automated scan ingestion."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[0.8125rem]">
              <thead>
                <tr className="border-b border-border-strong">
                  <th className="h-10 px-4 text-left font-medium">
                    <Overline>Name</Overline>
                  </th>
                  <th className="h-10 px-4 text-left font-medium">
                    <Overline>Serial</Overline>
                  </th>
                  <th className="h-10 px-4 text-left font-medium">
                    <Overline>Status</Overline>
                  </th>
                  <th className="h-10 px-4 text-left font-medium">
                    <Overline>Registered</Overline>
                  </th>
                  <th className="h-10 px-4">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr
                    key={device.id}
                    className="h-10 border-b border-border transition-colors last:border-0 hover:bg-surface-2"
                  >
                    <td className="px-4 font-medium text-foreground">
                      {device.name}
                    </td>
                    <td className="px-4">
                      <Datum className="text-muted">{device.serial}</Datum>
                    </td>
                    <td className="px-4">
                      <StatusChip
                        label={device.status}
                        tone={
                          device.status === "ACTIVE" ? "benign" : "inconclusive"
                        }
                      />
                    </td>
                    <td className="px-4">
                      <Datum className="text-muted">
                        {formatDate(device.createdAt)}
                      </Datum>
                    </td>
                    <td className="px-4 py-1.5 text-right">
                      {device.status === "ACTIVE" ? (
                        <form action={revokeDeviceAction}>
                          <input type="hidden" name="id" value={device.id} />
                          <Button type="submit" variant="danger" size="sm">
                            Revoke
                          </Button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
