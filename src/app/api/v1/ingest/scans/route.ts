import { deviceIngestPayloadSchema } from "@/lib/schemas/ingest";
import { ingestErrorResponse } from "@/server/http/ingest-error";
import { authenticateDeviceKey } from "@/server/services/device";
import { ingestionService } from "@/server/services/ingestion";

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
    return ingestErrorResponse(error);
  }
}
