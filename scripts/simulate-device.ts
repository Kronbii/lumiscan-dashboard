import { randomUUID } from "node:crypto";

const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const apiKey = process.env.DEVICE_API_KEY;
const lesionId = process.env.LESION_ID;

if (!apiKey || !lesionId) {
  console.error("Set DEVICE_API_KEY and LESION_ID before running simulate-device.");
  process.exit(1);
}

const response = await fetch(`${appUrl}/api/v1/ingest/scans`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Idempotency-Key": process.env.IDEMPOTENCY_KEY ?? randomUUID(),
  },
  body: JSON.stringify({
    capturedAt: new Date().toISOString(),
    subject: { lesionId },
    classification: {
      label: "SUSPICIOUS",
      confidence: 0.82,
      confidenceLabel: "SUSPICIOUS",
      metrics: {
        diameter_mm: 6.8,
        asymmetry_score: 6.1,
        border_irregularity_score: 5.4,
        color_variation_score: 4.8,
      },
      metricsScale: "DERMOSCOPE",
    },
    images: [
      {
        imageType: "DERMOSCOPIC",
        isPrimary: true,
        objectKey: `org_placeholder/device/${randomUUID()}.webp`,
        contentHash: "devicehash0000000000000000000000000001",
      },
    ],
  }),
});

console.log(response.status, await response.text());
