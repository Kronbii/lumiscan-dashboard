import Link from "next/link";
import {
  ChevronRight,
  Plus,
  ScanLine,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { classificationColor } from "@/lib/enums";
import { formatDate, formatLesionSite, formatPercent, humanize } from "@/lib/utils";
import { getOrgContext } from "@/server/auth/org-context";
import { dashboardService } from "@/server/services/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await getOrgContext();
  const overview = await dashboardService.overview(ctx);

  return (
    <div className="grid gap-7">
      <PageHeader
        title="Dashboard"
        description="Organization-scoped clinical activity, surfacing lesions that need attention."
        actions={
          <Button asChild>
            <Link href="/app/patients/new">
              <Plus /> New patient
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Patients"
          value={overview.counts.patients}
          hint="Active in this organization"
          icon={UsersRound}
          tone="teal"
        />
        <StatCard
          label="Flagged lesions"
          value={overview.counts.flaggedLesions}
          hint="Suspicious or malignant risk"
          icon={ShieldAlert}
          tone={overview.counts.flaggedLesions > 0 ? "amber" : "slate"}
        />
        <StatCard
          label="Recent flagged scans"
          value={overview.counts.recentScans}
          hint="Across monitored lesions"
          icon={ScanLine}
          tone="teal"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent flagged scans</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/app/patients">
              View patients <ChevronRight />
            </Link>
          </Button>
        </CardHeader>
        {overview.recentScans.length === 0 ? (
          <EmptyState
            icon={ScanLine}
            title="No flagged scan activity"
            description="Suspicious and malignant scans from across your organization will appear here."
          />
        ) : (
          <ul className="divide-y divide-border">
            {overview.recentScans.map((row) => (
              <li key={row.scan.id}>
                <Link
                  href={`/app/patients/${row.lesion.patientId}/lesions/${row.scan.lesionId}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2"
                >
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${
                      row.classification.label === "MALIGNANT"
                        ? "bg-red-500"
                        : "bg-amber-500"
                    }`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {formatLesionSite(row.lesion.bodySide, row.lesion.bodyRegion)}
                    </p>
                    <p className="mt-0.5 text-xs text-faint">
                      {formatDate(row.scan.capturedAt)} · {humanize(row.scan.source)}
                    </p>
                  </div>
                  <Badge tone={classificationColor[row.classification.label]} dot>
                    {row.classification.label} {formatPercent(row.classification.confidence)}
                  </Badge>
                  <ChevronRight className="size-4 shrink-0 text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
