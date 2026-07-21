import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type { ClassificationLabel, MetricsScale } from "@/lib/enums";
import type { ScanMetrics } from "@/lib/schemas/metrics";
import { getOrgContext } from "@/server/auth/org-context";
import { createFinalizedScan } from "@/server/services/scan-write";
import { uploadClinicalImageFromFile } from "@/server/storage/presign";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalNumber(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const patientId = text(formData, "patientId");
    const lesionId = text(formData, "lesionId");
    const image = formData.get("image");

    if (!patientId || !lesionId) {
      return NextResponse.json(
        { error: "A patient and lesion are required." },
        { status: 400 },
      );
    }
    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json({ error: "A scan image is required." }, { status: 400 });
    }

    const ctx = await getOrgContext();
    const uploaded = await uploadClinicalImageFromFile(ctx, {
      lesionId,
      file: image,
    });
    const metrics: ScanMetrics = {
      diameter_mm: optionalNumber(formData, "diameter_mm"),
      asymmetry_score: optionalNumber(formData, "asymmetry_score"),
      border_irregularity_score: optionalNumber(formData, "border_irregularity_score"),
      color_variation_score: optionalNumber(formData, "color_variation_score"),
      area_mm2: optionalNumber(formData, "area_mm2"),
    };

    await createFinalizedScan(
      {
        lesionId,
        capturedAt: new Date(text(formData, "capturedAt")),
        source: "MANUAL",
        classification: {
          label: text(formData, "label") as ClassificationLabel,
          confidence: Number(text(formData, "confidence")),
          confidenceLabel: text(formData, "confidenceLabel") as ClassificationLabel,
          metrics,
          metricsScale: text(formData, "metricsScale") as MetricsScale,
        },
        images: [
          {
            objectKey: uploaded.objectKey,
            contentHash: uploaded.contentHash,
            imageType: "DERMOSCOPIC",
            isPrimary: true,
          },
        ],
      },
      ctx,
    );

    const redirectTo = `/app/patients/${patientId}/lesions/${lesionId}`;
    revalidatePath(redirectTo);
    return NextResponse.json({ redirectTo });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "The scan could not be recorded.",
      },
      { status: 500 },
    );
  }
}
