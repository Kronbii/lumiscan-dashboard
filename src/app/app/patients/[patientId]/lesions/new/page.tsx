import { createLesionAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";
import { bodyRegions, bodySides } from "@/lib/enums";

export default async function NewLesionPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const action = createLesionAction.bind(null, patientId);

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">New lesion</h1>
        </CardHeader>
        <CardContent>
          <form action={action} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Body region">
                <select className={inputClass} name="bodyRegion" required>
                  {bodyRegions.map((region) => (
                    <option key={region} value={region}>
                      {region.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Side">
                <select className={inputClass} name="bodySide" required>
                  {bodySides.map((side) => (
                    <option key={side} value={side}>
                      {side}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Precise location">
              <input className={inputClass} name="bodyLocationNote" required />
            </Field>
            <Field label="Description">
              <textarea className={inputClass} name="description" rows={3} />
            </Field>
            <div className="flex justify-end">
              <Button type="submit">Create lesion</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
