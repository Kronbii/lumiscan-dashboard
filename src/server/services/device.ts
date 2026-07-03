import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { OrgContext } from "@/server/auth/org-context";
import { requireRole } from "@/server/auth/require-role";
import { audit } from "@/server/audit/audit";
import { findDeviceByPrefix } from "@/server/db/system-repo";
import { repo } from "@/server/db/scoped-repo";
import type { Device } from "@/server/db/schema";

function hashDeviceKey(rawKey: string) {
  return createHash("sha256").update(rawKey).digest("hex");
}

function timingSafeEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function parseDeviceKey(value: string) {
  const token = value.replace(/^Bearer\s+/i, "").trim();
  const match = /^lsk_([a-f0-9]{8})_[A-Za-z0-9_-]{32,}$/.exec(token);
  if (!match) return null;
  return { rawKey: token, prefix: match[1]! };
}

export async function authenticateDeviceKey(authorization: string | null) {
  if (!authorization) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Missing device key." });
  }
  const parsed = parseDeviceKey(authorization);
  if (!parsed) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid device key." });
  }
  const device = await findDeviceByPrefix(parsed.prefix);
  if (!device || device.status !== "ACTIVE") {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid device key." });
  }
  if (!timingSafeEqualHex(hashDeviceKey(parsed.rawKey), device.apiKeyHash)) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid device key." });
  }
  return device;
}

export const deviceService = {
  list(ctx: OrgContext) {
    requireRole(ctx, ["OWNER", "ADMIN"]);
    return repo(ctx).devices.list();
  },

  async create(ctx: OrgContext, input: { name: string; serial: string }) {
    requireRole(ctx, ["OWNER", "ADMIN"]);
    const prefix = randomBytes(4).toString("hex");
    const secret = randomBytes(24).toString("base64url");
    const rawKey = `lsk_${prefix}_${secret}`;
    const device = await repo(ctx).devices.create({
      name: input.name,
      serial: input.serial,
      apiKeyPrefix: prefix,
      apiKeyHash: hashDeviceKey(rawKey),
    });
    await audit(ctx, {
      action: "device.create",
      resourceType: "device",
      resourceId: device.id,
    });
    return { device, rawKey };
  },

  async revoke(ctx: OrgContext, id: string) {
    requireRole(ctx, ["OWNER", "ADMIN"]);
    const device = await repo(ctx).devices.revoke(id);
    await audit(ctx, {
      action: "device.revoke",
      resourceType: "device",
      resourceId: device.id,
    });
    return device;
  },
};

export type AuthenticatedDevice = Device;
