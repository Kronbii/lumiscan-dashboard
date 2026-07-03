import { dashboardService } from "@/server/services/dashboard";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

export const dashboardRouter = createTRPCRouter({
  overview: protectedProcedure.query(({ ctx }) => dashboardService.overview(ctx.org)),
});
