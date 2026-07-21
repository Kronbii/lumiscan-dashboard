import "server-only";

import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";
import { uuidv7 } from "@/lib/id";
import type { ImagePresignPayload } from "@/lib/schemas/ingest";
import type { OrgContext } from "@/server/auth/org-context";
import { repo } from "@/server/db/scoped-repo";

const allowedContentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const client = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

function extensionFor(contentType: string, fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp") {
    return ext === "jpg" ? "jpeg" : ext;
  }
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpeg";
}

export async function createUploadUrl(
  ctx: OrgContext,
  input: ImagePresignPayload & { patientId?: string },
) {
  if (!allowedContentTypes.has(input.contentType)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only JPEG, PNG, and WebP images are supported.",
    });
  }
  if (input.contentLength > 15 * 1024 * 1024) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Images must be 15MB or smaller.",
    });
  }

  let patientId = input.patientId;
  if (input.lesionId) {
    const lesion = await repo(ctx).lesions.getById(input.lesionId);
    patientId = lesion.patientId;
  }
  if (!patientId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A patient or lesion reference is required.",
    });
  }

  const ext = extensionFor(input.contentType, input.fileName);
  const objectKey = [
    `org_${ctx.orgId}`,
    `patient_${patientId}`,
    input.lesionId ? `lesion_${input.lesionId}` : "lesion_pending",
    `scan_${uuidv7()}`,
    `${uuidv7()}.${ext}`,
  ].join("/");

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: objectKey,
    ContentType: input.contentType,
  });

  return {
    objectKey,
    uploadUrl: await getSignedUrl(client, command, { expiresIn: 300 }),
    expiresInSeconds: 300,
  };
}

export async function getSignedViewUrlForObjectKey(
  ctx: OrgContext,
  objectKey: string,
) {
  if (!objectKey.startsWith(`org_${ctx.orgId}/`)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Image not found." });
  }

  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: objectKey,
  });
  return getSignedUrl(client, command, { expiresIn: 300 });
}

/*
  Stable, same-origin path the browser uses to load a stored scan image. The
  bytes are streamed by /api/scan-images and optimized to WebP by next/image —
  the object-storage endpoint is never exposed to the browser, so images work
  identically on localhost, over the LAN, and on a hosted deployment.
*/
export function scanImageProxyPath(objectKey: string) {
  return `/api/scan-images/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
}

/*
  Reads a scan image's bytes for the org-scoped proxy route. The org-prefix
  check (and a traversal guard) keep one clinic from reading another's objects.
*/
export async function getScanImageObject(ctx: OrgContext, objectKey: string) {
  if (objectKey.includes("..") || !objectKey.startsWith(`org_${ctx.orgId}/`)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Image not found." });
  }

  const response = await client.send(
    new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: objectKey }),
  );
  if (!response.Body) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Image not found." });
  }

  return {
    bytes: await response.Body.transformToByteArray(),
    contentType: response.ContentType ?? "application/octet-stream",
  };
}

export async function uploadClinicalImageFromFile(
  ctx: OrgContext,
  input: {
    lesionId: string;
    file: File;
  },
) {
  if (!allowedContentTypes.has(input.file.type)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only JPEG, PNG, and WebP images are supported.",
    });
  }
  if (input.file.size > 15 * 1024 * 1024) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Images must be 15MB or smaller.",
    });
  }

  const lesion = await repo(ctx).lesions.getById(input.lesionId);
  const bytes = Buffer.from(await input.file.arrayBuffer());
  const objectKey = [
    `org_${ctx.orgId}`,
    `patient_${lesion.patientId}`,
    `lesion_${lesion.id}`,
    `scan_${uuidv7()}`,
    `${uuidv7()}.${extensionFor(input.file.type, input.file.name)}`,
  ].join("/");

  await client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: objectKey,
      Body: bytes,
      ContentType: input.file.type,
    }),
  );

  return {
    objectKey,
    contentHash: createHash("sha256").update(bytes).digest("hex"),
  };
}
