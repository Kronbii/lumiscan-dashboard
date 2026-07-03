import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";
import { requireRole } from "@/server/auth/require-role";

export const memberRouter = createTRPCRouter({
  list: protectedProcedure.query(({ ctx }) => {
    requireRole(ctx.org, ["OWNER", "ADMIN"]);
    return [];
  }),
});
