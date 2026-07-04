import Link from "next/link";
import { ChevronRight, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils";
import { getOrgContext } from "@/server/auth/org-context";
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

export default async function PatientsPage() {
  const ctx = await getOrgContext();
  const patients = await patientService.list(ctx);

  return (
    <div className="grid gap-7">
      <PageHeader
        title="Patients"
        description="Everyone under active monitoring in this organization."
        actions={
          <Button asChild>
            <Link href="/app/patients/new">
              <Plus /> New patient
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
                  <Plus /> New patient
                </Link>
              </Button>
            }
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-xs font-medium uppercase tracking-wide text-faint">
                <th className="px-5 py-3 font-medium">Patient</th>
                <th className="px-5 py-3 font-medium">MRN</th>
                <th className="px-5 py-3 font-medium">Date of birth</th>
                <th className="w-10 px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {patients.map((patient) => {
                const name = `${patient.firstName} ${patient.lastName}`;
                return (
                  <tr
                    key={patient.id}
                    className="group transition-colors hover:bg-surface-2"
                  >
                    <td className="px-5 py-3">
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
                    <td className="px-5 py-3">
                      <span className="rounded-md bg-surface-3 px-2 py-0.5 font-mono text-xs text-muted">
                        {patient.mrn}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted">
                      <span className="nums">{formatDate(patient.dateOfBirth)}</span>
                      <span className="ml-2 text-faint">· {age(patient.dateOfBirth)} yrs</span>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/app/patients/${patient.id}`}
                        className="flex justify-end text-faint transition-colors group-hover:text-muted"
                      >
                        <ChevronRight className="size-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
