import "server-only";

import { createHash } from "node:crypto";
import type { OrgContext } from "@/server/auth/org-context";
import { insertAuditLog } from "@/server/db/system-repo";

const allowedMetadataKeys = new Set([
  "count",
  "status",
  "source",
  "kind",
  "subjectType",
  "idempotencyKey",
]);

function redactMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return {};
  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => allowedMetadataKeys.has(key)),
  );
}

export function hashUserAgent(value: string | null | undefined) {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex");
}

export async function audit(
  ctx: OrgContext,
  input: {
    action: string;
    resourceType: string;
    resourceId: string;
    ip?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await insertAuditLog({
    orgId: ctx.orgId,
    actorType: ctx.actorType,
    actorUserId: ctx.actorType === "USER" ? ctx.userId : null,
    actorDeviceId: ctx.actorType === "DEVICE" ? ctx.deviceId ?? null : null,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    ip: input.ip ?? null,
    userAgentHash: hashUserAgent(input.userAgent),
    metadata: redactMetadata(input.metadata),
  });
}
