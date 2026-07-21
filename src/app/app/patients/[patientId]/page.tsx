import Link from "next/link";
import { ChevronRight, Pencil, Plus, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { BodyMapOverview, type OverviewPin } from "@/components/body-map-overview";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  Datum,
  Fascia,
  Overline,
  SectionLabel,
  StatusChip,
  classificationTone,
} from "@/components/ui/instrument";
import { isFlaggedLabel } from "@/lib/enums";
import { cn, formatDate, formatLesionSite } from "@/lib/utils";
import { getOrgContext } from "@/server/auth/org-context";
import { repo } from "@/server/db/scoped-repo";
import { patientService } from "@/server/services/patient";
import { lesionService } from "@/server/services/lesion";
import { notFoundIfMissing } from "@/lib/rsc";

export const dynamic = "force-dynamic";

const riskSeverity: Record<string, number> = {
  MALIGNANT: 3,
  SUSPICIOUS: 2,
  INCONCLUSIVE: 1,
  BENIGN: 0,
};

function highestRisk(risks: Array<string | null>) {
  let top: string | null = null;
  for (const risk of risks) {
    if (!risk) continue;
    if (top === null || (riskSeverity[risk] ?? -1) > (riskSeverity[top] ?? -1)) top = risk;
  }
  return top;
}

