# Lumiscan Dashboard — Implementation Plan

**This document is the single source of truth.** It is written to be executed **cold** across multiple sessions by different coding agents that share no memory. Before starting any milestone: read Section 2 (Locked Decisions), Section 4 (Data Model), and Section 8 (Cross-Cutting Conventions). Then execute milestones in order. Where a choice was already made, it is locked — do not re-decide it. Rejected alternatives are listed in Section 2.10 so no agent reintroduces them.

> **How to use this doc:** open it, read the locked decisions + the one milestone you're assigned, execute it, check the acceptance criteria, append a Progress Log entry (Section 8), stop.

---

## 1. Context & Goal

**Why we're building this.** "Lumiscan" is a physical, ESP32-based device (a prototype owned by the product owner) that scans skin moles/lesions, classifies them cancer vs. benign, and outputs a confidence score plus detailed metrics and AI insights. The device is sold to doctors, clinics, and hospitals — but a device alone isn't a product. Those buyers need a **platform to manage patients and track lesions over time**: to see whether a mole is getting worse across scans, to store results, to manage follow-up when a lesion is flagged, and to get readable summaries. This web app is that platform.

**What we build now (MVP).** The smallest end-to-end slice a doctor can demo on real, manually-entered data: sign up → create org → add patient → add lesion → record two scans (image + classification + metrics) → open the lesion timeline and see both scans with metric trends → generate an AI insight → because one scan is flagged, write a follow-up note. All strictly scoped to the doctor's own organization and invisible to any other org. **Manual entry is the MVP data path and the permanent backup/testing path.** The ESP32 device-ingestion API is **designed and stubbed now** (endpoint, auth model, payload schema, tests, a simulate script) but device firmware is out of scope and live ingestion is deferred.

**Two hard constraints shape everything.** (1) **PHI multi-tenancy** — the dominant risk is cross-tenant patient-data leakage, and PHI leaking into logs/URLs/the LLM; the architecture must make the safe path the only path. (2) **Cold execution by independent agents** — every choice is locked and conventions are mechanical, so agents building different milestones in different sessions produce one coherent codebase, not three.

**Confirmed with the product owner:** multi-tenant SaaS (clinics/hospitals/solo doctors each isolated); classification runs externally (app stores results, never runs ML); app also generates its own LLM narratives; full backend + DB; basic security now, HIPAA/GDPR designed-for-later; MVP end state. Stack decisions (Next.js + tRPC + Drizzle + Clerk; Vercel + Neon + R2) were explicitly confirmed. The device-ingestion contract is greenfield (we define it).

---

## 2. Recommended Architecture

One coherent stack. Each decision is LOCKED.

| Layer | LOCKED decision | Rationale |
|---|---|---|
| **Frontend** | Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind v4 · shadcn/ui · TanStack Table · Recharts | Auth-gated SSR + colocated data fetching + one deployable; keeps PHI server-side by default. |
| **Backend/runtime** | One Next.js Node server (`output: 'standalone'`), Node 22 LTS runtime (**not** Edge) | Needs Postgres/S3/Anthropic drivers; one device endpoint doesn't justify a second backend. |
| **UI API** | tRPC v11 at `/api/trpc/*` | End-to-end TS types, no codegen, client+server share the repo. |
| **Device API** | Versioned REST at `POST /api/v1/ingest/*`, hashed device-key auth + idempotency (stubbed, real code) | Firmware needs a stable, language-agnostic contract; tRPC is wrong for embedded clients. |
| **Both API surfaces** | Thin adapters over `src/server/services/*` | Manual entry and device ingestion write through the **same** service functions; they differ only in `ctx.actor`. |
| **Database** | PostgreSQL 15+ | Relational org→patient→lesion→scan graph, strong FKs, JSONB for variable metrics, mature RLS. |
| **ORM/migrations** | Drizzle ORM + plain-SQL migrations (`drizzle-kit`) | SQL-first, no query-engine binary (clean serverless), readable migrations, trivial `SET LOCAL` for RLS. |
| **Tenant isolation** | App-layer org scoping (**primary, MVP**) via a scoped repository + ESLint ban on raw DB access; Postgres RLS (**defense-in-depth, added in M11**) | Belt-and-suspenders for PHI. App scoping ships first; RLS is milestone-gated so serverless connection plumbing is done once. |
| **Auth & multi-tenancy** | **Clerk Organizations** (roles: `owner`/`admin`/`doctor`/`nurse`); identity mirrored into our `users`/`memberships` tables via webhook | Orgs + memberships + org-scoped roles + email invites are first-class — the biggest build-time saving. Clerk holds **only identity**; no clinical PHI leaves our Postgres/S3. Swap seam = the `OrgContext` resolver. |
| **Image storage** | S3-compatible via `@aws-sdk/client-s3` with configurable `endpoint`; **Cloudflare R2 (MVP) → AWS S3 under BAA (later)**; private bucket; presigned PUT/GET only; key prefix `org_{orgId}/…` | Images are PHI — never in Postgres, never public. Tenant scoping is structural in the key; R2→S3 is a config swap. |
| **LLM integration** | `@anthropic-ai/sdk`, server-side only, single module `src/server/ai/insights.ts`. Model tiering: `claude-haiku-4-5` for patient-friendly explanation, `claude-opus-4-8` for doctor summary + evolution narrative. **Narratives only — never classification.** | Classification is external; the LLM narrates stored results. (Verified against the claude-api reference on 2026-07-01 — see M7.) |
| **Hosting (MVP)** | Vercel + Neon (serverless Postgres) + Cloudflare R2 + Clerk + Anthropic API | Least infra to demo the golden path; preview deploy per PR. |
| **Hosting (compliance-later)** | AWS Fargate/App Runner + RDS/Aurora (BAA) + S3 (BAA) — config/provider swaps, not a rewrite | `output: 'standalone'` container from day one; no Vercel-only primitives in the hot path. |
| **Tooling** | pnpm (corepack-pinned) · Node 22 (`.nvmrc` + `engines`) · TS strict + `noUncheckedIndexedAccess` · Zod shared schemas · `@t3-oss/env-nextjs` for env validation · Vitest · Playwright · ESLint (`no-restricted-imports` bans raw DB) · Prettier · GitHub Actions | App refuses to boot on bad env; tenant isolation is asserted, not assumed; raw-DB ban is mechanical. |

### 2.9 LOCKED CONVENTIONS (every agent must follow)

**Naming.** DB: `snake_case`, singular table names (`patient`, `scan`, `ai_insight`); enum type names `snake_case`, values `UPPER_SNAKE`. TS: `camelCase` vars/functions, `PascalCase` types/components; Drizzle schema objects `camelCase` mapping to snake_case columns. Routes: kebab-case, IDs in path; authenticated clinical routes under `/app/*`.

**Primary keys.** `uuid` v7 (time-sortable), app-generated via a `uuidv7()` helper in `src/lib/id.ts`. Never expose sequential ints. Clerk's external IDs stored as opaque `text` columns alongside our uuid PKs.

**Tenant scoping (the single most important rule).** Every PHI-bearing table has a non-null `org_id uuid`, denormalized down every branch (patient→lesion→scan→children), immutable after insert, indexed with `org_id` leading. `org_id` is **always** derived server-side from the request's `OrgContext` (built from Clerk's `orgId`), **never** from a request body, query param, or client header. All PHI reads/writes go through the scoped repository (`src/server/db/scoped-repo.ts`); direct Drizzle client use in feature code is banned by ESLint. See Sections 4.7 and 8.

