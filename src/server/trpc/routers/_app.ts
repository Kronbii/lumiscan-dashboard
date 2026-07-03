import { createTRPCRouter } from "@/server/trpc/trpc";
import { dashboardRouter } from "@/server/trpc/routers/dashboard";
import { deviceRouter } from "@/server/trpc/routers/device";
import { imageRouter } from "@/server/trpc/routers/image";
import { ingestionRouter } from "@/server/trpc/routers/ingestion";
import { insightRouter } from "@/server/trpc/routers/insight";
import { lesionRouter } from "@/server/trpc/routers/lesion";
import { managementRouter } from "@/server/trpc/routers/management";
import { memberRouter } from "@/server/trpc/routers/member";
import { patientRouter } from "@/server/trpc/routers/patient";
import { scanRouter } from "@/server/trpc/routers/scan";

export const appRouter = createTRPCRouter({
  dashboard: dashboardRouter,
  device: deviceRouter,
  image: imageRouter,
  ingestion: ingestionRouter,
  insight: insightRouter,
  lesion: lesionRouter,
  management: managementRouter,
  member: memberRouter,
  patient: patientRouter,
  scan: scanRouter,
});

export type AppRouter = typeof appRouter;
