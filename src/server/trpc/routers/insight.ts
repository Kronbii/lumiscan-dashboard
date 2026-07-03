import { z } from "zod";
import { insightKinds, insightSubjects } from "@/lib/enums";
import { requireRole } from "@/server/auth/require-role";
import { repo } from "@/server/db/scoped-repo";
import { generateInsight } from "@/server/ai/insights";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

const insightInput = z.object({
  subjectType: z.enum(insightSubjects),
  subjectId: z.string().uuid(),
  kind: z.enum(insightKinds),
});

export const insightRouter = createTRPCRouter({
  getCurrent: protectedProcedure.input(insightInput).query(({ ctx, input }) =>
    repo(ctx.org).insights.getCurrent({
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      kind: input.kind,
    }),
  ),
  generate: protectedProcedure.input(insightInput).mutation(({ ctx, input }) => {
    requireRole(ctx.org, ["OWNER", "ADMIN", "DOCTOR"]);
    return generateInsight(ctx.org, input);
  }),
});
