import { z } from "zod";
import { bodyRegions, bodySides } from "@/lib/enums";

export const lesionCreateSchema = z.object({
  patientId: z.string().uuid(),
  bodyRegion: z.enum(bodyRegions),
  bodySide: z.enum(bodySides),
  bodyLocationNote: z.string().trim().min(3).max(500),
  bodyMapX: z.coerce.number().min(0).max(1).optional(),
  bodyMapY: z.coerce.number().min(0).max(1).optional(),
  description: z.string().trim().max(4_000).optional(),
});

export const lesionUpdateSchema = lesionCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export type LesionCreateInput = z.infer<typeof lesionCreateSchema>;
export type LesionUpdateInput = z.infer<typeof lesionUpdateSchema>;