function relativeDays(d: Date | null) {
  if (!d) return "—";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const ctx = await getOrgContext();
  const [patient, lesions, captureDates] = await Promise.all([
    patientService.getById(ctx, patientId),
    lesionService.listByPatientUnchecked(ctx, patientId),
    repo(ctx).scans.listCaptureDates(),
  ]).catch(notFoundIfMissing);
  const name = `${patient.firstName} ${patient.lastName}`;

  const lesionIds = new Set(lesions.map((l) => l.id));
  const lastByLesion = new Map<string, Date>();
  for (const c of captureDates) {
    if (!lesionIds.has(c.lesionId)) continue;
    const cur = lastByLesion.get(c.lesionId);
    if (!cur || c.capturedAt > cur) lastByLesion.set(c.lesionId, c.capturedAt);
  }
  const patientLastScan =
    [...lastByLesion.values()].sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  const flaggedCount = lesions.filter((l) => isFlaggedLabel(l.currentRisk)).length;
  const topRisk = highestRisk(lesions.map((l) => l.currentRisk));
  const mappedCount = lesions.filter((l) => l.bodyMapX != null && l.bodyMapY != null).length;

  const register = [...lesions].sort(
    (a, b) =>
      (b.currentRisk ? riskSeverity[b.currentRisk] ?? -1 : -1) -
        (a.currentRisk ? riskSeverity[a.currentRisk] ?? -1 : -1) ||
      b.createdAt.getTime() - a.createdAt.getTime(),
  );

  const pins: OverviewPin[] = lesions.map((l) => ({
    id: l.id,
    region: l.bodyRegion,
    x: l.bodyMapX,
    y: l.bodyMapY,
    risk: l.currentRisk,
    site: formatLesionSite(l.bodySide, l.bodyRegion),
    href: `/app/patients/${patientId}/lesions/${l.id}`,
  }));

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/app/patients" className="hover:text-muted">
              ← Patients
            </Link>
            <span aria-hidden>·</span>
            <span>MRN {patient.mrn}</span>
          </span>
        }
        title={
          <span className="flex items-center gap-3">
            <Avatar name={name} size="lg" />
            {name}
          </span>
        }
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href={`/app/patients/${patient.id}/edit`}>
                <Pencil strokeWidth={1.75} /> Edit
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/app/patients/${patient.id}/lesions/new`}>
                <Plus strokeWidth={1.75} /> New lesion
              </Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-3">
        <SectionLabel index="01" title="Overview" />
        <Fascia className="grid-cols-2 sm:grid-cols-4">
          <div className="bg-surface px-4 py-3">
            <Overline>Monitored lesions</Overline>
            <Datum className="mt-1 block text-lg font-medium text-foreground">
              {lesions.length}
            </Datum>
          </div>
          <div className="bg-surface px-4 py-3">
            <Overline>Flagged</Overline>
            <Datum
              className={cn(
                "mt-1 block text-lg font-medium",
                flaggedCount > 0 ? "text-suspicious" : "text-foreground",
              )}
            >
              {flaggedCount}
            </Datum>
          </div>
          <div className="bg-surface px-4 py-3">
            <Overline>Highest risk</Overline>
            <div className="mt-1.5">
              {topRisk ? (
                <StatusChip label={topRisk} tone={classificationTone(topRisk)} />
              ) : (
                <Datum className="text-sm text-faint">—</Datum>
              )}
            </div>
          </div>
          <div className="bg-surface px-4 py-3">
            <Overline>Last scan</Overline>
            <Datum className="mt-1 block text-[0.8125rem] text-foreground">
              {relativeDays(patientLastScan)}
            </Datum>
          </div>
        </Fascia>
      </section>

      <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <section className="grid h-fit gap-3 lg:sticky lg:top-16">
          <SectionLabel index="02" title="Lesion map" />
          {lesions.length > 0 ? (
            <Card>
              <CardContent>
                <BodyMapOverview lesions={pins} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-[0.8125rem] text-muted">
                No lesions to map yet.
              </CardContent>
            </Card>
          )}
        </section>

        <section className="grid h-fit gap-3">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel index="03" title="Monitored lesions" />
            <Datum className="text-xs text-faint">
              {String(lesions.length).padStart(2, "0")} tracked · {String(mappedCount).padStart(2, "0")} mapped
            </Datum>
          </div>

          {lesions.length === 0 ? (
            <Card>
              <EmptyState
                icon={ScanLine}
                title="No lesions recorded"
                description="Add a lesion to begin tracking scans and change over time."
                action={
                  <Button asChild size="sm">
                    <Link href={`/app/patients/${patient.id}/lesions/new`}>
                      <Plus strokeWidth={1.75} /> New lesion
                    </Link>
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {register.map((lesion) => {
                const flagged = isFlaggedLabel(lesion.currentRisk);
                const last = lastByLesion.get(lesion.id) ?? null;
                return (
                  <Link
                    key={lesion.id}
                    href={`/app/patients/${patient.id}/lesions/${lesion.id}`}
                    className="group"
                  >
                    <Card
                      interactive
                      className={cn(
                        "h-full",
                        flagged &&
                          (lesion.currentRisk === "MALIGNANT"
                            ? "border-l-2 border-l-malignant"
                            : "border-l-2 border-l-suspicious"),
                      )}
                    >
                      <CardContent className="flex h-full flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground">
                            {formatLesionSite(lesion.bodySide, lesion.bodyRegion)}
                          </p>
                          {lesion.currentRisk ? (
                            <StatusChip
                              label={lesion.currentRisk}
                              tone={classificationTone(lesion.currentRisk)}
                            />
                          ) : (
                            <StatusChip label="NO SCANS" tone="neutral" />
                          )}
                        </div>
                        <p className="line-clamp-2 flex-1 text-[0.8125rem] text-muted">
                          {lesion.bodyLocationNote}
                        </p>
                        <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
                          <Datum className="text-[0.6875rem] uppercase tracking-[0.06em] text-faint">
                            Last scan {relativeDays(last)}
                          </Datum>
                          <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                            Timeline
                            <ChevronRight className="size-3.5" strokeWidth={1.75} />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="grid gap-3">
        <SectionLabel index="04" title="Patient record" />
        <Fascia className="grid-cols-2 xl:grid-cols-4">
          {[
            { label: "MRN", value: patient.mrn },
            { label: "Date of birth", value: formatDate(patient.dateOfBirth) },
            { label: "Registered", value: formatDate(patient.createdAt) },
            { label: "Email", value: patient.email || "—" },
            { label: "Phone", value: patient.phone || "—" },
            { label: "Address", value: patient.address || "—" },
          ].map((d) => (
            <div key={d.label} className="min-w-0 bg-surface px-4 py-3">
              <Overline>{d.label}</Overline>
              <Datum className="mt-1 block truncate text-[0.8125rem] text-foreground">
                {d.value}
              </Datum>
            </div>
          ))}
          {patient.notes ? (
            <div className="col-span-full bg-surface px-4 py-3">
              <Overline>Notes</Overline>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">{patient.notes}</p>
            </div>
          ) : null}
        </Fascia>
      </section>
    </div>
  );
}
