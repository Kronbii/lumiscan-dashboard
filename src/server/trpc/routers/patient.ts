import { z } from "zod";
import { patientCreateSchema, patientUpdateSchema } from "@/lib/schemas/patient";
import { requireRole } from "@/server/auth/require-role";
import { patientService } from "@/server/services/patient";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

export const patientRouter = createTRPCRouter({
  list: protectedProcedure.query(({ ctx }) => patientService.list(ctx.org)),
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => patientService.getById(ctx.org, input.id)),
  create: protectedProcedure
    .input(patientCreateSchema)
    .mutation(({ ctx, input }) => patientService.create(ctx.org, input)),
  update: protectedProcedure
    .input(patientUpdateSchema)
    .mutation(({ ctx, input }) => patientService.update(ctx.org, input)),
  softDelete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      requireRole(ctx.org, ["OWNER", "ADMIN"]);
      return patientService.softDelete(ctx.org, input.id);
    }),
});
