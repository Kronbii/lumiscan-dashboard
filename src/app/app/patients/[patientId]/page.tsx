import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { classificationColor } from "@/lib/enums";
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

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Patient</p>
          <h1 className="text-2xl font-semibold">
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="mt-1 text-sm text-muted">MRN {patient.mrn}</p>
        </div>
        <Button asChild>
          <Link href={`/app/patients/${patient.id}/lesions/new`}>
            <Plus className="h-4 w-4" /> Lesion
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Lesions</h2>
        </CardHeader>
        <CardContent>
          {lesions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              No lesions have been recorded for this patient.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {lesions.map((lesion) => (
                <Link
                  key={lesion.id}
                  href={`/app/patients/${patient.id}/lesions/${lesion.id}`}
                  className="rounded-lg border border-border bg-white p-4 hover:bg-zinc-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {lesion.bodySide} {lesion.bodyRegion}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">
                        {lesion.bodyLocationNote}
                      </p>
                    </div>
                    {lesion.currentRisk ? (
                      <Badge tone={classificationColor[lesion.currentRisk]}>
                        {lesion.currentRisk}
                      </Badge>
                    ) : (
                      <Badge>NO SCANS</Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
