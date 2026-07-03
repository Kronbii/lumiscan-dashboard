import { z } from "zod";
import {
  addManagementNoteSchema,
  setManagementStatusSchema,
} from "@/lib/schemas/management";
import { managementService } from "@/server/services/management";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

export const managementRouter = createTRPCRouter({
  getPlan: protectedProcedure
    .input(z.object({ lesionId: z.string().uuid() }))
    .query(({ ctx, input }) => managementService.getPlan(ctx.org, input.lesionId)),
  listNotes: protectedProcedure
    .input(z.object({ lesionId: z.string().uuid() }))
    .query(({ ctx, input }) => managementService.listNotes(ctx.org, input.lesionId)),
  setStatus: protectedProcedure
    .input(setManagementStatusSchema)
    .mutation(({ ctx, input }) => managementService.setStatus(ctx.org, input)),
  addNote: protectedProcedure
    .input(addManagementNoteSchema)
    .mutation(({ ctx, input }) => managementService.addNote(ctx.org, input)),
});
