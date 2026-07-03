import { and, eq } from "drizzle-orm";
import { uuidv7 } from "@/lib/id";
import type { AuditActor, UserRole } from "@/lib/enums";
import {
  auditLogs,
  devices,
  memberships,
  organizations,
  users,
  type Membership,
  type Organization,
  type User,
} from "@/server/db/schema";
import { db } from "@/server/db/client";

export async function findMirroredContext(
  clerkUserId: string,
  clerkOrgId: string,
): Promise<
  | {
      organization: Organization;
      user: User;
      membership: Membership;
    }
  | null
> {
  const [row] = await db
    .select({
      organization: organizations,
      user: users,
      membership: memberships,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.orgId))
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(organizations.clerkOrgId, clerkOrgId),
        eq(users.clerkUserId, clerkUserId),
        eq(memberships.status, "ACTIVE"),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function findOrganizationByClerkId(clerkOrgId: string) {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrgId, clerkOrgId))
    .limit(1);
  return organization ?? null;
}

export async function findDeviceByPrefix(apiKeyPrefix: string) {
  const [device] = await db
    .select()
    .from(devices)
    .where(eq(devices.apiKeyPrefix, apiKeyPrefix))
    .limit(1);
  return device ?? null;
}

export async function upsertOrganization(input: {
  id?: string;
  clerkOrgId: string;
  name: string;
  slug: string;
}) {
  const [organization] = await db
    .insert(organizations)
    .values({
      id: input.id ?? uuidv7(),
      clerkOrgId: input.clerkOrgId,
      name: input.name,
      slug: input.slug,
    })
    .onConflictDoUpdate({
      target: organizations.clerkOrgId,
      set: {
        name: input.name,
        slug: input.slug,
        updatedAt: new Date(),
      },
    })
    .returning();
  if (!organization) throw new Error("Organization upsert failed.");
  return organization;
}

export async function upsertUser(input: {
  id?: string;
  clerkUserId: string;
  email: string;
  displayName: string;
}) {
  const [user] = await db
    .insert(users)
    .values({
      id: input.id ?? uuidv7(),
      clerkUserId: input.clerkUserId,
      email: input.email,
      displayName: input.displayName,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: {
        email: input.email,
        displayName: input.displayName,
        updatedAt: new Date(),
      },
    })
    .returning();
  if (!user) throw new Error("User upsert failed.");
  return user;
}

export async function upsertMembership(input: {
  orgId: string;
  userId: string;
  role: UserRole;
  status?: string;
}) {
  const [membership] = await db
    .insert(memberships)
    .values({
      id: uuidv7(),
      orgId: input.orgId,
      userId: input.userId,
      role: input.role,
      status: input.status ?? "ACTIVE",
    })
    .onConflictDoUpdate({
      target: [memberships.orgId, memberships.userId],
      set: {
        role: input.role,
        status: input.status ?? "ACTIVE",
        updatedAt: new Date(),
      },
    })
    .returning();
  if (!membership) throw new Error("Membership upsert failed.");
  return membership;
}

export async function insertAuditLog(input: {
  orgId: string;
  actorType: AuditActor;
  actorUserId?: string | null;
  actorDeviceId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  ip?: string | null;
  userAgentHash?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    id: uuidv7(),
    orgId: input.orgId,
    actorType: input.actorType,
    actorUserId: input.actorUserId ?? null,
    actorDeviceId: input.actorDeviceId ?? null,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    ip: input.ip ?? null,
    userAgentHash: input.userAgentHash ?? null,
    metadata: input.metadata ?? {},
  });
}
