import Link from "next/link";
import { deletePatientAction, updatePatientAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmAction } from "@/components/confirm-action";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { SectionLabel } from "@/components/ui/instrument";
import { PageHeader } from "@/components/ui/page-header";
import { getOrgContext } from "@/server/auth/org-context";
import { patientService } from "@/server/services/patient";
import { notFoundIfMissing } from "@/lib/rsc";

export const dynamic = "force-dynamic";

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const ctx = await getOrgContext();
  const patient = await patientService.getById(ctx, patientId).catch(notFoundIfMissing);
  const name = `${patient.firstName} ${patient.lastName}`;
  const save = updatePatientAction.bind(null, patientId);
  const remove = deletePatientAction.bind(null, patientId);

  return (
    <div className="mx-auto grid max-w-2xl gap-7">
      <PageHeader
        eyebrow={
          <Link href={`/app/patients/${patientId}`} className="hover:text-muted">
            ← {name}
          </Link>
        }
        title="Edit patient"
        description="Correct or update this patient's record."
      />

      <form action={save} className="grid gap-6">
        <Card>
          <CardHeader>
            <h2 className="flex items-center">
              <SectionLabel index="01" title="Identity" />
            </h2>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="First name">
              <input className={inputClass} name="firstName" defaultValue={patient.firstName} required />
            </Field>
            <Field label="Last name">
              <input className={inputClass} name="lastName" defaultValue={patient.lastName} required />
            </Field>
            <Field label="Date of birth">
              <input
                className={inputClass}
                name="dateOfBirth"
                type="date"
                defaultValue={patient.dateOfBirth}
                required
              />
            </Field>
            <Field label="MRN" hint="Medical record number">
              <input className={inputClass} name="mrn" defaultValue={patient.mrn} required />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="flex items-center">
              <SectionLabel index="02" title="Contact" />
            </h2>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email">
                <input className={inputClass} name="email" type="email" defaultValue={patient.email ?? ""} />
              </Field>
              <Field label="Phone">
                <input className={inputClass} name="phone" defaultValue={patient.phone ?? ""} />
              </Field>
            </div>
            <Field label="Address">
              <textarea className={textareaClass} name="address" rows={2} defaultValue={patient.address ?? ""} />
            </Field>
            <Field label="Notes">
              <textarea className={textareaClass} name="notes" rows={3} defaultValue={patient.notes ?? ""} />
            </Field>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button asChild variant="ghost">
            <Link href={`/app/patients/${patientId}`}>Cancel</Link>
          </Button>
          <Button type="submit">Save changes</Button>
        </div>
      </form>

      <Card className="border-malignant-border">
        <CardHeader>
          <h2 className="flex items-center">
            <SectionLabel index="03" title="Danger zone" />
          </h2>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.8125rem] text-muted">
            Remove {name} and their lesions from the active register.
          </p>
          <ConfirmAction
            action={remove}
            label="Delete patient"
            message="Removes this patient from your register."
          />
        </CardContent>
      </Card>
    </div>
  );
}
