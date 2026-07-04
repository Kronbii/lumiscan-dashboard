import Link from "next/link";
import { createScanAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { classificationLabels, metricsScales } from "@/lib/enums";
import { formatLesionSite, humanize } from "@/lib/utils";
import { getOrgContext } from "@/server/auth/org-context";
import { lesionService } from "@/server/services/lesion";

export const dynamic = "force-dynamic";

export default async function NewScanPage({
  params,
}: {
  params: Promise<{ patientId: string; lesionId: string }>;
}) {
  const { patientId, lesionId } = await params;
  const ctx = await getOrgContext();
  const lesion = await lesionService.getById(ctx, lesionId);
  const action = createScanAction.bind(null, patientId, lesionId);
  const nowLocal = new Date().toISOString().slice(0, 16);

  return (
    <div className="mx-auto grid max-w-4xl gap-7">
      <PageHeader
        eyebrow={
          <Link
            href={`/app/patients/${patientId}/lesions/${lesionId}`}
            className="hover:text-muted"
          >
            ← {formatLesionSite(lesion.bodySide, lesion.bodyRegion)}
          </Link>
        }
        title="Record scan"
        description="Attach a dermoscopic image and finalize its classification and metrics."
      />

      <form action={action} className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Image</CardTitle>
          </CardHeader>
          <CardContent>
            <Field label="Dermoscopic image" hint="JPEG, PNG or WebP, up to 15 MB">
              <input
                className={`${inputClass} h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-surface-3 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground`}
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assessment</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
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
                    {humanize(scale)}
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
            <Field label="Confidence" hint="0.0 – 1.0">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Measurements</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Diameter (mm)">
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
            <Field label="Area (mm²)">
              <input className={inputClass} name="area_mm2" type="number" min="0" step="0.1" />
            </Field>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button asChild variant="ghost">
            <Link href={`/app/patients/${patientId}/lesions/${lesionId}`}>Cancel</Link>
          </Button>
          <Button type="submit">Finalize scan</Button>
        </div>
      </form>
    </div>
  );
}
