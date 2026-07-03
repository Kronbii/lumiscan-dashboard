import { z } from "zod";
import { lesionCreateSchema, lesionUpdateSchema } from "@/lib/schemas/lesion";
import { lesionService } from "@/server/services/lesion";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

export const lesionRouter = createTRPCRouter({
  listByPatient: protectedProcedure
    .input(z.object({ patientId: z.string().uuid() }))
    .query(({ ctx, input }) => lesionService.listByPatient(ctx.org, input.patientId)),
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => lesionService.getById(ctx.org, input.id)),
  create: protectedProcedure
    .input(lesionCreateSchema)
    .mutation(({ ctx, input }) => lesionService.create(ctx.org, input)),
  update: protectedProcedure
    .input(lesionUpdateSchema)
    .mutation(({ ctx, input }) => lesionService.update(ctx.org, input)),
  timeline: protectedProcedure
    .input(z.object({ lesionId: z.string().uuid() }))
    .query(({ ctx, input }) => lesionService.timeline(ctx.org, input.lesionId)),
});
