import "server-only";

import { cache } from "react";
import type { AuditActor, UserRole } from "@/lib/enums";
import {
  findMirroredContext,
  upsertMembership,
  upsertOrganization,
  upsertUser,
} from "@/server/db/system-repo";

const PROTOTYPE_USER = "prototype_user";
const PROTOTYPE_ORG = "prototype_org";

export type OrgContext = {
  userId: string;
  orgId: string;
  role: UserRole;
  membershipId: string;
  actorType: AuditActor;
  deviceId?: string;
};

export const getOrgContext = cache(async function getOrgContext(): Promise<OrgContext> {
  // Hot path: the prototype identity already exists, so a single indexed read
  // replaces the three upsert writes that used to run on every request.
  const existing = await findMirroredContext(PROTOTYPE_USER, PROTOTYPE_ORG);
  if (existing) {
    return {
      userId: existing.user.id,
      orgId: existing.organization.id,
      role: existing.membership.role,
      membershipId: existing.membership.id,
      actorType: "USER",
    };
  }

  // Cold path (first boot or after a DB reset): mirror the prototype identity in.
  const organization = await upsertOrganization({
    clerkOrgId: PROTOTYPE_ORG,
    name: "Prototype Clinic",
    slug: "prototype-clinic",
  });
  const user = await upsertUser({
    clerkUserId: PROTOTYPE_USER,
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
});

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
