import "server-only";

import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";

/*
  Uniform error envelope for the device-ingestion REST API.

  A misconfigured device that sends a malformed payload gets a precise 400 that
  names the field that failed — not an opaque 500. That difference is what makes
  ESP32 firmware bring-up debuggable: the response tells you exactly what to fix.

    - ZodError      -> 400 VALIDATION_ERROR  { message, issues[] }
    - TRPCError     -> mapped status (401/404/429/400) with its message
    - anything else -> 500 INTERNAL (no internal detail leaked)
*/
export function ingestErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    const issues = error.issues.map((issue) => ({
      path: issue.path.join(".") || "(root)",
      message: issue.message,
    }));
    const first = issues[0];
    return Response.json(
      {
        error: {
          type: "VALIDATION_ERROR",
          message: first ? `${first.path}: ${first.message}` : "Invalid request payload.",
          issues,
        },
      },
      { status: 400 },
    );
  }

  // req.json() throws a SyntaxError on a malformed/truncated body — a common
  // symptom of a partial write or encoding slip from firmware. Answer with a
  // clear 400 instead of a 500 so the device sees "fix your body", not "server broke".
  if (error instanceof SyntaxError) {
    return Response.json(
      { error: { type: "BAD_REQUEST", message: "Malformed JSON body." } },
      { status: 400 },
    );
  }

  if (error instanceof TRPCError) {
    const status =
      error.code === "UNAUTHORIZED"
        ? 401
        : error.code === "NOT_FOUND"
          ? 404
          : error.code === "TOO_MANY_REQUESTS"
            ? 429
            : 400;
    return Response.json(
      { error: { type: error.code, message: error.message } },
      { status },
    );
  }

  return Response.json(
    { error: { type: "INTERNAL", message: "Internal server error." } },
    { status: 500 },
  );
}
