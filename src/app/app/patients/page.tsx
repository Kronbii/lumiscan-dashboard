import Link from "next/link";
import { Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getOrgContext } from "@/server/auth/org-context";
import { patientService } from "@/server/services/patient";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const ctx = await getOrgContext();
  const patients = await patientService.list(ctx);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Patients</h1>
          <p className="mt-1 text-sm text-muted">
            Manual entry is the MVP data path and backup path.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/patients/new">
            <Plus className="h-4 w-4" /> Patient
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Patient directory</h2>
        </CardHeader>
        <CardContent>
          {patients.length === 0 ? (
            <div className="grid place-items-center gap-3 py-12 text-center">
              <UserRound className="h-8 w-8 text-muted" />
              <p className="text-sm text-muted">No patients have been added.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">MRN</th>
                    <th className="px-4 py-3">DOB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {patients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <Link
                          className="font-medium text-teal-800"
                          href={`/app/patients/${patient.id}`}
                        >
                          {patient.lastName}, {patient.firstName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{patient.mrn}</td>
                      <td className="px-4 py-3">{patient.dateOfBirth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
