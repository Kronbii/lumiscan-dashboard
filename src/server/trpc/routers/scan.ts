import { z } from "zod";
import { createFinalizedScanSchema } from "@/lib/schemas/scan";
import { repo } from "@/server/db/scoped-repo";
import { createFinalizedScan } from "@/server/services/scan-write";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

export const scanRouter = createTRPCRouter({
  listByLesion: protectedProcedure
    .input(z.object({ lesionId: z.string().uuid() }))
    .query(({ ctx, input }) => repo(ctx.org).scans.listByLesion(input.lesionId)),
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => repo(ctx.org).scans.getById(input.id)),
  createFinalized: protectedProcedure
    .input(createFinalizedScanSchema)
    .mutation(({ ctx, input }) => createFinalizedScan(input, ctx.org)),
});
