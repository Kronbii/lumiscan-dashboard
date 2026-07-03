import { z } from "zod";
import {
  classificationLabels,
  imageTypes,
  metricsScales,
  scanSources,
} from "@/lib/enums";
import { metricsSchema } from "@/lib/schemas/metrics";

export const scanImageInputSchema = z.object({
  objectKey: z.string().min(1).max(1_000),
  imageType: z.enum(imageTypes).default("DERMOSCOPIC"),
  isPrimary: z.boolean().default(false),
  contentHash: z.string().min(16).max(128),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const classificationInputSchema = z.object({
  label: z.enum(classificationLabels),
  confidence: z.number().min(0).max(1),
  confidenceLabel: z.enum(classificationLabels),
  metrics: metricsSchema.default({}),
  metricsScale: z.enum(metricsScales),
});

export const createFinalizedScanSchema = z.object({
  lesionId: z.string().uuid(),
  capturedAt: z.coerce.date(),
  source: z.enum(scanSources).default("MANUAL"),
  deviceId: z.string().uuid().optional(),
  ingestionEventId: z.string().uuid().optional(),
  classification: classificationInputSchema,
  images: z.array(scanImageInputSchema).min(1),
});

export const scanIdSchema = z.object({
  id: z.string().uuid(),
});

export type ScanImageInput = z.infer<typeof scanImageInputSchema>;
export type ClassificationInput = z.infer<typeof classificationInputSchema>;
export type CreateFinalizedScanInput = z.infer<typeof createFinalizedScanSchema>;
