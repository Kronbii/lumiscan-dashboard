import { z } from "zod";
import { deviceService } from "@/server/services/device";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

export const deviceRouter = createTRPCRouter({
  list: protectedProcedure.query(({ ctx }) => deviceService.list(ctx.org)),
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), serial: z.string().min(1) }))
    .mutation(({ ctx, input }) => deviceService.create(ctx.org, input)),
  revoke: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => deviceService.revoke(ctx.org, input.id)),
});
