import { initTRPC } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { getOrgContext, type OrgContext } from "@/server/auth/org-context";

export async function createTRPCContext({ req }: FetchCreateContextFnOptions) {
  return {
    headers: req.headers,
  };
}

const t = initTRPC.context<typeof createTRPCContext extends (...args: never) => infer R ? Awaited<R> : never>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const org: OrgContext = await getOrgContext();
  return next({
    ctx: {
      ...ctx,
      org,
    },
  });
});
