import Link from "next/link";
import {
  ChevronRight,
  Plus,
  ScanLine,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Datum,
  Fascia,
  Led,
  SectionLabel,
  StatusChip,
  classificationTone,
} from "@/components/ui/instrument";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate, formatLesionSite, formatPercent, humanize } from "@/lib/utils";
import { getOrgContext } from "@/server/auth/org-context";
import { dashboardService } from "@/server/services/dashboard";

export const dynamic = "force-dynamic";

const flaggedRule: Record<string, string> = {
  MALIGNANT: "border-l-2 border-l-malignant",
  SUSPICIOUS: "border-l-2 border-l-suspicious",
};

export default async function DashboardPage() {
  const ctx = await getOrgContext();
  const overview = await dashboardService.overview(ctx);

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Organization-scoped clinical activity, surfacing lesions that need attention."
        actions={
          <Button asChild>
            <Link href="/app/patients/new">
              <Plus strokeWidth={1.75} /> New patient
            </Link>
          </Button>
        }
      />

      <section className="grid gap-3">
        <SectionLabel index="01" title="Census" />
        <Fascia className="sm:grid-cols-3">
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
        </Fascia>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>02 · Recent flagged scans</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/app/patients">
              View patients <ChevronRight strokeWidth={1.75} />
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
          <ul>
            {overview.recentScans.map((row) => (
              <li
                key={row.scan.id}
                className="border-b border-border last:border-b-0"
              >
                <Link
                  href={`/app/patients/${row.lesion.patientId}/lesions/${row.scan.lesionId}`}
                  className={`flex h-10 items-center gap-3 px-4 transition-colors duration-100 hover:bg-surface-2 ${
                    flaggedRule[row.classification.label] ?? ""
                  }`}
                >
                  <Led tone={classificationTone(row.classification.label)} />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-[0.8125rem] font-medium text-foreground">
                      {formatLesionSite(row.lesion.bodySide, row.lesion.bodyRegion)}
                    </span>
                    <Datum className="ml-3 text-xs text-faint">
                      {formatDate(row.scan.capturedAt)} · {humanize(row.scan.source)}
                    </Datum>
                  </span>
                  <StatusChip
                    label={row.classification.label}
                    confidence={formatPercent(row.classification.confidence)}
                  />
                  <ChevronRight
                    className="size-4 shrink-0 text-faint"
                    strokeWidth={1.75}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
