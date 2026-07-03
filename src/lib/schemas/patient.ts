import { z } from "zod";

export const patientCreateSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  dateOfBirth: z.string().trim().min(1).max(30),
  mrn: z.string().trim().min(1).max(80),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(4_000).optional(),
});

export const patientUpdateSchema = patientCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export type PatientCreateInput = z.infer<typeof patientCreateSchema>;
export type PatientUpdateInput = z.infer<typeof patientUpdateSchema>;
