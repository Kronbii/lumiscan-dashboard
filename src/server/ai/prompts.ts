import type { InsightKind } from "@/lib/enums";

const baseGuardrail = `
You are Lumiscan's clinical narrative assistant. You do not diagnose cancer.
You do not override, relabel, reinterpret, or compete with the device
classification. You summarize already-stored scan outputs for clinician review.
Use careful decision-support language. Refer to the stored label as a device
classification or recorded result, not a diagnosis. Never describe confidence as
a clinical probability. Mention that confidence is confidence in the stated
recorded label. Recommend clinician judgment and appropriate follow-up. Output
only valid JSON that matches the requested schema. Every output must include a
clear non-diagnostic disclaimer. Inputs have already been de-identified; do not
ask for names, MRNs, dates of birth, addresses, contact data, or image bytes.
Avoid creating any triage category or attention level that could drive UI color.
`;

export const GUARDRAIL_SYSTEM_PROMPT = `${baseGuardrail}\n${baseGuardrail.repeat(80)}`;

export const PROMPT_VERSION = "lumiscan-insights-2026-07-03";

export const insightTaskPrompts: Record<InsightKind, string> = {
  PATIENT_EXPLANATION:
    "Write a patient-friendly explanation of this single scan using plain language.",
  CLINICAL_SUMMARY:
    "Write a concise clinician-facing summary of this single scan's stored metrics and classification.",
  EVOLUTION_NARRATIVE:
    "Write a clinician-facing evolution narrative across the scan series. Discuss change over elapsed days.",
};

export const insightJsonSchemas = {
  PATIENT_EXPLANATION: {
    type: "object",
    required: [
      "headline",
      "whatThisMeans",
      "aboutConfidence",
      "nextSteps",
      "disclaimer",
    ],
    properties: {
      headline: { type: "string" },
      whatThisMeans: { type: "string" },
      aboutConfidence: { type: "string" },
      nextSteps: { type: "string" },
      disclaimer: { type: "string" },
    },
    additionalProperties: false,
  },
  CLINICAL_SUMMARY: {
    type: "object",
    required: [
      "summary",
      "notableFindings",
      "abcdeFlags",
      "confidenceInterpretation",
      "considerations",
      "disclaimer",
    ],
    properties: {
      summary: { type: "string" },
      notableFindings: { type: "array", items: { type: "string" } },
      abcdeFlags: { type: "array", items: { type: "string" } },
      confidenceInterpretation: { type: "string" },
      considerations: { type: "array", items: { type: "string" } },
      disclaimer: { type: "string" },
    },
    additionalProperties: false,
  },
  EVOLUTION_NARRATIVE: {
    type: "object",
    required: [
      "overview",
      "metricTrends",
      "classificationTrend",
      "narrative",
      "disclaimer",
    ],
    properties: {
      overview: { type: "string" },
      metricTrends: {
        type: "array",
        items: {
          type: "object",
          required: ["metric", "direction", "note"],
          properties: {
            metric: { type: "string" },
            direction: { type: "string" },
            note: { type: "string" },
          },
          additionalProperties: false,
        },
      },
      classificationTrend: { type: "string" },
      narrative: { type: "string" },
      disclaimer: { type: "string" },
    },
    additionalProperties: false,
  },
} as const;
