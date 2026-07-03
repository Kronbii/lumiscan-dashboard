import "server-only";

import type { AuditActor, UserRole } from "@/lib/enums";
import {
  upsertMembership,
  upsertOrganization,
  upsertUser,
} from "@/server/db/system-repo";

export type OrgContext = {
  userId: string;
  orgId: string;
  role: UserRole;
  membershipId: string;
  actorType: AuditActor;
  deviceId?: string;
};

export async function getOrgContext(): Promise<OrgContext> {
  const organization = await upsertOrganization({
    clerkOrgId: "prototype_org",
    name: "Prototype Clinic",
    slug: "prototype-clinic",
  });
  const user = await upsertUser({
    clerkUserId: "prototype_user",
    email: "prototype@example.invalid",
    displayName: "Prototype Doctor",
  });
  const membership = await upsertMembership({
    orgId: organization.id,
    userId: user.id,
    role: "OWNER",
    status: "ACTIVE",
  });

  return {
    userId: user.id,
    orgId: organization.id,
    role: membership.role,
    membershipId: membership.id,
    actorType: "USER",
  };
}

export function createDeviceOrgContext(input: {
  orgId: string;
  deviceId: string;
}): OrgContext {
  return {
    userId: "00000000-0000-0000-0000-000000000000",
    orgId: input.orgId,
    role: "OWNER",
    membershipId: "00000000-0000-0000-0000-000000000000",
    actorType: "DEVICE",
    deviceId: input.deviceId,
  };
}
