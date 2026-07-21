import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import type { AuditActor, UserRole } from "@/lib/enums";
import {
  findMembershipContext,
  findMirroredContext,
  upsertMembership,
  upsertOrganization,
  upsertUser,
} from "@/server/db/system-repo";

const PROTOTYPE_USER = "prototype_user";
const PROTOTYPE_ORG = "prototype_org";

// Cookie holding the simulated actor (a membershipId). No real auth — this is a
// showcase, so identity is a switchable persona, not a secure session.
export const ACTOR_COOKIE = "lumiscan_actor";

export type OrgContext = {
  userId: string;
  orgId: string;
  role: UserRole;
  membershipId: string;
  actorType: AuditActor;
  displayName: string;
  deviceId?: string;
};

export const getOrgContext = cache(async function getOrgContext(): Promise<OrgContext> {
  // Simulated persona: if the presenter picked one, act as that member.
  const actorId = (await cookies()).get(ACTOR_COOKIE)?.value;
  if (actorId) {
    const acting = await findMembershipContext(actorId);
    if (acting && acting.organization.clerkOrgId === PROTOTYPE_ORG) {
      return {
        userId: acting.user.id,
        orgId: acting.organization.id,
        role: acting.membership.role,
        membershipId: acting.membership.id,
        actorType: "USER",
        displayName: acting.user.displayName,
      };
    }
  }

  // Default identity: a single indexed read (no writes on the hot path).
  const existing = await findMirroredContext(PROTOTYPE_USER, PROTOTYPE_ORG);
  if (existing) {
    return {
      userId: existing.user.id,
      orgId: existing.organization.id,
      role: existing.membership.role,
      membershipId: existing.membership.id,
      actorType: "USER",
      displayName: existing.user.displayName,
    };
  }

  // Cold path (first boot or after a DB reset): mirror the default identity in.
  const organization = await upsertOrganization({
    clerkOrgId: PROTOTYPE_ORG,
    name: "Prototype Clinic",
    slug: "prototype-clinic",
  });
  const user = await upsertUser({
    clerkUserId: PROTOTYPE_USER,
    email: "e.reyes@prototype.clinic",
    displayName: "Dr. Elena Reyes",
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
    displayName: user.displayName,
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
    displayName: "Device",
    deviceId: input.deviceId,
  };
}
