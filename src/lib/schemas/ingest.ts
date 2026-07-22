import { z } from "zod";
import { bodyRegions, bodySides } from "@/lib/enums";
import {
  classificationInputSchema,
  scanImageInputSchema,
} from "@/lib/schemas/scan";

export const deviceIngestPayloadSchema = z
  .object({
    capturedAt: z.string().datetime({ offset: true }),
    subject: z
      .object({
        lesionId: z.string().uuid(),
      })
      .optional(),
    patientRef: z
      .object({
        mrn: z.string().min(1).max(80),
        bodyRegionHint: z.enum(bodyRegions).optional(),
        bodySide: z.enum(bodySides).optional(),
      })
      .optional(),
    classification: classificationInputSchema,
    images: z.array(scanImageInputSchema).min(1),
  })
  .refine((value) => Boolean(value.subject) !== Boolean(value.patientRef), {
    message: "Provide exactly one of subject or patientRef.",
    path: ["subject"],
  });

export const imagePresignPayloadSchema = z.object({
  // A device identifies the upload target by lesionId, or by patient MRN when it
  // only knows the MRN (barcode workflow). One of the two is required.
  lesionId: z.string().uuid().optional(),
  mrn: z.string().trim().min(1).max(80).optional(),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fileName: z.string().trim().min(1).max(255),
  contentLength: z.number().int().positive().max(15 * 1024 * 1024),
});

export type DeviceIngestPayload = z.infer<typeof deviceIngestPayloadSchema>;
export type ImagePresignPayload = z.infer<typeof imagePresignPayloadSchema>;
