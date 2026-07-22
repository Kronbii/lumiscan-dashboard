import { TRPCError } from "@trpc/server";
import { imagePresignPayloadSchema } from "@/lib/schemas/ingest";
import { createDeviceOrgContext } from "@/server/auth/org-context";
import { repo } from "@/server/db/scoped-repo";
import { ingestErrorResponse } from "@/server/http/ingest-error";
import { authenticateDeviceKey } from "@/server/services/device";
import { createUploadUrl } from "@/server/storage/presign";

export async function POST(req: Request) {
  try {
    const device = await authenticateDeviceKey(req.headers.get("authorization"));
    const payload = imagePresignPayloadSchema.parse(await req.json());
    const ctx = createDeviceOrgContext({
      orgId: device.orgId,
      deviceId: device.id,
    });

    // A device that only knows the patient's MRN (no lesionId) can still upload:
    // resolve the patient here so createUploadUrl can build a lesion_pending path.
    // The scan POST later attaches the image to the matched lesion.
    let patientId: string | undefined;
    if (!payload.lesionId && payload.mrn) {
      const patient = await repo(ctx).patients.findByMrn(payload.mrn);
      if (!patient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No patient with that MRN." });
      }
      patientId = patient.id;
    }

    return Response.json(await createUploadUrl(ctx, { ...payload, patientId }));
  } catch (error) {
    return ingestErrorResponse(error);
  }
}
