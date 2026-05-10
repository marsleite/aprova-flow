# Current System Map

## Documentation Surfaces

- `README.md`
  - Public product story, personas, legacy architecture diagram, and historical
    single-app structure.
- `docs/product/pre-launch-audit.md`
  - Previous product audit snapshot with resolved and unresolved concerns.
- `docs/product/beta-metrics-roadmap.md`
  - Current measurement baseline and missing product-event instrumentation.
- `docs/product/entitlements-matrix.md`
  - Intended plan packaging, server-side gating expectations, and downgrade
    rules.
- `docs/product/beta-test-plan.md`
  - Beta questions, batteries, and minimum metrics for learning.
- `docs/product/beta-operations-checklist.md`
  - Manual tester operations and runtime prerequisites.
- `docs/architecture/current-architecture.md`
  - Intended monorepo ownership and route extraction direction.

## Web App Surface (`apps/web`)

### Main App Routes

- `/(app)/planner`
  - Macro planning, plan management, active-plan context, and next-session
    guidance.
- `/(app)/dashboard`
  - Weekly view, health, insights, heatmap, and strategy summaries.
- `/(app)/engine`
  - Daily execution, timer, question logging, and AI daily planner.
- `/(app)/mentoring`
  - Weekly diagnostics, mentoring, and contextual chat surfaces.
- `/(app)/simulations`
  - Overview layer for simulations, score framing, and upgrade surfaces.
- `/(app)/provas`
  - Official exam hub and execution paths (`/provas`, `/provas/criar-simulado`,
    `/provas/[id]/executar`, `/provas/[id]/resultado`).
- `/(app)/caderno-erros`
  - Error notebook, pro gap analysis, and flashcard generation.
- `/(app)/settings`
  - Account, plan summary, beta sandbox, and tester operations.

### Web BFF / Next API Routes

- `/app/api/chat/route.ts`
- `/app/api/error-diagnosis/route.ts`
- `/app/api/explain-answer/route.ts`
- `/app/api/interrogation/route.ts`
- `/app/api/parse-edital/route.ts`
- `/app/api/planner-daily/route.ts`
- `/app/api/smart-schedule/route.ts`
- `/app/api/weekly-mentoring/route.ts`
- `/app/api/engine/snapshot/route.ts`

### Navigation And UX Components

- `components/layout/Sidebar.tsx`
  - Actual global navigation order and primary labels.
- `components/StudyJourneyCard.tsx`
  - Canonical story for `planner -> dashboard -> engine`.
- `components/EntitlementUpgradeCard.tsx`
  - Upgrade surfaces embedded across product areas.
- `components/AccountPlanModal.tsx`
  - Plan comparison and plan-tier mutation surface.

### Legacy Surface Still Present

- `components/Dashboard.tsx`
  - Large orchestration component still present in the codebase but not imported
    by current route files.

## Dedicated API Surface (`apps/api`)

- `src/app.ts`
  - Registers CORS hooks, auth plugin, feature guard, entitlements routes, AI
    routes, and engine routes.
- `src/plugins/firebase-auth.ts`
  - Auth decorator with optional sandbox bypass via `x-aprovamind-user-id`.
- `src/plugins/feature-guard.ts`
  - Server-side feature guard based on entitlements.
- `src/modules/entitlements/routes.ts`
  - Entitlement snapshot, subscription state, and admin mutation routes.
- `src/modules/ai/routes.ts`
  - Dedicated AI routes for text and PDF workloads.
- `src/modules/engine/routes.ts`
  - Dedicated engine snapshot route.

## Shared Packages

- `packages/domain`
  - Core study-engine rules, recommendation logic, entitlement policies, billing
    types, and usage-period helpers.
- `packages/application`
  - Use cases, ports, and mappers for engine and billing flows.
- `packages/contracts`
  - Shared contracts for plan engine and entitlements snapshots.
- `packages/ai-gateway`
  - Provider abstraction for AI text/PDF workloads, token/cost helpers, and
    gateway logging.
- `packages/infrastructure-firebase`
  - Legacy Firestore adapters used by the web route and dedicated API.

## Critical Boundary Notes

- AI and engine ownership is currently duplicated across `apps/web` and
  `apps/api`.
- Entitlements depend on server-side resolution, but plan-tier state is still
  mutated from the client path today.
- Firestore remains the operational backbone for sessions, plans, entitlements,
  usage, and AI telemetry.
- Product docs no longer fully match the current monorepo shape, which makes
  architecture understanding harder for future work.
