import Link from "next/link";
import { createPatientAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { SectionLabel } from "@/components/ui/instrument";
import { PageHeader } from "@/components/ui/page-header";

export default function NewPatientPage() {
  return (
    <div className="mx-auto grid max-w-2xl gap-7">
      <PageHeader
        eyebrow={
          <Link href="/app/patients" className="hover:text-muted">
            ← Patients
          </Link>
        }
        title="New patient"
        description="Manual entry is the primary and backup data path for the prototype."
      />

      <form action={createPatientAction} className="grid gap-6">
        <Card>
          <CardHeader>
            <h2 className="flex items-center">
              <SectionLabel index="01" title="Identity" />
            </h2>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="First name">
              <input className={inputClass} name="firstName" required />
            </Field>
            <Field label="Last name">
              <input className={inputClass} name="lastName" required />
            </Field>
            <Field label="Date of birth">
              <input className={inputClass} name="dateOfBirth" type="date" required />
            </Field>
            <Field label="MRN" hint="Medical record number">
              <input className={inputClass} name="mrn" required />
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
                <input className={inputClass} name="email" type="email" />
              </Field>
              <Field label="Phone">
                <input className={inputClass} name="phone" />
              </Field>
            </div>
            <Field label="Address">
              <textarea className={textareaClass} name="address" rows={2} />
            </Field>
            <Field label="Notes">
              <textarea className={textareaClass} name="notes" rows={3} />
            </Field>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button asChild variant="ghost">
            <Link href="/app/patients">Cancel</Link>
          </Button>
          <Button type="submit">Create patient</Button>
        </div>
      </form>
    </div>
  );
}
