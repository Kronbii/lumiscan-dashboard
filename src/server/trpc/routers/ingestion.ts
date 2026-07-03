import { z } from "zod";
import { requireRole } from "@/server/auth/require-role";
import { repo } from "@/server/db/scoped-repo";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

export const ingestionRouter = createTRPCRouter({
  listEvents: protectedProcedure.query(({ ctx }) => {
    requireRole(ctx.org, ["OWNER", "ADMIN"]);
    return repo(ctx.org).ingestion.listEvents();
  }),
  reconcile: protectedProcedure
    .input(z.object({ ingestionEventId: z.string().uuid(), lesionId: z.string().uuid() }))
    .mutation(({ ctx }) => {
      requireRole(ctx.org, ["OWNER", "ADMIN"]);
      return { ok: true };
    }),
});
