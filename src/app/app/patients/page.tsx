import Link from "next/link";
import { ChevronRight, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { classificationTone, Datum, StatusChip } from "@/components/ui/instrument";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils";
import { getOrgContext } from "@/server/auth/org-context";
import { lesionService } from "@/server/services/lesion";
import { patientService } from "@/server/services/patient";

export const dynamic = "force-dynamic";

function age(dob: string) {
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years -= 1;
  return years;
}

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

const flaggedRule: Record<string, string> = {
  MALIGNANT: "border-l-2 border-l-malignant",
  SUSPICIOUS: "border-l-2 border-l-suspicious",
};

export default async function PatientsPage() {
  const ctx = await getOrgContext();
  const [patients, lesions] = await Promise.all([
    patientService.list(ctx),
    lesionService.list(ctx),
  ]);
  const lesionsByPatient = new Map<string, typeof lesions>();

  for (const lesion of lesions) {
    const existing = lesionsByPatient.get(lesion.patientId);
    if (existing) {
      existing.push(lesion);
    } else {
      lesionsByPatient.set(lesion.patientId, [lesion]);
    }
  }

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
        {patients.length === 0 ? (
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
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[0.8125rem]">
                <thead>
                  <tr className="h-10 border-b border-border-strong">
                    <th className="overline px-4 font-medium">Name</th>
                    <th className="overline px-4 font-medium">MRN</th>
                    <th className="overline px-4 font-medium">Date of birth</th>
                    <th className="overline px-4 text-right font-medium">Age</th>
                    <th className="overline px-4 text-right font-medium">Lesions</th>
                    <th className="overline px-4 font-medium">Highest risk</th>
                    <th className="w-10 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => {
                    const name = `${patient.firstName} ${patient.lastName}`;
                    const lesions = lesionsByPatient.get(patient.id) ?? [];
                    const risk = highestRisk(
                      lesions.map((lesion) => lesion.currentRisk),
                    );
                    return (
                      <tr
                        key={patient.id}
                        className={`group h-10 border-b border-border transition-colors last:border-0 hover:bg-surface-2 ${
                          risk && flaggedRule[risk] ? flaggedRule[risk] : ""
                        }`}
                      >
                        <td className="px-4">
                          <Link
                            href={`/app/patients/${patient.id}`}
                            className="flex items-center gap-3"
                          >
                            <Avatar name={name} size="sm" />
                            <span className="font-medium text-foreground">
                              {patient.lastName}, {patient.firstName}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4">
                          <Datum className="text-xs text-muted">{patient.mrn}</Datum>
                        </td>
                        <td className="px-4">
                          <Datum className="text-xs text-muted">
                            {formatDate(patient.dateOfBirth)}
                          </Datum>
                        </td>
                        <td className="px-4 text-right">
                          <Datum className="text-xs text-muted">
                            {age(patient.dateOfBirth)}
                          </Datum>
                          <span className="ml-1 text-[0.6875rem] text-faint">yrs</span>
                        </td>
                        <td className="px-4 text-right">
                          <Datum className="text-xs text-muted">{lesions.length}</Datum>
                        </td>
                        <td className="px-4">
                          {risk ? (
                            <StatusChip label={risk} tone={classificationTone(risk)} />
                          ) : (
                            <Datum className="text-xs text-faint">—</Datum>
                          )}
                        </td>
                        <td className="px-4">
                          <Link
                            href={`/app/patients/${patient.id}`}
                            className="flex justify-end text-faint transition-colors group-hover:text-muted"
                            aria-label={`Open ${name}`}
                          >
                            <ChevronRight className="size-4" strokeWidth={1.75} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-2">
              <Datum className="text-[0.6875rem] uppercase tracking-[0.08em] text-faint">
                {patients.length} {patients.length === 1 ? "patient" : "patients"}
              </Datum>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
