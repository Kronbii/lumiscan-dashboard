import { TRPCError } from "@trpc/server";
import { deviceIngestPayloadSchema } from "@/lib/schemas/ingest";
import { authenticateDeviceKey } from "@/server/services/device";
import { ingestionService } from "@/server/services/ingestion";

function statusFor(error: unknown) {
  if (!(error instanceof TRPCError)) return 500;
  if (error.code === "UNAUTHORIZED") return 401;
  if (error.code === "NOT_FOUND") return 404;
  if (error.code === "TOO_MANY_REQUESTS") return 429;
  return 400;
}

export async function POST(req: Request) {
  try {
    const idempotencyKey = req.headers.get("Idempotency-Key");
    if (!idempotencyKey) {
      return Response.json(
        { error: { type: "BAD_REQUEST", message: "Missing Idempotency-Key." } },
        { status: 400 },
      );
    }
    const device = await authenticateDeviceKey(req.headers.get("authorization"));
    const payload = deviceIngestPayloadSchema.parse(await req.json());
    const result = await ingestionService.ingestScan({
      device,
      idempotencyKey,
      payload,
    });
    return Response.json(result, { status: 200 });
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
