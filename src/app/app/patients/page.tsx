import Link from "next/link";
import { Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgContext } from "@/server/auth/org-context";
import { repo } from "@/server/db/scoped-repo";
import { lesionService } from "@/server/services/lesion";
import { patientService } from "@/server/services/patient";
import { PatientsTable, type PatientRow } from "@/app/app/patients/patients-table";

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
    if (top === null || (riskSeverity[risk] ?? -1) > (riskSeverity[top] ?? -1)) {
      top = risk;
    }
  }
  return top;
}

export default async function PatientsPage() {
  const ctx = await getOrgContext();
  const [patients, lesions, captureDates] = await Promise.all([
    patientService.list(ctx),
    lesionService.list(ctx),
    repo(ctx).scans.listCaptureDates(),
  ]);

  const lesionsByPatient = new Map<string, typeof lesions>();
  const patientByLesion = new Map<string, string>();
  for (const lesion of lesions) {
    patientByLesion.set(lesion.id, lesion.patientId);
    const existing = lesionsByPatient.get(lesion.patientId);
    if (existing) existing.push(lesion);
    else lesionsByPatient.set(lesion.patientId, [lesion]);
  }

  // Latest scan date per patient (across their lesions).
  const lastScanByPatient = new Map<string, number>();
  for (const row of captureDates) {
    const patientId = patientByLesion.get(row.lesionId);
    if (!patientId) continue;
    const ts = row.capturedAt.getTime();
    if (ts > (lastScanByPatient.get(patientId) ?? 0)) lastScanByPatient.set(patientId, ts);
  }

  const rows: PatientRow[] = patients.map((patient) => {
    const patientLesions = lesionsByPatient.get(patient.id) ?? [];
    const lastTs = lastScanByPatient.get(patient.id);
    return {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      mrn: patient.mrn,
      dateOfBirth: patient.dateOfBirth,
      lesionCount: patientLesions.length,
      risk: highestRisk(patientLesions.map((lesion) => lesion.currentRisk)),
      lastScanAt: lastTs ? new Date(lastTs).toISOString() : null,
    };
  });

  return (
    <div className="grid gap-7">
      <PageHeader
        eyebrow="01 · Patient register"
        title="Patients"
        description="Everyone under active monitoring in this organization."
        actions={
          <Button asChild>
            <Link href="/app/patients/new">
              <Plus strokeWidth={1.75} /> New patient
            </Link>
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title="No patients yet"
            description="Add your first patient to start recording lesions and scans."
            action={
              <Button asChild size="sm">
                <Link href="/app/patients/new">
                  <Plus strokeWidth={1.75} /> New patient
                </Link>
              </Button>
            }
          />
        ) : (
          <PatientsTable patients={rows} />
        )}
      </Card>
    </div>
  );
}
