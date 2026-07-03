export const classificationLabels = [
  "BENIGN",
  "SUSPICIOUS",
  "MALIGNANT",
  "INCONCLUSIVE",
] as const;
export type ClassificationLabel = (typeof classificationLabels)[number];

export const userRoles = ["OWNER", "ADMIN", "DOCTOR", "NURSE"] as const;
export type UserRole = (typeof userRoles)[number];

export const managementStatuses = [
  "MONITORING",
  "BIOPSY_RECOMMENDED",
  "REFERRED",
  "RESOLVED",
] as const;
export type ManagementStatus = (typeof managementStatuses)[number];

export const scanSources = ["MANUAL", "DEVICE"] as const;
export type ScanSource = (typeof scanSources)[number];

export const scanStatuses = ["DRAFT", "FINALIZED"] as const;
export type ScanStatus = (typeof scanStatuses)[number];

export const metricsScales = [
  "DERMOSCOPE",
  "RULER_REF",
  "CLINICIAN_MEASURED",
  "UNCALIBRATED",
] as const;
export type MetricsScale = (typeof metricsScales)[number];

export const imageTypes = ["DERMOSCOPIC", "CLINICAL", "OTHER"] as const;
export type ImageType = (typeof imageTypes)[number];

export const insightSubjects = ["SCAN", "LESION"] as const;
export type InsightSubject = (typeof insightSubjects)[number];

export const insightKinds = [
  "PATIENT_EXPLANATION",
  "CLINICAL_SUMMARY",
  "EVOLUTION_NARRATIVE",
] as const;
export type InsightKind = (typeof insightKinds)[number];

export const insightStatuses = ["PENDING", "COMPLETED", "FAILED"] as const;
export type InsightStatus = (typeof insightStatuses)[number];

export const ingestionStatuses = [
  "RECEIVED",
  "AUTO_MATCHED",
  "NEEDS_RECONCILIATION",
  "FAILED",
] as const;
export type IngestionStatus = (typeof ingestionStatuses)[number];

export const deviceStatuses = ["ACTIVE", "REVOKED"] as const;
export type DeviceStatus = (typeof deviceStatuses)[number];

export const auditActors = ["USER", "DEVICE", "SYSTEM"] as const;
export type AuditActor = (typeof auditActors)[number];

export const bodySides = ["LEFT", "RIGHT", "MIDLINE", "UNSPECIFIED"] as const;
export type BodySide = (typeof bodySides)[number];

export const bodyRegions = [
  "HEAD",
  "NECK",
  "CHEST",
  "ABDOMEN",
  "UPPER_BACK",
  "LOWER_BACK",
  "LEFT_ARM",
  "RIGHT_ARM",
  "LEFT_LEG",
  "RIGHT_LEG",
  "LEFT_HAND",
  "RIGHT_HAND",
  "LEFT_FOOT",
  "RIGHT_FOOT",
  "OTHER",
] as const;
export type BodyRegion = (typeof bodyRegions)[number];

export const classificationColor = {
  BENIGN: "green",
  SUSPICIOUS: "amber",
  MALIGNANT: "red",
  INCONCLUSIVE: "grey",
} as const satisfies Record<ClassificationLabel, "green" | "amber" | "red" | "grey">;

export function isFlaggedLabel(label: ClassificationLabel | null | undefined) {
  return label === "SUSPICIOUS" || label === "MALIGNANT";
}
