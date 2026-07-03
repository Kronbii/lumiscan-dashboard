import Link from "next/link";
import { Plus, ScanLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { classificationColor } from "@/lib/enums";
import { formatDate, formatPercent } from "@/lib/utils";
import { getOrgContext } from "@/server/auth/org-context";
import { dashboardService } from "@/server/services/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await getOrgContext();
  const overview = await dashboardService.overview(ctx);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Org-scoped clinical activity and recent flagged lesions.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/patients/new">
            <Plus className="h-4 w-4" /> Patient
          </Link>
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Patients</p>
            <p className="mt-2 text-3xl font-semibold">{overview.counts.patients}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Flagged lesions</p>
            <p className="mt-2 text-3xl font-semibold">
              {overview.counts.flaggedLesions}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted">Recent scan rows</p>
            <p className="mt-2 text-3xl font-semibold">
              {overview.counts.recentScans}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Recent flagged scans</h2>
        </CardHeader>
        <CardContent>
          {overview.recentScans.length === 0 ? (
            <div className="grid place-items-center gap-3 py-12 text-center">
              <ScanLine className="h-8 w-8 text-muted" />
              <p className="text-sm text-muted">
                No flagged scan activity in this organization.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {overview.recentScans.map((row) => (
                <Link
                  key={row.scan.id}
                  href={`/app/patients/${row.lesion.patientId}/lesions/${row.scan.lesionId}`}
                  className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-zinc-50"
                >
                  <div>
                    <p className="text-sm font-medium">{formatDate(row.scan.capturedAt)}</p>
                    <p className="text-xs text-muted">{row.scan.source}</p>
                  </div>
                  <Badge tone={classificationColor[row.classification.label]}>
                    {row.classification.label} {formatPercent(row.classification.confidence)}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