**Error handling.** tRPC throws `TRPCError`: `UNAUTHORIZED` (no session), `NOT_FOUND` (org mismatch or missing — never confirm another org's rows exist), `FORBIDDEN` (role denied), `BAD_REQUEST` (Zod). A cross-org access attempt returns `NOT_FOUND`, not `FORBIDDEN`. REST ingest returns `{ error: { type, message } }` with 400/401/404/409/429; idempotency replays return the original result with 200. UI renders loading, empty, and permission-denied (clean 403 card) on every data surface — no blank pages, no raw stack traces to the client.

**What is PHI (treat as sensitive everywhere).** `patient.first_name, last_name, date_of_birth, mrn, email, phone, address, notes`; `scan_image.object_key` + the image bytes; `lesion.body_region, body_side, body_location_note, description`; `management_note.body`; any classification tied to an identifiable patient. URLs carry only opaque UUIDs. Logging goes through one wrapper with a redaction allowlist (Section 8).

### 2.10 Explicitly rejected — do NOT reintroduce

NestJS · Prisma · self-hosted JWT/Lucia/Auth.js sessions · REST-for-the-UI · Edge runtime · schema-per-tenant / db-per-tenant · Supabase Auth · blanket-Opus for all insights (use tiering) · storing images in Postgres · public buckets · reading `org_id` from the client · an LLM-produced discrete triage/risk label that drives UI color (Section 6).

---

## 3. Repository / Folder Structure

```
lumiscan-dashboard/
├── .env.example                      # committed; every required var documented
├── .nvmrc                            # 22
├── package.json                      # engines.node ">=22", packageManager pnpm@…
├── drizzle.config.ts
├── docker-compose.yml                # local Postgres (+ MinIO for S3-compatible dev)
├── next.config.ts                    # output: 'standalone'
├── vitest.config.ts   playwright.config.ts   eslint.config.mjs
├── docs/device-ingestion-api.md      # the firmware team's reference contract
├── drizzle/                          # generated plain-SQL migrations (checked in)
├── scripts/
│   ├── seed.ts                       # idempotent demo data
│   └── simulate-device.ts            # exercises /api/v1/ingest against the shared write path
└── src/
    ├── env.ts                        # @t3-oss/env-nextjs — refuses to boot on bad env
    ├── lib/
    │   ├── id.ts                     # uuidv7()
    │   ├── enums.ts                  # single canonical enum source (Section 4.2)
    │   └── schemas/                  # Zod: scan.ts, patient.ts, lesion.ts, metrics.ts, ingest.ts …
    ├── server/
    │   ├── db/{client.ts, schema.ts, scoped-repo.ts}   # client import banned outside db/*
    │   ├── auth/{org-context.ts, require-role.ts}
    │   ├── audit/audit.ts
    │   ├── storage/presign.ts
    │   ├── ai/{insights.ts, deidentify.ts, prompts.ts} # only place @anthropic-ai/sdk is imported
    │   ├── services/                 # business logic; both API surfaces call these
    │   │   ├── scan-write.ts         # createFinalizedScan(input, ctx) — manual + device
    │   │   └── patient.ts lesion.ts management.ts device.ts ingestion.ts dashboard.ts
    │   └── trpc/{trpc.ts, routers/*}
    └── app/
        ├── (public)/                 # /, /login, /signup, /accept-invite
        ├── onboarding/               # create-org, invite
        ├── app/                      # authenticated clinical UI (Section 6.4)
        └── api/
            ├── trpc/[trpc]/route.ts
            ├── webhooks/clerk/route.ts   # mirror identity into users/memberships
            └── v1/ingest/{scans/route.ts, images/presign/route.ts}
```

---

## 4. Data Model

All tables except global `user` carry `org_id` (denormalized down every branch, immutable after insert). Every table has `id uuid` (v7 PK), `created_at`, `updated_at`. PHI tables also have `deleted_at timestamptz null` (soft-delete, 4.3). Drizzle schema in `src/server/db/schema.ts`; enums in `src/lib/enums.ts`.

### 4.1 Entities & relationships

```
organization 1─* membership *─1 user        (user is global; belongs to orgs via membership)
organization 1─* patient 1─* lesion 1─* scan
scan 1─1 classification · scan 1─* scan_image · scan 1─* ai_insight
lesion 1─* ai_insight (evolution) · lesion 1─1 management_plan 1─* management_note
organization 1─* device 1─* scan (device_id nullable) · device/org 1─* ingestion_event
organization 1─* audit_log
```

**Key fields:**
- **organization** — `clerk_org_id text unique`, `name`, `slug`.
- **user** (global) — `clerk_user_id text unique`, `email`, `display_name`. No PHI, no `org_id`.
- **membership** — `org_id`, `user_id`, `role user_role`, `status`. Unique `(org_id, user_id)`.
- **patient** — `org_id`, PHI columns grouped for future column-encryption: `first_name, last_name, date_of_birth, mrn, email, phone, address, notes`. Unique MRN per org: `uq_patient_org_mrn (org_id, mrn) WHERE deleted_at IS NULL`.
- **lesion** — `org_id`, `patient_id`, `body_region body_region`, `body_side body_side` (**required** — laterality is core to re-finding the right mole), `body_location_note text` (**required** — precise free-text location, e.g. "4cm below spine of left scapula"), `body_map_x/y` (optional), `description`, `baseline_scan_id uuid null`, `current_risk classification_label null` (cache of latest finalized scan's label).
- **scan** — `org_id`, `lesion_id`, **`captured_at timestamptz` (the timeline axis — NOT `created_at`)**, `source scan_source` (`MANUAL`/`DEVICE`), `status scan_status` (`DRAFT`/`FINALIZED`), provenance: `device_id null`, `recorded_by_user_id null`, `ingestion_event_id null`. **Finalized scans are immutable** (4.4).
- **classification** — 1:1 with scan. `label classification_label`, `confidence numeric(5,4)` (0–1), **`confidence_label classification_label`** (which label the confidence refers to — always store label+confidence together, 4.5), `metrics jsonb` (canonical shape in 4.6), `metrics_scale metrics_scale` (provenance/comparability; drives "partial data" flagging).
- **scan_image** — `org_id`, `scan_id`, `object_key text`, `image_type image_type`, `is_primary bool`, `content_hash text` (SHA-256), `width/height int null`. **1:many** — a scan may have multiple images (MVP timeline surfaces the primary; schema is not capped at one).
- **ai_insight** — `org_id`, polymorphic `subject_type insight_subject` (`SCAN`/`LESION`) + `subject_id uuid`, `patient_id`, `kind insight_kind`, `model text`, `prompt_version text`, `input_hash text` (SHA-256 of the exact de-identified payload — cache key + proof of what left the system), `content jsonb`, `status insight_status`, `created_by_user_id`, `superseded_by_id uuid null` (version chain). Partial-unique current row: `uq_insight_current (subject_type, subject_id, kind) WHERE superseded_by_id IS NULL AND status = 'COMPLETED'`.
- **management_plan** — `org_id`, `lesion_id` (1:1), `status management_status`. (Named "management/follow-up plan," **not** "treatment plan" — a screening device does not diagnose cancer.)
- **management_note** — `org_id`, `plan_id`, `body text`, `author_user_id`, `created_at`.
- **device** — `org_id`, `name`, `serial text unique`, `api_key_prefix text` (plaintext, for lookup), `api_key_hash text` (hashed secret; raw key shown once at creation), `status device_status`.
- **ingestion_event** — `org_id`, `device_id`, `idempotency_key text`, `raw_payload jsonb`, `status ingestion_status`, `resolved_scan_id uuid null`. Unique `uq_ingest_idem (device_id, idempotency_key)`.
- **audit_log** (append-only) — `org_id`, `actor_type audit_actor` (`USER`/`DEVICE`/`SYSTEM`), `actor_user_id null`, `actor_device_id null`, `action text`, `resource_type text`, `resource_id text`, `ip text null`, `user_agent_hash text null`, `metadata jsonb` (**IDs + non-sensitive context only — never PHI values**), `created_at`.

**Hot-path indexes (locked):**
- `ix_scan_lesion_captured (org_id, lesion_id, captured_at DESC) WHERE deleted_at IS NULL` — lesion timeline.
- `ix_patient_org_name (org_id, last_name, first_name) WHERE deleted_at IS NULL` — patient list.
- `ix_lesion_patient (org_id, patient_id) WHERE deleted_at IS NULL`.
- `uq_patient_org_mrn`, `uq_device_serial`, `uq_ingest_idem`, `uq_insight_current` as above.
- Every filtered FK column also carries an `org_id`-leading index.

### 4.2 Canonical enums (single source of truth — `src/lib/enums.ts` + Postgres enum types; no other definitions)

- **`classification_label`**: `BENIGN` · `SUSPICIOUS` · `MALIGNANT` · `INCONCLUSIVE`. **UI color map (locked):** BENIGN→green · SUSPICIOUS→amber · MALIGNANT→red · INCONCLUSIVE→grey. Manual form and device payload both use this exact enum.
- **`user_role`**: `OWNER` · `ADMIN` · `DOCTOR` · `NURSE`. UI vocab: "Org Admin"=OWNER/ADMIN, "Doctor"=DOCTOR, "Assistant"=NURSE. Signup creator = OWNER; solo doctor = an org of one holding OWNER.
- **`management_status`**: `MONITORING` · `BIOPSY_RECOMMENDED` · `REFERRED` · `RESOLVED`. (Management/follow-up framing — never asserts a cancer diagnosis.)
- **`scan_source`**: `MANUAL` · `DEVICE`. **`scan_status`**: `DRAFT` · `FINALIZED`.
- **`metrics_scale`**: `DERMOSCOPE` · `RULER_REF` · `CLINICIAN_MEASURED` · `UNCALIBRATED`.
- **`image_type`**: `DERMOSCOPIC` · `CLINICAL` · `OTHER`.
- **`insight_subject`**: `SCAN` · `LESION`. **`insight_kind`**: `PATIENT_EXPLANATION` · `CLINICAL_SUMMARY` · `EVOLUTION_NARRATIVE`. **`insight_status`**: `PENDING` · `COMPLETED` · `FAILED`.
- **`ingestion_status`**: `RECEIVED` · `AUTO_MATCHED` · `NEEDS_RECONCILIATION` · `FAILED`.
- **`device_status`**: `ACTIVE` · `REVOKED`. **`audit_actor`**: `USER` · `DEVICE` · `SYSTEM`.
- **`body_side`**: `LEFT` · `RIGHT` · `MIDLINE` · `UNSPECIFIED`. **`body_region`**: `HEAD, NECK, CHEST, ABDOMEN, UPPER_BACK, LOWER_BACK, LEFT_ARM, RIGHT_ARM, LEFT_LEG, RIGHT_LEG, LEFT_HAND, RIGHT_HAND, LEFT_FOOT, RIGHT_FOOT, OTHER`.

### 4.3 Soft-delete (the MVP mechanism)
PHI tables (`patient`, `lesion`, `scan`, `scan_image`, `management_plan`, `management_note`) carry `deleted_at`. All isolation/list indexes include `WHERE deleted_at IS NULL`; all scoped-repo reads filter `deleted_at IS NULL`. "Delete" in the UI = set `deleted_at`. Clinical/cancer history must not be destroyed. Hard purge is a compliance-later job.

### 4.4 Scan immutability
A `FINALIZED` scan's clinical fields (`captured_at`, `classification.label/confidence/metrics/metrics_scale`, images) are **immutable**. Corrections happen by recording a new scan (post-MVP: an explicit amendment record) — never in-place edits. `DRAFT` scans are editable until finalized. Enforced in the scan-write service.

### 4.5 Confidence semantics
`confidence` is confidence-in-the-stated-`confidence_label` and is an **uncalibrated model score, not a clinical probability**. Label + confidence are always shown together. Patient-facing LLM output must never restate confidence as a probability of being cancer-free.

### 4.6 Canonical metrics schema (`src/lib/schemas/metrics.ts`, validated by BOTH manual form and device payload)
`metrics` is JSONB (forward-compat). All fields individually optional so a sparse device payload still saves; a scan missing scale/diameter is excluded from trend lines and marked "partial data."
```jsonc
{
  "diameter_mm":               number,   // >= 0
  "asymmetry_score":           number,   // 0–10
  "border_irregularity_score": number,   // 0–10
  "color_variation_score":     number,   // 0–10
  "area_mm2":                   number,   // >= 0, optional
  "raw":                        object    // opaque device passthrough, not charted
}
```
Scores are **0–10**. **ABCDE "E" (Evolution)** is a *between-scan* view computed in the service layer from the ordered scan series — **NOT** a stored per-scan field. `metrics_scale` records how metrics were obtained; the timeline never silently plots incomparable scales on one axis.

### 4.7 Tenant-isolation rule (mechanical)
1. Every PHI table has non-null `org_id` (FK + `org_id`-leading index).
2. `OrgContext` (`{ userId, orgId, role, membershipId }`) is resolved per request in `src/server/auth/org-context.ts` from the Clerk session + the user's membership — **never from client input**. No membership in the requested org → `NOT_FOUND`.
3. All PHI access goes through `repo(ctx)` in `src/server/db/scoped-repo.ts`, which injects `org_id: ctx.orgId` into every `where` and every `create`; reads filter `deleted_at IS NULL`; single-row updates/deletes use an `(id, org_id)` predicate.
4. **Forbidden outside `db/*` (ESLint-enforced):** importing the raw Drizzle client; by-id lookups without an org filter; raw SQL touching PHI without `AND org_id = $1`; reading `org_id`/`orgId` from body/query/header for authorization.
5. Role checks are separate: `requireRole(ctx, [...])` runs after `OrgContext` on every mutating procedure.
6. RLS (`USING (org_id = current_setting('app.current_org')::uuid)` + `SET LOCAL` per request-transaction) is added in **M11**, not MVP — but `org_id` is on every table from M2 so it's additive.

---

## 5. API Surface

### 5.1 tRPC routers (`src/server/trpc/routers/*`)
All procedures receive `OrgContext`, call a service, and validate input with a shared Zod schema. Role gate in brackets (O=OWNER, A=ADMIN, D=DOCTOR, N=NURSE).
- **patient**: `list`[all] · `getById`[all] · `create`[all] · `update`[all] · `softDelete`[O/A].
- **lesion**: `listByPatient`[all] · `getById`[all] · `create`[all] · `update`[all] · `timeline`[all] (ordered `points[]` with signed image URLs + per-metric delta series + elapsed-days between scans — the centerpiece query, served by `ix_scan_lesion_captured`).
- **scan**: `listByLesion`[all] · `getById`[all] · `createFinalized`[all] (→ `scan-write.createFinalizedScan`) · `createDraft`/`finalizeDraft`[all].
- **image**: `getUploadUrl`[all] (presigned PUT after org-scoped lesion-ownership check) · `attachToScan`[all] · `getViewUrl`[all] (presigned GET after org check).
- **insight**: `getCurrent`[all] (reads stored row, does NOT call Claude) · `generate`[O/A/D] · `history`[all].
- **management**: `getPlan`[all] · `setStatus`[O/A/D] · `addNote`[O/A/D] · `listNotes`[all]. (NURSE read-only.)
- **device**: `list`[O/A] · `create`[O/A] (returns raw key **once**) · `revoke`[O/A].
- **member**: `list`[O/A] · `invite`[O/A] · `updateRole`[O/A] · `remove`[O/A]. (Backed by Clerk; mirrored locally.)
- **ingestion**: `listEvents`[O/A] · `reconcile`[O/A] (service built; **UI deferred**).
- **dashboard**: `overview`[all] (org-scoped counts, recent flagged lesions, recent scans).

### 5.2 Device-Ingestion API (specified now, firmware later)
Versioned REST under `/api/v1/ingest/*`. **Server endpoint, tables, idempotency, and reconciliation service are real, tested code; live firmware and the reconciliation UI are deferred.** Documented in `docs/device-ingestion-api.md`, exercised by `scripts/simulate-device.ts`.
- **Auth/org binding.** Device created per-org; secret `lsk_<prefix8>_<random32>`, sent as `Authorization: Bearer lsk_...`. Server looks up by `api_key_prefix`, verifies `api_key_hash` (argon2id or sha-256, hashed at rest), derives `org_id` **from the device row** — device never sends `org_id`. Revoke via `device.status = REVOKED`. Rate limit 60/min/device-key.
- **`POST /api/v1/ingest/scans`** — required header `Idempotency-Key`. Single locked payload (`src/lib/schemas/ingest.ts`):
  ```jsonc
  {
    "capturedAt": "ISO-8601",
    "subject": { "lesionId": "uuid" },          // OR:
    "patientRef": { "mrn": "string", "bodyRegionHint": "UPPER_BACK", "bodySide": "LEFT" },
    "classification": {
      "label": "SUSPICIOUS", "confidence": 0.82, "confidenceLabel": "SUSPICIOUS",
      "metrics": { "diameter_mm": 6.8, "asymmetry_score": 6.1 },  // metrics schema (4.6)
      "metricsScale": "DERMOSCOPE"
    },
    "images": [ { "imageType": "DERMOSCOPIC", "isPrimary": true, "objectKey": "…", "contentHash": "…" } ]
  }
  ```
- **`POST /api/v1/ingest/images/presign`** — mints a presigned PUT for a device-scoped, org-prefixed key, identical flow to the UI presign.
- **Matching & write.** Upsert `ingestion_event` (idempotent on `(device_id, idempotency_key)`) → resolve `lesionId` org-scoped (or match `patientRef.mrn` within the device's org) → on match, call the **same** `scan-write.createFinalizedScan({ …, source: 'DEVICE', deviceId, ingestionEventId }, ctx)` → status `AUTO_MATCHED`; else `NEEDS_RECONCILIATION`. Cross-org refs simply don't match. Replays return the original result.

---

## 6. MVP Scope

### 6.1 In scope
Auth + create-org onboarding + invite/accept (Clerk) · Patients CRUD (soft-delete) · Lesions create/list/detail (required laterality + precise-location note) · **manual scan entry** (image upload + classification + confidence + capture date + metrics + metrics_scale) · the **lesion evolution timeline** (Timeline / Trends / Compare) · AI insights via Claude (per-scan patient-friendly + doctor summary; per-lesion evolution) with store/cache/regenerate · **management/follow-up notes + plan status**, elevated when a lesion is `SUSPICIOUS`/`MALIGNANT` · image storage with signed short-lived URLs · a **device-registration screen** (mints/shows a key once, links the contract doc; no live ingestion) · the device-ingestion **endpoint + tables + simulate-device script** · empty/loading/permission states + app shell · append-only `audit_log` from day one.

### 6.2 Explicitly deferred (architect for, do not build)
Full HIPAA/GDPR program · Postgres RLS (M11) · audit-log viewer/export · encryption-at-rest · data-residency/BAAs · **live device ingestion + reconciliation UI** (endpoint + tables + simulate script ARE built; the human reconciliation *screen* is deferred) · ESP32 firmware/SDK · ML/classification model (external) · background job queue (insights are lazy, on-demand) · multi-org-per-user · SSO/MFA · custom/granular roles · billing · patient portal · scheduling/messaging/e-Rx · PDF/print/export · dermoscopy zoom/annotation, image auto-registration, app-side ABCDE auto-scoring · notifications beyond invite email · native/mobile · i18n.

**Cut order if over budget:** NURSE partial permissions → lesion-level insight → management statuses → Compare view. **Never cut:** org isolation, manual scan entry, the timeline, one working insight.

### 6.3 Roles & permissions matrix (canonical — supersedes all others)

| Action | OWNER | ADMIN | DOCTOR | NURSE |
|---|:--:|:--:|:--:|:--:|
| Manage members / invites | ✓ | ✓ | ✗ | ✗ |
| Manage devices / org settings | ✓ | ✓ | ✗ | ✗ |
| CRUD patients | ✓ | ✓ | ✓ | ✓ |
| Soft-delete patient | ✓ | ✓ | ✗ | ✗ |
| CRUD lesions | ✓ | ✓ | ✓ | ✓ |
| Create/record scans | ✓ | ✓ | ✓ | ✓ |
| Manage plan status / add management notes | ✓ | ✓ | ✓ | ✗ |
| Generate clinical-summary & evolution insight | ✓ | ✓ | ✓ | ✗ |
| Read patient-friendly insight | ✓ | ✓ | ✓ | ✓ |
| View audit log (data present; viewer deferred) | ✓ | ✓ | ✗ | ✗ |

Enforcement: every clinical query is org-filtered server-side; role is a second gate via `requireRole`; every request re-verifies membership + role. 403 renders as a clean permission card.

### 6.4 Route inventory (locked)
Public/auth: `/`, `/login`, `/signup`, `/accept-invite`. Onboarding (no-org user forced here): `/onboarding/create-org`, `/onboarding/invite` (skippable). App: `/app` (dashboard) · `/app/patients` · `/app/patients/new` · `/app/patients/:patientId` · `/app/patients/:patientId/lesions/new` · **`/app/patients/:patientId/lesions/:lesionId`** (timeline centerpiece) · `.../scans/new` · `.../scans/:scanId` · `.../insights/:insightId` · `.../management` · `/app/settings/{org,members,devices,profile}`. Guards: unauth→`/login?next`; authed-no-org→onboarding; wrong-role→403; `/` authed→`/app`.

### 6.5 Lesion evolution timeline (the centerpiece — "is this mole getting worse?")
Three view modes over one scan set. **Header:** breadcrumb, current-status color chip (green/amber/red/grey per 4.2 + latest label & confidence together + date), worsening/stable/improving trend indicator, actions [Record scan] / [Generate insight] / [Management]. **Timeline** (default): chronological scan cards — primary thumbnail, label badge + confidence, absolute + relative date, source tag (Device/Manual), headline metric row with **deltas vs previous scan** (red = bad-direction growth, green = good), "add to compare"; `SUSPICIOUS`/`MALIGNANT` cards get a colored edge; scans with `metrics_scale = UNCALIBRATED` or missing diameter are marked "partial data" and excluded from trend lines. **Trends:** small-multiple Recharts line charts per numeric metric + confidence over time, with a classification color band along the x-axis; **elapsed intervals are honored** — the x-axis is real time, not scan index. **Compare:** side-by-side A|B panels (image + badge + full metric table) with a center delta column (per-metric change + direction, color-coded) and elapsed time; default = earliest vs latest. Right rail: **AI insight panel** (evolution narrative, generated-at, "based on N scans", regenerate, non-diagnostic disclaimer) and a **management panel** that pins/color-tints when any scan is flagged. Graceful single-scan state ("Baseline — add another scan to see a trend").

---

## 7. Milestone Plan (THE CORE DELIVERABLE)

Ordered, self-contained work packages, each executable cold. Every milestone inherits Section 2 and Section 8 verbatim — do not re-decide the stack, enums, roles, or scoping rule.

Dependency graph: **M1 → M2 → M3 → M4 → {M5, M6, M7, M8} → M9 → M10 → M11 → M12.** (M5/M6/M7/M8 each need M4; M7 also parallelizable with M6/M8.)

---

### M1 — Toolchain & skeleton
**Goal.** A running, empty Next.js app that boots only with valid env, all tooling wired.
**Prereqs.** none.
**Scope.** `create-next-app` (App Router, TS, Tailwind v4, pnpm). Add `.nvmrc` (22), `engines.node`, `output: 'standalone'`, `docker-compose.yml` (Postgres + MinIO), `drizzle.config.ts`, `vitest.config.ts`, `playwright.config.ts`, ESLint (placeholder `no-restricted-imports` targeting `src/server/db/client`), Prettier, `src/env.ts` (`@t3-oss/env-nextjs` validating `DATABASE_URL`, Clerk keys, R2/S3 keys, `ANTHROPIC_API_KEY` — Section 9), committed `.env.example`, shadcn/ui init, stub app shell, GitHub Actions (typecheck → lint → build). Create `src/lib/enums.ts` and `src/lib/schemas/metrics.ts` with the canonical enums (4.2) and metrics schema (4.6).
**Key files.** `next.config.ts`, `src/env.ts`, `.env.example`, `docker-compose.yml`, `eslint.config.mjs`, `src/lib/enums.ts`, `src/lib/schemas/metrics.ts`, `.github/workflows/ci.yml`.
**Acceptance.** `pnpm install && pnpm build` succeeds; `pnpm dev` serves a page; app refuses to boot with a missing required env var; CI green.
**Verify.** `pnpm build`; delete `DATABASE_URL` from `.env`, confirm boot fails with a clear env error; `docker compose up` brings up Postgres + MinIO.

---

### M2 — Database schema, scoped repository, security choke points
**Goal.** All tables exist; the ONLY PHI data path (`repo(ctx)`) and the five choke points exist; isolation is asserted by tests. **No RLS yet** (M11).
**Prereqs.** M1.
**Scope.** Write `src/server/db/schema.ts` (all tables + enums + indexes from Section 4, incl. `org_id` everywhere, `deleted_at` on PHI tables, `captured_at` on scan, 1:many `scan_image`). Generate the first plain-SQL migration. Build the five choke points as real code (some wired minimally): `src/server/db/scoped-repo.ts` (`repo(ctx)` — org-injecting methods for every PHI model), `src/server/auth/org-context.ts` (`OrgContext` type + resolver stub filled by M3), `src/server/auth/require-role.ts`, `src/server/audit/audit.ts`, and placeholders `src/server/ai/{insights,deidentify}.ts` (signatures only). Tighten the ESLint rule to ban importing `src/server/db/client` outside `src/server/db/*`. Write Vitest tenant-isolation tests: seed org A and org B, assert A's `repo(ctx)` cannot read/update/delete B's rows through **every** repo method.
**Key files.** `src/server/db/{schema.ts,client.ts,scoped-repo.ts}`, `drizzle/0001_*.sql`, `src/server/auth/{org-context.ts,require-role.ts}`, `src/server/audit/audit.ts`, `eslint.config.mjs`, `tests/isolation.test.ts`.
**Acceptance.** Migration applies to a fresh DB; every PHI table has non-null `org_id` + a `WHERE deleted_at IS NULL` isolation index; isolation tests pass; ESLint fails the build on a raw-client import outside `db/*`.
**Verify.** `pnpm drizzle-kit migrate` against docker Postgres; `pnpm test tests/isolation.test.ts`; add a temp raw-client import in a service file, confirm `pnpm lint` errors, remove it.

---

### M3 — Auth, organizations, roles, identity mirror
**Goal.** Users sign up, create an org (become OWNER), invite members, accept invites; `OrgContext` is fully resolved from Clerk on every request; identity is mirrored into `user`/`membership`.
**Prereqs.** M2.
**Scope.** Integrate Clerk (Organizations enabled, roles owner/admin/doctor/nurse). Middleware guards (unauth→`/login`; authed-no-org→onboarding). Fill `org-context.ts`: resolve `{ userId, orgId, role, membershipId }` from Clerk's `auth()` + the mirrored membership; no membership in requested org → `NOT_FOUND`. Clerk webhook at `src/app/api/webhooks/clerk/route.ts` mirrors org/user/membership create/update/delete into our tables (so the domain never depends on a live Clerk call). Build onboarding routes + `/accept-invite`. Wire the tRPC context to build `OrgContext`. Write `audit()` rows for auth events.
**Key files.** `src/middleware.ts`, `src/server/auth/org-context.ts`, `src/app/api/webhooks/clerk/route.ts`, `src/server/trpc/trpc.ts`, `src/app/onboarding/*`, `src/app/(public)/{login,signup,accept-invite}`.
**Acceptance.** New user → create org → is OWNER; invite by email → second user accepts → appears in members with correct role; a user with no membership in a requested org gets `NOT_FOUND`; auth events produce audit rows.
**Verify.** Manual: sign up two accounts, create an org with A, invite B, accept as B, confirm membership rows mirrored; hit a tRPC procedure without an org and confirm the onboarding redirect.

---

### M4 — Core domain: patients, lesions, manual scan write, images, timeline query
**Goal.** The manual clinical path end-to-end at the service+API layer: create patient → lesion → record a finalized scan (image + classification + confidence + metrics) → fetch the lesion timeline with deltas. The spine the demo depends on.
**Prereqs.** M3.
**Scope.** Services: `patient.ts`, `lesion.ts`, `scan-write.ts` (`createFinalizedScan(input, ctx)` — one transaction: assert org ownership of lesion → insert scan → classification → images → recompute `lesion.current_risk` + set `baseline_scan_id` if first → write audit → insight is lazy, enqueue nothing. Enforce immutability 4.4 and metrics schema 4.6). Storage: `src/server/storage/presign.ts` (presigned PUT with server-chosen org-scoped key `org_{orgId}/patient_{id}/lesion_{id}/scan_{id}/{uuid}.{ext}`, 5-min expiry, content-type allowlist `image/jpeg|png|webp`, size cap 15MB via `content-length-range`; presigned GET minted only after org check; strip EXIF post-upload; store `content_hash`). tRPC routers: `patient`, `lesion`, `scan`, `image`. **`lesion.timeline`** returns ordered `points[]` (signed primary-image URL, label, confidence+confidenceLabel, capturedAt, source, metrics, metrics_scale, `partialData` flag) + per-metric delta series + **elapsedDays between consecutive scans and vs baseline** (computed in the service, not stored). Enforce laterality + precise-location-note required on lesion create.
**Key files.** `src/server/services/{patient,lesion,scan-write}.ts`, `src/server/storage/presign.ts`, `src/server/trpc/routers/{patient,lesion,scan,image}.ts`, `src/lib/schemas/{patient,lesion,scan}.ts`.
**Acceptance.** Via tRPC (integration test/script): create patient → lesion → get presigned PUT → upload a JPEG to MinIO → attach → create finalized scan (BENIGN + metrics) → create a second scan (SUSPICIOUS, larger diameter, later `capturedAt`) → `lesion.timeline` returns 2 ordered points with correct deltas and elapsedDays; an `UNCALIBRATED` scan is flagged `partialData` and excluded from the diameter trend; a cross-org lesionId returns `NOT_FOUND`; editing a finalized scan's label is rejected.
**Verify.** Integration test hitting the services against docker Postgres + MinIO; assert delta signs, elapsedDays, and immutability.

---

### M5 — Clinical UI: patients, lesions, manual scan entry
**Goal.** The doctor-facing screens for M4 on the real app shell.
**Prereqs.** M4.
**Scope.** App shell (persistent nav Dashboard/Patients/Settings, org name, user menu, current-org + current-role visible, breadcrumbs, single light theme, product-wide green/amber/red/grey classification semantics, confirm on destructive actions). Screens: patients list + new + detail; lesion new (required laterality + precise-location note) + detail shell; **manual scan-entry flow** (`/app/.../scans/new`): image upload (presigned PUT) → capture date → classification label + confidence + confidenceLabel → metrics + metrics_scale → save; a `SUSPICIOUS`/`MALIGNANT` finalization prompts to open the management panel. Empty/loading/permission states everywhere. NURSE can create patients/lesions/scans; management/insight-generation controls absent for NURSE.
**Key files.** `src/app/app/**`, shadcn components, TanStack Table for lists.
**Acceptance.** A doctor can, in the browser, add a patient, add a lesion (form rejects missing laterality/location), and record two scans with images that persist and reload org-scoped; NURSE sees data-entry but not management/insight-gen; every screen has loading + empty + 403 states.
**Verify.** Golden-path steps 1–8 (Section 10) in the browser against local services; log in as NURSE, confirm gated controls hidden.

---

### M6 — Lesion evolution timeline UI (Timeline / Trends / Compare)
**Goal.** The centerpiece "is this mole getting worse?" view.
**Prereqs.** M4 (timeline query), M5 (shell + scan-card context).
**Scope.** Build the three view modes over `lesion.timeline` (Section 6.5): Timeline (scan cards with previous-scan deltas, source tag, partial-data marking, add-to-compare, colored edge on flagged, single-scan "Baseline" state), Trends (Recharts small-multiples per numeric metric + confidence, real-time x-axis honoring elapsed intervals, classification color band, hover→value+thumbnail, click→jump), Compare (A|B panels + center delta column + elapsed time; default earliest vs latest). Header with status chip (label+confidence+date), worsening/stable/improving indicator, action buttons. Right-rail placeholders for insight + management panels (filled in M7/M8).
**Key files.** `src/app/app/patients/[patientId]/lesions/[lesionId]/**`, chart components.
**Acceptance.** With two scans of differing dates/diameters, Timeline shows both cards with correct deltas, Trends shows a rising diameter line on a real-time axis, Compare shows the delta column and elapsed days; a single-scan lesion shows Baseline; an UNCALIBRATED scan is visibly "partial data" and not on the diameter line.
**Verify.** Golden-path step 9 in the browser; verify a 2-months-apart vs 2-years-apart pair render with visibly different x-spacing.

---

### M7 — AI insights (Claude), de-identify seam, storage & cache
**Goal.** Generate and persist the three insight kinds, server-side only, through the de-identify seam, with content-hash caching and non-diagnostic guardrails.
**Prereqs.** M4. (Parallelizable with M6/M8 after M4.)
**Scope.**
- `src/server/ai/deidentify.ts` — the **only** builder of LLM payloads: strips name/MRN/DOB/email/phone/address/precise coords/free-text-with-names; converts absolute dates to **elapsed intervals in days** (interval accuracy is clinically load-bearing — true elapsed days, not coarse buckets); sends label, confidence+confidenceLabel, numeric metrics, metrics_scale, body-region category, age band. Compute `input_hash` over this payload.
- `src/server/ai/prompts.ts` — one frozen guardrail system prompt (decision-support not diagnosis; hedged language; human-in-the-loop; every output carries a non-dismissible `disclaimer`; inputs already de-identified; output only the requested JSON) + three task prompts.
- `src/server/ai/insights.ts` — the **only** place `@anthropic-ai/sdk` is imported. **Model tiering & call shape (LOCKED — verified against the claude-api reference on 2026-07-01):**
  - `PATIENT_EXPLANATION` → `claude-haiku-4-5`, non-streaming, **omit** the `thinking` param, **omit** `output_config.effort` (Haiku 4.5 rejects `effort` with a 400), `max_tokens: 600`, structured output via `output_config: { format: { type: 'json_schema', schema } }`. Schema `{ headline, whatThisMeans, aboutConfidence, nextSteps, disclaimer }`.
  - `CLINICAL_SUMMARY` → `claude-opus-4-8`, `thinking: { type: 'adaptive' }`, `output_config: { effort: 'medium', format: {...} }`, `max_tokens: 1200`. Schema `{ summary, notableFindings[], abcdeFlags[], confidenceInterpretation, considerations[], disclaimer }`.
  - `EVOLUTION_NARRATIVE` → `claude-opus-4-8`, `thinking: { type: 'adaptive' }`, `output_config: { effort: 'medium', format: {...} }`, **streamed** via `messages.stream()` + `.finalMessage()` (long — avoids timeouts), `max_tokens: 1500`. Schema `{ overview, metricTrends[{metric,direction,note}], classificationTrend, narrative, disclaimer }` — **no discrete `attentionLevel`/triage enum** (a model forbidden from classifying must not emit a risk label that competes with the device classification or drives UI color; the narrative describes change, it does not adjudicate risk).
  - Frozen guardrail system prompt marked `cache_control: { type: 'ephemeral' }`; it must be **≥ ~4096 tokens** or it silently won't cache on Opus 4.8 (pad the guardrail text or accept no caching — do not add per-request data to reach the threshold). **Do not send `temperature`/`top_p`** (rejected on these models). Dynamic data goes in `messages`, never the cached system block. Client constructed once: `new Anthropic()` (reads `ANTHROPIC_API_KEY`).
- Persistence: write to `ai_insight` (`kind`, `subject_*`, `model`, `prompt_version`, `input_hash`, `content`, `status`); **cache key = `(subject_type, subject_id, kind, input_hash, prompt_version, model)`** — on a hit return the stored row, do NOT call Claude. New scan → new `input_hash` → regenerate on demand. Lazy generate-and-persist (no queue). On Claude error persist `status = FAILED` and never block clinical flow. `insight.getCurrent` reads storage only; `insight.generate` calls the module; page loads never call Claude. Wire the timeline right-rail insight panel (generated-at, "based on N scans", regenerate, disclaimer). **Patient-facing gating:** for a lesion currently `SUSPICIOUS`/`MALIGNANT`, the patient-friendly text is clinician-review-gated before it can be surfaced/exported and carries a hard non-diagnostic disclaimer.
**Key files.** `src/server/ai/{deidentify,prompts,insights}.ts`, `src/server/trpc/routers/insight.ts`, timeline insight panel.
**Acceptance.** Generating an evolution insight for a 2-scan lesion returns readable JSON with a disclaimer, is stored, and a second `getCurrent` returns it **without** a Claude call (assert via a spy that the SDK is called 0 times on cache hit); adding a scan changes `input_hash` and enables regeneration; the SDK key never appears in any client bundle; a de-identify unit test asserts no PHI fields and true elapsed-days in the payload.
**Verify.** `pnpm test` on de-identify + cache-hit tests; browser: generate + read + regenerate an insight; grep the client bundle for `ANTHROPIC` (must be absent).

---

### M8 — Management/follow-up plan & notes
**Goal.** When a lesion is flagged, a doctor sets a management status and adds attributed dated notes; the panel elevates.
**Prereqs.** M4 (scan-write knows current risk); M6 (right-rail panel slot).
**Scope.** `src/server/services/management.ts` + `management` router: `getPlan`, `setStatus` (`MONITORING`/`BIOPSY_RECOMMENDED`/`REFERRED`/`RESOLVED`), `addNote` (author + timestamp), `listNotes`. UI: management panel + `/app/.../management` — pins/color-tints when any scan is `SUSPICIOUS`/`MALIGNANT`; NURSE read-only. Write audit rows on status change and note add. **Framing:** management/follow-up plan — copy must never assert the patient "has cancer"; a `MALIGNANT` device label elevates toward biopsy/referral, not a "treatment_active" claim.
**Key files.** `src/server/services/management.ts`, `src/server/trpc/routers/management.ts`, `src/app/app/patients/[patientId]/lesions/[lesionId]/management/*`, right-rail panel.
**Acceptance.** Recording a MALIGNANT scan elevates the management panel; a doctor sets status and adds a note (attributed + dated); reload persists org-scoped; NURSE sees read-only; status/note changes produce audit rows.
**Verify.** Golden-path steps 10–11 in the browser; log in as NURSE, confirm read-only.

---

### M9 — Device registration UI + ingestion endpoint + simulate script (stubbed, real code)
**Goal.** Doctors register a device and see its key once; the ingestion endpoint + tables + idempotency + matching write through the same scan-write path; a script proves it. **No live firmware, no reconciliation UI.**
**Prereqs.** M4 (scan-write), M3 (device is org-owned).
**Scope.** `device` router + service: `create` (mint `lsk_<prefix8>_<random32>`, store `api_key_prefix` + `api_key_hash`, return raw key **once**), `list`, `revoke`. Settings→Devices UI: register, show key once with copy-and-dismiss, list, revoke; link `docs/device-ingestion-api.md`; note "manual entry works today; live device ingestion pending." REST: `src/app/api/v1/ingest/scans/route.ts` (+ `images/presign`) — Bearer device-key auth (lookup by prefix, verify hash, derive org, reject REVOKED), require `Idempotency-Key`, validate the canonical payload (`src/lib/schemas/ingest.ts`), upsert `ingestion_event` (idempotent), resolve `lesionId`/`patientRef.mrn` org-scoped, on match call `scan-write.createFinalizedScan({…, source:'DEVICE'})` → `AUTO_MATCHED`, else `NEEDS_RECONCILIATION`; rate-limit 60/min/device-key; replays return the original result. `scripts/simulate-device.ts` posts a sample payload. `docs/device-ingestion-api.md` documents endpoint/auth/payload/idempotency. `ingestion` router `listEvents`/`reconcile` **service exists** (reconciliation UI deferred).
**Key files.** `src/server/services/{device,ingestion}.ts`, `src/server/trpc/routers/{device,ingestion}.ts`, `src/app/api/v1/ingest/**`, `src/app/app/settings/devices/*`, `scripts/simulate-device.ts`, `docs/device-ingestion-api.md`, `src/lib/schemas/ingest.ts`.
**Acceptance.** Register a device → raw key shown once → `simulate-device.ts` with that key posts a scan → a DEVICE-source finalized scan appears in the right org's lesion timeline, indistinguishable from a manual scan except the source tag; re-posting with the same `Idempotency-Key` returns the original result (no duplicate scan); a cross-org lesionId → `NEEDS_RECONCILIATION`; a REVOKED key → 401; audit row has `actor_type = DEVICE`.
**Verify.** `pnpm tsx scripts/simulate-device.ts` against the dev server; run it twice to assert idempotency; browser: see the device scan on the timeline with a "Device" tag.

---

### M10 — Dashboard & app-wide polish
**Goal.** The overview dashboard and final empty/loading/permission polish.
**Prereqs.** M5, M6, M8.
**Scope.** `dashboard.overview` (org-scoped counts, recent flagged lesions, recent scans) + `/app` dashboard screen (welcome/empty state when no patients). Audit-write coverage check for all mutations + PHI reads of a patient record + insight generation. Global quick-add; confirm-on-destructive everywhere; ensure every route has loading/empty/403 states; responsive laptop-primary/tablet-usable.
**Key files.** `src/server/services/dashboard.ts`, `src/server/trpc/routers/dashboard.ts`, `src/app/app/page.tsx`.
**Acceptance.** Dashboard shows org-scoped counts + recent flagged lesions and an empty state for a fresh org; audit rows exist for the golden-path mutations.
**Verify.** Golden-path step-through; inspect `audit_log` after a full run.

---

### M11 — Hardening: Postgres RLS + security headers + rate limits
**Goal.** Turn on the RLS safety net and remaining transport/security controls, deliberately and once.
**Prereqs.** M2–M10 (schema + all write paths stable).
**Scope.** Add a plain-SQL migration enabling RLS on every PHI table with `USING (org_id = current_setting('app.current_org')::uuid)`. Open a transaction per request that runs `SET LOCAL app.current_org = <ctx.orgId>` before any PHI query (a single wrapper in the tRPC/REST context — document the serverless requirement: with Neon pooling, RLS needs the `SET LOCAL` and the queries in the **same** transaction/connection). Add an isolation test that a mis-scoped connection returns **zero rows**. Add security headers (HSTS, CSP with `img-src 'self' <storage-host> data:`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`), origin/referer check on mutating requests, and rate limits (login handled by Clerk; device-ingestion 60/min/device-key from M9; general API 300/min/session).
**Key files.** `drizzle/00NN_rls.sql`, tRPC/REST context wrapper, `next.config.ts`/middleware headers, `tests/rls.test.ts`.
**Acceptance.** With RLS on, a query without `app.current_org` set (or set to the wrong org) returns 0 rows; all existing isolation + integration tests still pass; security headers present on responses.
**Verify.** `pnpm test tests/rls.test.ts`; curl the app and inspect response headers.

---

### M12 — Seed, golden-path E2E, verification
**Goal.** Reproducible demo data and an automated golden-path proof.
**Prereqs.** M1–M11.
**Scope.** Idempotent `scripts/seed.ts`: a demo clinic org + a solo-doctor org; OWNER/DOCTOR/NURSE users; patients with MRNs; **a lesion with a 3–4 scan `BENIGN`→`SUSPICIOUS` progression** (biopsy-recommended trajectory — **not** a benign→malignant "device diagnosed cancer" flip; exercises deltas + the management path), a seeded device with a known dev key, and canned `COMPLETED` insights for offline UI. Playwright test automating the 12-step golden path (Section 10). Document the demo run in the README.
**Key files.** `scripts/seed.ts`, `tests/e2e/golden-path.spec.ts`, `README.md`.
**Acceptance.** `pnpm tsx scripts/seed.ts` is idempotent (re-runnable, no dupes); the Playwright golden-path test passes against a seeded local stack; all org data is isolated between the two seeded orgs.
**Verify.** Run seed twice (no duplicates); `pnpm playwright test`; manually log into the second org and confirm zero visibility of the first.

---

## 8. Cross-Cutting Conventions for Implementing Agents

**Tenant scoping (never broken).** All PHI reads/writes go through `repo(ctx)`. Never import `src/server/db/client` outside `src/server/db/*` (ESLint enforces). Never read `org_id` from body/query/header. Every mutating tRPC procedure calls `requireRole(ctx, [...])` after `OrgContext`. Cross-org access returns `NOT_FOUND`, never `FORBIDDEN`.

**The five named choke points — route everything through them, add no second path:** `OrgContext` (auth/org-context.ts), `repo(ctx)` (db/scoped-repo.ts), `requireRole` (auth/require-role.ts), `audit()` (audit/audit.ts), and the AI pair `insights.ts` + `deidentify.ts`. The device-ingestion path builds an `OrgContext` from the device key and writes via the **same** `scan-write` service and `repo(ctx)`.

**Both API surfaces are thin.** tRPC procedures and REST ingest handlers authenticate, build context, validate with a shared Zod schema, and call a service. Business logic lives only in `src/server/services/*`.

**Env & secrets.** All secrets via `src/env.ts` (`@t3-oss/env-nextjs`, Zod-validated). Never a secret in the repo, a client bundle, or a `NEXT_PUBLIC_*` var. `ANTHROPIC_API_KEY` and storage keys are server-only. CI greps tracked files for `ANTHROPIC_API_KEY` and known key prefixes and fails on a hit.

**Logging (PHI redaction).** One logger wrapper; the only loggable fields are `requestId, userId, orgId, role, route, httpStatus, latencyMs, resourceType, resourceId`. Never log request/response bodies of PHI endpoints, image bytes, or any PHI field. Errors log the error class + `requestId`, not the payload.

**LLM discipline.** Only `insights.ts` imports `@anthropic-ai/sdk`. Only `deidentify.ts` builds LLM payloads. Insights are generated on demand, persisted, and served from cache on `input_hash` hit — page loads never call Claude. The model never classifies; every output carries a `disclaimer`; patient-facing text for a flagged lesion is clinician-review-gated.

**Testing & running.** `pnpm dev` (local), `pnpm test` (Vitest, incl. isolation + de-identify + cache), `pnpm playwright test` (golden path), `pnpm lint`, `pnpm build`. Local DB + object store via `docker compose up`. Migrations via `drizzle-kit`; checked in as plain SQL, never hand-edited after apply.

**Marking milestones done.** When a milestone is complete, append a `## Progress Log` entry at the bottom of THIS file: milestone id, date, commit/PR, and any deviation. Do not edit locked decisions; if one is genuinely wrong, note the proposed change in the Progress Log and flag it for human review rather than silently diverging.

**What NOT to do.** Don't reintroduce anything in Section 2.10. Don't add a second data-access path or a second LLM call site. Don't cap `scan_image` at one. Don't store an `evolution_flag` per scan. Don't hard-delete PHI. Don't emit an LLM triage/risk label that drives UI color. Don't send absolute dates or PHI to the LLM. Don't send `temperature`/`top_p`/`budget_tokens` to `claude-opus-4-8`, and don't send `output_config.effort` to `claude-haiku-4-5` (both 400). Don't put `org_id` in a URL, log, or client input.

---

## 9. Environment & Setup

**Accounts/services:** Clerk (Organizations enabled), Neon (or local Postgres via docker), Cloudflare R2 (or local MinIO), Anthropic API key. Vercel for hosted preview deploys (optional locally).

**Required env vars (validated in `src/env.ts`, documented in `.env.example`):**
- `DATABASE_URL` — Postgres connection (Neon in prod; docker local).
- `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`.
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (R2 in prod; MinIO local — the `endpoint` var is what makes R2→S3 a config swap).
- `ANTHROPIC_API_KEY` (server-only; never `NEXT_PUBLIC_*`).
- `APP_URL` (invite links / origin checks).

**Run locally:**
1. `corepack enable && pnpm install`
2. `cp .env.example .env` and fill values (Clerk keys, Anthropic key; DB/S3 point at docker).
3. `docker compose up -d` (Postgres + MinIO).
4. `pnpm drizzle-kit migrate`.
5. `pnpm tsx scripts/seed.ts`.
6. `pnpm dev` → open the app, sign in, run the golden path.

---

## 10. Verification Strategy — the 12-step golden path

"MVP done" = this runs on real, manually-entered data with strict org isolation. Automated by the Playwright test in M12; also the manual demo script.

1. Sign up → 2. Create org (creator = OWNER) → 3. (Invite a NURSE + accept) → 4. Add a patient → 5. Add a lesion (required laterality + precise-location note) → 6. Record scan #1 (`BENIGN`, diameter 4.1mm, captured 3 months ago) → 7. Record scan #2 (`SUSPICIOUS`, diameter 6.8mm, captured now) → 8. Open the lesion timeline: both cards, worsening trend indicator, correct deltas → 9. Switch to Trends (rising diameter on a real-time x-axis) and Compare (center delta column + elapsed days) → 10. Generate the lesion evolution insight (readable, timestamped, "based on 2 scans", non-diagnostic disclaimer, regenerate works; a second view is a cache hit with **no** Claude call) → 11. Because a scan is `SUSPICIOUS`, the management panel elevates → set status `BIOPSY_RECOMMENDED` + add an attributed dated note → 12. Reload (all persists, org-scoped); log in as the NURSE (can add data; management/insight-gen controls absent); go to Settings→Devices (register a device, see the key once, follow the ingestion-contract link; run `simulate-device.ts` and see a DEVICE-tagged scan appear on the timeline). Finally, log into a **second org** and confirm zero visibility of the first.

**Testing approach.** Vitest: tenant-isolation (M2) — org A cannot read/update/delete org B via every repo method; RLS zero-rows (M11); de-identify (no PHI, true elapsed-days) + insight cache-hit (0 SDK calls) (M7); scan-write immutability + deltas (M4); ingestion idempotency (M9). Playwright: the 12-step golden path (M12). CI: typecheck → lint (incl. raw-DB ban) → unit tests on ephemeral Postgres → build; Vercel preview per PR.

---

## 11. Compliance-Later Roadmap (additive; the seams already exist)

| Capability | What to add | Seam already in place |
|---|---|---|
| **RLS backstop** | (M11 lands the migration + `SET LOCAL`) — extend to any new tables | `org_id` on every PHI table; single context wrapper for `SET LOCAL` |
| **Encryption at rest** | Postgres/volume encryption + column encryption for MRN, DOB | PHI field list centralized; PHI columns grouped on `patient`; a crypto codec wraps them in the repo |
| **Full audit trail** | Expand `audit_log` to every read; hash-chain; retention; viewer/export UI | `audit_log` table + `audit()` helper exist, called centrally; actor model already USER/DEVICE/SYSTEM |
| **Granular access controls** | Per-patient care-team ACLs, break-glass | `requireRole` + `OrgContext` are the single choke point |
| **Data export (GDPR)** | Per-patient JSON/PDF export | Scoped repo already fetches a full patient graph by org |
| **Right-to-erasure** | Soft-delete → hard-purge job + cascade + redact PHI in audit/insight rows | Soft-delete is the mechanism; audit metadata is PHI-free; insights store `input_hash` not PHI |
| **BAAs / data residency** | AWS BAA (Fargate/RDS/S3), Anthropic BAA/ZDR config, pin region; revisit Clerk BAA or migrate at the OrgContext seam | Compute is `output:'standalone'`; storage endpoint is a config var; all Claude calls in one module. **Model note:** MVP uses `claude-opus-4-8` + `claude-haiku-4-5`, both compatible with zero-data-retention — the ZDR/BAA path stays open. |

## Progress Log

- **M1-M12 implementation sweep — 2026-07-04 — no commit/PR (directory is not a git repository).** Scaffolded the locked Next.js 15/React 19/pnpm stack; added env validation, Docker services, Drizzle schema and generated migration, scoped repository, Clerk middleware/webhook, tRPC routers, REST device-ingestion endpoints, S3/R2 presign helpers, manual scan upload/finalization, lesion timeline/trends/compare UI, Claude insight seam with de-identification/cache, management notes, device settings UI, seed/simulate scripts, docs, CI, and focused Vitest coverage. Verification passed locally: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`.
- **Deviations requiring real environment follow-up.** Playwright golden path is present but skipped until Clerk test users and organization fixtures exist. Postgres RLS defense-in-depth was not enabled because request-transaction `SET LOCAL app.current_org` plumbing must be validated against the target Neon connection mode before forcing policies. Clerk invite/member management uses Clerk's hosted organization UI plus local webhook mirror rather than a custom member table screen.
| **Hosting lift-and-shift** | Neon→RDS (`pg_dump`/restore + connection string; schema/migrations/RLS identical); Vercel→Fargate container; R2→S3 (endpoint+creds swap) | Standard `pg` protocol; standalone container from day one; no Vercel-only primitives in the hot path |
