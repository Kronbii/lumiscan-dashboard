import { createPatientAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";

export default function NewPatientPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">New patient</h1>
        </CardHeader>
        <CardContent>
          <form action={createPatientAction} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name">
                <input className={inputClass} name="firstName" required />
              </Field>
              <Field label="Last name">
                <input className={inputClass} name="lastName" required />
              </Field>
              <Field label="Date of birth">
                <input className={inputClass} name="dateOfBirth" type="date" required />
              </Field>
              <Field label="MRN">
                <input className={inputClass} name="mrn" required />
              </Field>
              <Field label="Email">
                <input className={inputClass} name="email" type="email" />
              </Field>
              <Field label="Phone">
                <input className={inputClass} name="phone" />
              </Field>
            </div>
            <Field label="Address">
              <textarea className={inputClass} name="address" rows={2} />
            </Field>
            <Field label="Notes">
              <textarea className={inputClass} name="notes" rows={3} />
            </Field>
            <div className="flex justify-end">
              <Button type="submit">Create patient</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
