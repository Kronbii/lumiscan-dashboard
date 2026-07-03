import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { TRPCError } from "@trpc/server";
import type { InsightKind } from "@/lib/enums";
import { uuidv7 } from "@/lib/id";
import { env } from "@/env";
import type { OrgContext } from "@/server/auth/org-context";
import { audit } from "@/server/audit/audit";
import { repo } from "@/server/db/scoped-repo";
import { buildDeidentifiedPayload, inputHash } from "@/server/ai/deidentify";
import {
  GUARDRAIL_SYSTEM_PROMPT,
  PROMPT_VERSION,
  insightJsonSchemas,
  insightTaskPrompts,
} from "@/server/ai/prompts";

type ClaudeMessage = {
  content?: Array<{ type?: string; text?: string }>;
};

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const modelByKind: Record<InsightKind, string> = {
  PATIENT_EXPLANATION: "claude-haiku-4-5",
  CLINICAL_SUMMARY: "claude-opus-4-8",
  EVOLUTION_NARRATIVE: "claude-opus-4-8",
};

function fakeContent(kind: InsightKind, payload: unknown) {
  if (kind === "PATIENT_EXPLANATION") {
    return {
      headline: "Recorded scan result summary",
      whatThisMeans:
        "The stored device result has been summarized for clinician review.",
      aboutConfidence:
        "The confidence score belongs to the stated recorded label and is not a clinical probability.",
      nextSteps: "Review the scan and follow the clinic's follow-up process.",
      disclaimer:
        "This narrative is decision support only and is not a diagnosis.",
      payloadEchoHash: inputHash(payload),
    };
  }
  if (kind === "CLINICAL_SUMMARY") {
    return {
      summary: "Stored scan classification and metrics were reviewed.",
      notableFindings: ["Review metric values and image quality in context."],
      abcdeFlags: ["Evolution requires comparison with prior scans."],
      confidenceInterpretation:
        "Confidence is tied to the recorded label, not a cancer probability.",
      considerations: ["Use clinician judgment for management decisions."],
      disclaimer:
        "This narrative is decision support only and is not a diagnosis.",
      payloadEchoHash: inputHash(payload),
    };
  }
  return {
    overview: "The scan series was reviewed for interval change.",
    metricTrends: [
      {
        metric: "diameter_mm",
        direction: "review",
        note: "Assess interval measurements and scale comparability.",
      },
    ],
    classificationTrend:
      "The narrative describes stored labels only and does not create a new risk label.",
    narrative:
      "Review the elapsed-day changes together with image quality and clinical context.",
    disclaimer: "This narrative is decision support only and is not a diagnosis.",
    payloadEchoHash: inputHash(payload),
  };
}

function parseClaudeJson(message: ClaudeMessage) {
  const text = message.content?.find((part) => part.type === "text")?.text;
  if (!text) {
    throw new Error("Claude response did not include text JSON.");
  }
  return JSON.parse(text) as unknown;
}

async function callClaude(kind: InsightKind, payload: unknown) {
  if (
    env.ANTHROPIC_API_KEY.includes("replace_me") ||
    env.ANTHROPIC_API_KEY.endsWith("_ci") ||
    env.ANTHROPIC_API_KEY === "sk-ant-ci"
  ) {
    return fakeContent(kind, payload);
  }

  const model = modelByKind[kind];
  const body = {
    model,
    max_tokens:
      kind === "PATIENT_EXPLANATION"
        ? 600
        : kind === "CLINICAL_SUMMARY"
          ? 1200
          : 1500,
    system: [
      {
        type: "text",
        text: GUARDRAIL_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          task: insightTaskPrompts[kind],
          payload,
        }),
      },
    ],
    ...(kind === "PATIENT_EXPLANATION"
      ? {}
      : {
          thinking: { type: "adaptive" },
        }),
    output_config: {
      ...(kind === "PATIENT_EXPLANATION" ? {} : { effort: "medium" }),
      format: {
        type: "json_schema",
        schema: insightJsonSchemas[kind],
      },
    },
  };

  if (kind === "EVOLUTION_NARRATIVE") {
    const stream = await (
      client.messages as unknown as {
        stream: (input: unknown) => Promise<{ finalMessage: () => Promise<ClaudeMessage> }>;
      }
    ).stream(body);
    return parseClaudeJson(await stream.finalMessage());
  }

  const message = await (
    client.messages as unknown as {
      create: (input: unknown) => Promise<ClaudeMessage>;
    }
  ).create(body);
  return parseClaudeJson(message);
}

export async function generateInsight(
  ctx: OrgContext,
  input: {
    subjectType: "SCAN" | "LESION";
    subjectId: string;
    kind: InsightKind;
  },
) {
  const deidentified = await buildDeidentifiedPayload(ctx, input);
  const hash = inputHash(deidentified.payload);
  const model = modelByKind[input.kind];
  const scoped = repo(ctx);

  const cached = await scoped.insights.findCache({
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    kind: input.kind,
    inputHash: hash,
    promptVersion: PROMPT_VERSION,
    model,
  });
  if (cached) return cached;

  const insightId = uuidv7();
  try {
    const content = await callClaude(input.kind, deidentified.payload);
    await scoped.insights.supersedeCurrent({
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      kind: input.kind,
      supersededById: insightId,
    });
    const insight = await scoped.insights.insert({
      id: insightId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      patientId: deidentified.patientId,
      kind: input.kind,
      model,
      promptVersion: PROMPT_VERSION,
      inputHash: hash,
      content,
      status: "COMPLETED",
    });
    await audit(ctx, {
      action: "insight.generate",
      resourceType: "ai_insight",
      resourceId: insight.id,
      metadata: { kind: input.kind, subjectType: input.subjectType },
    });
    return insight;
  } catch (error) {
    await scoped.insights.insert({
      id: insightId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      patientId: deidentified.patientId,
      kind: input.kind,
      model,
      promptVersion: PROMPT_VERSION,
      inputHash: hash,
      content: {
        error: error instanceof Error ? error.name : "UnknownError",
      },
      status: "FAILED",
    });
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Insight generation failed. The clinical workflow was not changed.",
    });
  }
}
