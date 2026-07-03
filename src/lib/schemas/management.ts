import { z } from "zod";
import { managementStatuses } from "@/lib/enums";

export const setManagementStatusSchema = z.object({
  lesionId: z.string().uuid(),
  status: z.enum(managementStatuses),
});

export const addManagementNoteSchema = z.object({
  lesionId: z.string().uuid(),
  body: z.string().trim().min(1).max(8_000),
});

export type SetManagementStatusInput = z.infer<typeof setManagementStatusSchema>;
export type AddManagementNoteInput = z.infer<typeof addManagementNoteSchema>;
