import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
  Plus,
  ScanLine,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { classificationColor } from "@/lib/enums";
import { formatDate, formatLesionSite } from "@/lib/utils";
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
    { icon: CalendarDays, label: "Date of birth", value: formatDate(patient.dateOfBirth) },
    patient.email ? { icon: Mail, label: "Email", value: patient.email } : null,
    patient.phone ? { icon: Phone, label: "Phone", value: patient.phone } : null,
    patient.address ? { icon: MapPin, label: "Address", value: patient.address } : null,
  ].filter(Boolean) as { icon: typeof Mail; label: string; value: string }[];

  return (
    <div className="grid gap-7">
      <PageHeader
        eyebrow={
          <Link href="/app/patients" className="hover:text-muted">
            ← Patients
          </Link>
        }
        title={
          <span className="flex items-center gap-3">
            <Avatar name={name} size="lg" />
            {name}
          </span>
        }
        description={
          <span className="font-mono text-xs text-faint">MRN {patient.mrn}</span>
        }
        actions={
          <Button asChild>
            <Link href={`/app/patients/${patient.id}/lesions/new`}>
              <Plus /> New lesion
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Patient details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {details.map((d) => (
              <div key={d.label} className="flex items-start gap-3">
                <d.icon className="mt-0.5 size-4 shrink-0 text-faint" />
                <div className="min-w-0">
                  <p className="text-xs text-faint">{d.label}</p>
                  <p className="truncate text-sm text-foreground">{d.value}</p>
                </div>
              </div>
            ))}
            {patient.notes ? (
              <div className="rounded-lg bg-surface-2 p-3 text-sm text-muted">
                {patient.notes}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <section className="grid gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Lesions
              <span className="ml-2 rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-muted">
                {lesions.length}
              </span>
            </h2>
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
                      <Plus /> New lesion
                    </Link>
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {lesions.map((lesion) => (
                <Link
                  key={lesion.id}
                  href={`/app/patients/${patient.id}/lesions/${lesion.id}`}
                  className="group"
                >
                  <Card interactive className="h-full">
                    <CardContent className="flex h-full flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-foreground">
                          {formatLesionSite(lesion.bodySide, lesion.bodyRegion)}
                        </p>
                        {lesion.currentRisk ? (
                          <Badge tone={classificationColor[lesion.currentRisk]} dot>
                            {lesion.currentRisk}
                          </Badge>
                        ) : (
                          <Badge tone="grey">No scans</Badge>
                        )}
                      </div>
                      <p className="line-clamp-2 flex-1 text-sm text-muted">
                        {lesion.bodyLocationNote}
                      </p>
                      <div className="flex items-center text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                        View timeline <ChevronRight className="size-3.5" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
