"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import {
  Fascia,
  Led,
  Overline,
  SectionLabel,
  classificationTone,
} from "@/components/ui/instrument";
import {
  type ClassificationLabel,
  classificationLabels,
  metricsScales,
} from "@/lib/enums";
import { humanize } from "@/lib/utils";
import { ImageDropzone } from "./image-dropzone";

/* Selected tile: 2px inset ring in the status color over its soft tint. */
const tileSelected: Record<ClassificationLabel, string> = {
  BENIGN: "has-checked:bg-benign-soft has-checked:ring-2 has-checked:ring-benign",
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

export function ScanForm({
  cancelHref,
  lesionId,
  nowLocal,
  patientId,
  site,
}: {
  cancelHref: string;
  lesionId: string;
  nowLocal: string;
  patientId: string;
  site: string;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("patientId", patientId);
    formData.set("lesionId", lesionId);

    try {
      const response = await fetch("/api/manual-scans", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        redirectTo?: string;
      } | null;

      if (!response.ok || !payload?.redirectTo) {
        throw new Error(payload?.error ?? "The scan could not be recorded.");
      }

      router.push(payload.redirectTo);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The scan could not be recorded.",
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
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

        {error ? (
          <p
            role="alert"
            className="border-t border-border bg-surface px-5 py-3 text-xs text-malignant"
          >
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between bg-surface px-5 py-3">
          <Button asChild variant="ghost">
            <Link href={cancelHref}>Discard</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Recording..." : "Record scan"}
          </Button>
        </div>
      </Fascia>
    </form>
  );
}
