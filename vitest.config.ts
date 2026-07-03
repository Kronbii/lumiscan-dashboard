import { defineConfig } from "vitest/config";

process.env.DATABASE_URL ??= "postgres://lumiscan:lumiscan@localhost:5432/lumiscan";
process.env.CLERK_SECRET_KEY ??= "sk_test_vitest";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??=
  "pk_test_YWxpdmUtYmFzcy0yOS5jbGVyay5hY2NvdW50cy5kZXYk";
process.env.CLERK_WEBHOOK_SIGNING_SECRET ??= "whsec_vitest";
process.env.S3_ENDPOINT ??= "http://localhost:9000";
process.env.S3_REGION ??= "us-east-1";
process.env.S3_BUCKET ??= "lumiscan-dev";
process.env.S3_ACCESS_KEY_ID ??= "minioadmin";
process.env.S3_SECRET_ACCESS_KEY ??= "minioadmin";
process.env.ANTHROPIC_API_KEY ??= "sk-ant-ci";
process.env.APP_URL ??= "http://localhost:3000";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "server-only": new URL("./tests/server-only-mock.ts", import.meta.url)
        .pathname,
    },
  },
});
