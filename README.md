# Lumiscan Dashboard

Next.js 15 App Router dashboard for org-scoped patient, lesion, scan, insight,
management, and device-ingestion workflows.

## Stack

- Next.js 15, React 19, TypeScript strict, Tailwind v4
- Prototype mode with one local OWNER workspace, no external auth
- tRPC v11 for the UI API and versioned REST for device ingestion
- Drizzle ORM with plain SQL migrations on PostgreSQL
- S3-compatible private image storage
- Anthropic SDK behind `src/server/ai/insights.ts`

## Local Setup

```bash
corepack enable
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm dev
```

S3/MinIO and Anthropic values are validated through `src/env.ts`. The prototype
identity is created automatically in Postgres on first app access.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The Playwright golden-path file is present but skipped until browser automation
fixtures are completed.

## Device Simulation

Register a device in `/app/settings/devices`, then run:

```bash
APP_URL=http://localhost:3000 \
DEVICE_API_KEY='lsk_...' \
LESION_ID='...' \
pnpm simulate-device
```

The device contract is documented in `docs/device-ingestion-api.md`.
