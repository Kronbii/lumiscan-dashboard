import { TRPCError } from "@trpc/server";
import { imagePresignPayloadSchema } from "@/lib/schemas/ingest";
import { createDeviceOrgContext } from "@/server/auth/org-context";
import { authenticateDeviceKey } from "@/server/services/device";
import { createUploadUrl } from "@/server/storage/presign";

function statusFor(error: unknown) {
  if (!(error instanceof TRPCError)) return 500;
  if (error.code === "UNAUTHORIZED") return 401;
  if (error.code === "TOO_MANY_REQUESTS") return 429;
  return 400;
}

export async function POST(req: Request) {
  try {
    const device = await authenticateDeviceKey(req.headers.get("authorization"));
    const payload = imagePresignPayloadSchema.parse(await req.json());
    const ctx = createDeviceOrgContext({
      orgId: device.orgId,
      deviceId: device.id,
    });
    return Response.json(await createUploadUrl(ctx, payload));
  } catch (error) {
    return Response.json(
      {
        error: {
          type: error instanceof TRPCError ? error.code : "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Invalid request.",
        },
      },
      { status: statusFor(error) },
    );
  }
}
