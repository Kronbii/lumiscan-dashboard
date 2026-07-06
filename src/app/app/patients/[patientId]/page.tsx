import Link from "next/link";
import { ChevronRight, Plus, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
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
import { patientService } from "@/server/services/patient";
import { lesionService } from "@/server/services/lesion";

export const dynamic = "force-dynamic";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const ctx = await getOrgContext();
  const patient = await patientService.getById(ctx, patientId);
  const lesions = await lesionService.listByPatient(ctx, patientId);
  const name = `${patient.firstName} ${patient.lastName}`;

  const details = [
    { label: "MRN", value: patient.mrn, mono: true },
    { label: "Date of birth", value: formatDate(patient.dateOfBirth), mono: true },
    { label: "Registered", value: formatDate(patient.createdAt), mono: true },
    patient.email ? { label: "Email", value: patient.email, mono: false } : null,
    patient.phone ? { label: "Phone", value: patient.phone, mono: true } : null,
    patient.address ? { label: "Address", value: patient.address, mono: false } : null,
  ].filter(Boolean) as { label: string; value: string; mono: boolean }[];

  // Column count must match the cell count exactly — a ragged seam grid
  // exposes empty border-colored cells.
  const fasciaCols =
    { 3: "xl:grid-cols-3", 4: "xl:grid-cols-4", 5: "xl:grid-cols-5", 6: "xl:grid-cols-6" }[
      details.length
    ] ?? "xl:grid-cols-3";
  const lastCellSpan =
    details.length % 2 === 1 ? "col-span-2 xl:col-span-1" : "";

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/app/patients" className="hover:text-muted">
              ← Patients
            </Link>
            <span aria-hidden>·</span>
            <span>
              MRN {patient.mrn} · Registered {formatDate(patient.createdAt)}
            </span>
          </span>
        }
        title={
          <span className="flex items-center gap-3">
            <Avatar name={name} size="lg" />
            {name}
          </span>
        }
        actions={
          <Button asChild>
            <Link href={`/app/patients/${patient.id}/lesions/new`}>
              <Plus strokeWidth={1.75} /> New lesion
            </Link>
          </Button>
        }
      />

      <section className="grid gap-3">
        <SectionLabel index="01" title="PATIENT RECORD" />
        <Fascia className={cn("grid-cols-2", fasciaCols)}>
          {details.map((d, i) => (
            <div
              key={d.label}
              className={cn(
                "min-w-0 bg-surface px-4 py-3",
                i === details.length - 1 && lastCellSpan,
              )}
            >
              <Overline>{d.label}</Overline>
              {d.mono ? (
                <Datum className="mt-1 block truncate text-[0.8125rem] text-foreground">
                  {d.value}
                </Datum>
              ) : (
                <p className="mt-1 truncate text-[0.8125rem] text-foreground">
                  {d.value}
                </p>
              )}
            </div>
          ))}
          {patient.notes ? (
            <div className="col-span-full bg-surface px-4 py-3">
              <Overline>Notes</Overline>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
                {patient.notes}
              </p>
            </div>
          ) : null}
        </Fascia>
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel index="02" title="MONITORED LESIONS" />
          <Datum className="text-xs text-faint">
            {String(lesions.length).padStart(2, "0")} TRACKED
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
            {lesions.map((lesion) => {
              const flagged = isFlaggedLabel(lesion.currentRisk);
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
                          Added {formatDate(lesion.createdAt)}
                        </Datum>
                        <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                          View timeline
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
  );
}
