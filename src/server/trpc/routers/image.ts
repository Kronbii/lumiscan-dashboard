import { z } from "zod";
import { imagePresignPayloadSchema } from "@/lib/schemas/ingest";
import { scanImageInputSchema } from "@/lib/schemas/scan";
import { repo } from "@/server/db/scoped-repo";
import {
  createUploadUrl,
  getSignedViewUrlForObjectKey,
} from "@/server/storage/presign";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

export const imageRouter = createTRPCRouter({
  getUploadUrl: protectedProcedure
    .input(imagePresignPayloadSchema.extend({ patientId: z.string().uuid().optional() }))
    .mutation(({ ctx, input }) => createUploadUrl(ctx.org, input)),
  attachToScan: protectedProcedure
    .input(z.object({ scanId: z.string().uuid(), image: scanImageInputSchema }))
    .mutation(({ ctx, input }) => repo(ctx.org).scans.attachImage(input)),
  getViewUrl: protectedProcedure
    .input(z.object({ imageId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const image = await repo(ctx.org).scans.getImage(input.imageId);
      return getSignedViewUrlForObjectKey(ctx.org, image.objectKey);
    }),
});
