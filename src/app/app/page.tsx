import Link from "next/link";
import {
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
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
        <Fascia className="sm:grid-cols-2 lg:grid-cols-4">
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
            label="Review overdue"
            value={overview.counts.reviewOverdue}
            hint="Past their follow-up date"
            icon={CalendarClock}
            tone={overview.counts.reviewOverdue > 0 ? "amber" : "slate"}
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

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>02 · Review due</CardTitle>
          </CardHeader>
          {overview.reviewDue.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Nothing due"
              description="Lesions past or nearing their follow-up date will surface here."
            />
          ) : (
            <ul>
              {overview.reviewDue.map((row) => {
                const overdue = row.state === "OVERDUE";
                return (
                  <li key={row.lesion.id} className="border-b border-border last:border-b-0">
                    <Link
                      href={`/app/patients/${row.lesion.patientId}/lesions/${row.lesion.id}/management`}
                      className={`flex h-10 items-center gap-3 px-4 transition-colors hover:bg-surface-2 ${
                        overdue ? "border-l-2 border-l-malignant" : "border-l-2 border-l-suspicious"
                      }`}
                    >
                      <Led tone={overdue ? "malignant" : "suspicious"} />
                      <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-foreground">
                        {formatLesionSite(row.lesion.bodySide, row.lesion.bodyRegion)}
                      </span>
                      <Datum
                        className={`text-[0.6875rem] uppercase tracking-[0.06em] ${
                          overdue ? "text-malignant" : "text-suspicious"
                        }`}
                      >
                        {overdue ? "Overdue" : "Due soon"} · {formatDate(row.nextReviewAt)}
                      </Datum>
                      <ChevronRight className="size-4 shrink-0 text-faint" strokeWidth={1.75} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>03 · Awaiting action</CardTitle>
          </CardHeader>
          {overview.awaitingAction.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Nothing awaiting"
              description="Lesions recommended for biopsy or referral will surface here."
            />
          ) : (
            <ul>
              {overview.awaitingAction.map((row) => (
                <li key={row.lesion.id} className="border-b border-border last:border-b-0">
                  <Link
                    href={`/app/patients/${row.lesion.patientId}/lesions/${row.lesion.id}/management`}
                    className="flex h-10 items-center gap-3 border-l-2 border-l-suspicious px-4 transition-colors hover:bg-surface-2"
                  >
                    <Led tone="accent" />
                    <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-foreground">
                      {formatLesionSite(row.lesion.bodySide, row.lesion.bodyRegion)}
                    </span>
                    <StatusChip label={row.status.replaceAll("_", " ")} tone="suspicious" />
                    <ChevronRight className="size-4 shrink-0 text-faint" strokeWidth={1.75} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>04 · Recent flagged scans</CardTitle>
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
                  href={`/app/patients/${row.lesion.patientId}/lesions/${row.scan.lesionId}/scans/${row.scan.id}`}
                  className={`flex min-h-10 flex-wrap items-center gap-3 px-4 py-2 transition-colors duration-100 hover:bg-surface-2 sm:h-10 sm:flex-nowrap sm:py-0 ${
                    flaggedRule[row.classification.label] ?? ""
                  }`}
                >
                  <Led tone={classificationTone(row.classification.label)} />
                  <span className="min-w-0 flex-1 basis-[calc(100%-1.25rem)] sm:basis-auto">
                    <span className="text-[0.8125rem] font-medium text-foreground">
                      {formatLesionSite(row.lesion.bodySide, row.lesion.bodyRegion)}
                    </span>
                    <Datum className="block text-xs text-faint sm:ml-3 sm:inline">
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
