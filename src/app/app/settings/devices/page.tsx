import { Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { createDeviceAction, revokeDeviceAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";
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
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Devices</h1>
        <p className="mt-1 text-sm text-muted">
          Manual entry works today; live firmware ingestion uses the documented
          REST contract.
        </p>
      </div>

      {params.newKey ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="grid gap-2">
            <div className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              <p className="font-semibold">Device key</p>
            </div>
            <code className="break-all rounded-md bg-white p-3 text-sm">
              {params.newKey}
            </code>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Register device</h2>
        </CardHeader>
        <CardContent>
          <form action={createDeviceAction} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="Name">
              <input className={inputClass} name="name" required />
            </Field>
            <Field label="Serial">
              <input className={inputClass} name="serial" required />
            </Field>
            <div className="flex items-end">
              <Button type="submit">Register</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <h2 className="font-semibold">Registered devices</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/docs/device-ingestion-api.md">
              <ExternalLink className="h-4 w-4" /> Contract
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3">
          {devices.length === 0 ? (
            <p className="text-sm text-muted">No devices registered.</p>
          ) : (
            devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div>
                  <p className="font-medium">{device.name}</p>
                  <p className="text-sm text-muted">{device.serial}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={device.status === "ACTIVE" ? "green" : "grey"}>
                    {device.status}
                  </Badge>
                  {device.status === "ACTIVE" ? (
                    <form action={revokeDeviceAction}>
                      <input type="hidden" name="id" value={device.id} />
                      <Button type="submit" variant="outline" size="sm">
                        Revoke
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
