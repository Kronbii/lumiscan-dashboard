import { TRPCError } from "@trpc/server";
import type { UserRole } from "@/lib/enums";
import type { OrgContext } from "@/server/auth/org-context";

export function requireRole(ctx: OrgContext, allowed: readonly UserRole[]) {
  if (!allowed.includes(ctx.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your role does not allow this action.",
    });
  }
}

export function canMutateManagement(role: UserRole) {
  return role === "OWNER" || role === "ADMIN" || role === "DOCTOR";
}

export function canManageOrg(role: UserRole) {
  return role === "OWNER" || role === "ADMIN";
}
