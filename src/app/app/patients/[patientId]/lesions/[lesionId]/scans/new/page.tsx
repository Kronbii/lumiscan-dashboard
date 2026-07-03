import { createScanAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";
import { classificationLabels, metricsScales } from "@/lib/enums";

export default async function NewScanPage({
  params,
}: {
  params: Promise<{ patientId: string; lesionId: string }>;
}) {
  const { patientId, lesionId } = await params;
  const action = createScanAction.bind(null, patientId, lesionId);
  const nowLocal = new Date().toISOString().slice(0, 16);

  return (
    <div className="mx-auto max-w-4xl">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-semibold">Record scan</h1>
        </CardHeader>
        <CardContent>
          <form action={action} className="grid gap-5">
            <Field label="Image">
              <input
                className={inputClass}
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Captured at">
                <input
                  className={inputClass}
                  name="capturedAt"
                  type="datetime-local"
                  defaultValue={nowLocal}
                  required
                />
              </Field>
              <Field label="Metrics scale">
                <select className={inputClass} name="metricsScale" required>
                  {metricsScales.map((scale) => (
                    <option key={scale} value={scale}>
                      {scale.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Classification">
                <select className={inputClass} name="label" required>
                  {classificationLabels.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Confidence label">
                <select className={inputClass} name="confidenceLabel" required>
                  {classificationLabels.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Confidence">
                <input
                  className={inputClass}
                  name="confidence"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  defaultValue="0.82"
                  required
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Field label="Diameter mm">
                <input className={inputClass} name="diameter_mm" type="number" min="0" step="0.1" />
              </Field>
              <Field label="Asymmetry">
                <input className={inputClass} name="asymmetry_score" type="number" min="0" max="10" step="0.1" />
              </Field>
              <Field label="Border">
                <input className={inputClass} name="border_irregularity_score" type="number" min="0" max="10" step="0.1" />
              </Field>
              <Field label="Color">
                <input className={inputClass} name="color_variation_score" type="number" min="0" max="10" step="0.1" />
              </Field>
              <Field label="Area mm2">
                <input className={inputClass} name="area_mm2" type="number" min="0" step="0.1" />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button type="submit">Finalize scan</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
