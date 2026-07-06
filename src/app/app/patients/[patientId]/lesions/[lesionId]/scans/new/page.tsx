import Link from "next/link";
import { createScanAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import {
  Fascia,
  Led,
  Overline,
  SectionLabel,
  classificationTone,
} from "@/components/ui/instrument";
import { PageHeader } from "@/components/ui/page-header";
import {
  type ClassificationLabel,
  classificationLabels,
  metricsScales,
} from "@/lib/enums";
import { formatLesionSite, humanize } from "@/lib/utils";
import { getOrgContext } from "@/server/auth/org-context";
import { lesionService } from "@/server/services/lesion";
import { ImageDropzone } from "./image-dropzone";

export const dynamic = "force-dynamic";

/* Selected tile: 2px inset ring in the status color over its soft tint. */
const tileSelected: Record<ClassificationLabel, string> = {
  BENIGN:
    "has-checked:bg-benign-soft has-checked:ring-2 has-checked:ring-benign",
  SUSPICIOUS:
    "has-checked:bg-suspicious-soft has-checked:ring-2 has-checked:ring-suspicious",
  MALIGNANT:
    "has-checked:bg-malignant-soft has-checked:ring-2 has-checked:ring-malignant",
  INCONCLUSIVE:
    "has-checked:bg-inconclusive-soft has-checked:ring-2 has-checked:ring-inconclusive",
};

const metricFields = [
  { name: "diameter_mm", label: "Diameter", unit: "mm", max: undefined },
  { name: "asymmetry_score", label: "Asymmetry", unit: "/ 10", max: "10" },
  {
    name: "border_irregularity_score",
    label: "Border irregularity",
    unit: "/ 10",
    max: "10",
  },
  {
    name: "color_variation_score",
    label: "Color variation",
    unit: "/ 10",
    max: "10",
  },
  { name: "area_mm2", label: "Area", unit: "mm²", max: undefined },
] as const;

const numberInputClass = `${inputClass} datum pr-12 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;

function UnitSuffix({ unit }: { unit: string }) {
  return (
    <span className="datum pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-xs text-faint">
      {unit}
    </span>
  );
}

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
  const site = formatLesionSite(lesion.bodySide, lesion.bodyRegion);

  return (
    <div className="mx-auto grid w-full max-w-180 gap-7">
      <PageHeader
        eyebrow={
          <Link
            href={`/app/patients/${patientId}/lesions/${lesionId}`}
            className="datum hover:text-muted"
          >
            ← {site}
          </Link>
        }
        title="Record scan"
        description="Attach a dermoscopic image and finalize its classification and metrics."
      />

      <form action={action}>
        <Fascia className="grid-cols-1">
          <section className="grid gap-4 bg-surface p-5">
            <SectionLabel index="01" title="Image" />
            <div className="grid gap-1.5">
              <span className="text-[0.8125rem] font-semibold text-foreground">
                Dermoscopic capture
              </span>
              <ImageDropzone site={site} />
            </div>
            <Field label="Captured at" className="sm:max-w-xs">
              <input
                className={`${inputClass} datum`}
                name="capturedAt"
                type="datetime-local"
                defaultValue={nowLocal}
                required
              />
            </Field>
          </section>

          <section className="grid gap-4 bg-surface p-5">
            <SectionLabel index="02" title="Assessment" />
            <div className="grid gap-1.5">
              <span className="text-[0.8125rem] font-semibold text-foreground">
                Classification
              </span>
              <Fascia className="grid-cols-2 sm:grid-cols-4">
                {classificationLabels.map((label) => (
                  <label
                    key={label}
                    className={`flex cursor-pointer items-center gap-2 bg-surface px-3 py-3 ring-inset transition-colors hover:bg-surface-2 has-focus-visible:outline-2 has-focus-visible:outline-primary ${tileSelected[label]}`}
                  >
                    <input
                      type="radio"
                      name="label"
                      value={label}
                      defaultChecked={label === classificationLabels[0]}
                      required
                      className="sr-only"
                    />
                    <Led tone={classificationTone(label)} />
                    <Overline className="text-foreground">{label}</Overline>
                  </label>
                ))}
              </Fascia>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
                <div className="relative">
                  <input
                    className={numberInputClass}
                    name="confidence"
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    defaultValue="0.82"
                    required
                  />
                  <UnitSuffix unit="0–1" />
                </div>
              </Field>
            </div>
          </section>

          <section className="grid gap-4 bg-surface p-5">
            <SectionLabel index="03" title="Measurements" />
            <div className="grid gap-4 sm:grid-cols-2">
              {metricFields.map((metric) => (
                <Field key={metric.name} label={metric.label}>
                  <div className="relative">
                    <input
                      className={numberInputClass}
                      name={metric.name}
                      type="number"
                      min="0"
                      max={metric.max}
                      step="0.1"
                    />
                    <UnitSuffix unit={metric.unit} />
                  </div>
                </Field>
              ))}
              <Field label="Metrics scale">
                <select className={inputClass} name="metricsScale" required>
                  {metricsScales.map((scale) => (
                    <option key={scale} value={scale}>
                      {humanize(scale)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <div className="flex items-center justify-between bg-surface px-5 py-3">
            <Button asChild variant="ghost">
              <Link href={`/app/patients/${patientId}/lesions/${lesionId}`}>
                Discard
              </Link>
            </Button>
            <Button type="submit">Record scan</Button>
          </div>
        </Fascia>
      </form>
    </div>
  );
}
