# Technical Systems Audit

## Architecture And Runtime Ownership

### Strengths

- `packages/domain`, `packages/application`, and `packages/contracts` already
  centralize the most reusable study-engine and entitlement logic.
- `apps/api` is no longer only a placeholder; it exposes health, entitlements,
  AI, and engine routes.
- `packages/infrastructure-firebase/LegacyEngineDataSource.ts` provides a
  concrete adapter path for shared use cases.

### Current Architectural Friction

- `apps/web` still hosts multiple server routes under
  `/Users/marleite/workspace/aprova-flow/apps/web/src/app/api/`, including AI
  workloads and engine snapshot delivery.
- `apps/api` already exposes overlapping AI and engine routes under Fastify.
- This means route ownership is currently duplicated across two runtimes for
  adjacent responsibilities.

## Security, Authorization, And Commercial Trust

### Critical findings

- `/Users/marleite/workspace/aprova-flow/apps/api/src/app.ts` registers
  `firebaseAuth` with `allowSandbox: true` for the dedicated API.
- `/Users/marleite/workspace/aprova-flow/apps/api/src/plugins/firebase-auth.ts`
  accepts `x-aprovamind-user-id` as an auth bypass whenever sandbox is enabled.
- `/Users/marleite/workspace/aprova-flow/firestore.rules` currently allow
  `read, write` on `/user_stats/{userId}` for the owning user.
- `/Users/marleite/workspace/aprova-flow/apps/web/src/components/AccountPlanModal.tsx`
  calls `/Users/marleite/workspace/aprova-flow/apps/web/src/lib/firebase/entitlements.ts`
  to write `planTier` directly from the client path.

### Why this matters

- The dedicated API auth bypass means protected routes can be reached without a
  real Firebase token if the caller can set `x-aprovamind-user-id`.
- Because entitlement state and usage live in `user_stats`, end users can
  currently influence plan and quota state directly unless the deployment adds
  additional protection outside the repo.
- This pollutes beta learning and weakens any future commercial trust.

## Testability And Maintenance

### Strengths

- `/Users/marleite/workspace/aprova-flow/apps/web/tests/` contains meaningful
  coverage for domain and application rules, including billing entitlements and
  plan engine use cases.
- `/Users/marleite/workspace/aprova-flow/apps/api/src/app.test.ts` and the API
  entitlement data-source tests cover the dedicated backend baseline.

### Weaknesses

- Front-end route pages and journey-level flows have much thinner automated
  coverage than domain/application logic.
- `/Users/marleite/workspace/aprova-flow/apps/web/src/components/Dashboard.tsx`
  remains in the repository as a large orchestration surface even though the
  current route pages already replaced it.
- Several route pages use warning-only or empty `catch` blocks, making runtime
  failures harder to observe and reproduce.

## Performance

### Concrete risks observed

- `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/caderno-erros/page.tsx`
  loads wrong attempts first and then resolves each question in a serial `for`
  loop with per-item reads.
- `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/planner/page.tsx`
  computes plan stats by running multiple analytics fetches per plan, which
  grows with each additional edital.

### Current implication

- The beta may tolerate this today, but growth in question/error volume and
  multi-edital usage will amplify latency and operational cost.

## Observability

### Strengths

- `/Users/marleite/workspace/aprova-flow/apps/web/src/lib/server/aiRateLimit.ts`
  returns quota headers and uses `user_stats` to materialize current quota
  state.
- `/Users/marleite/workspace/aprova-flow/apps/web/src/lib/server/aiUsageStore.ts`
  persists AI usage events into `ai_usage_events`.
- `/Users/marleite/workspace/aprova-flow/docs/product/beta-metrics-roadmap.md`
  clearly describes what is already measurable.

### Gaps

- Product events for blocked features, upgrade CTA views/clicks, and plan
  status transitions are still missing from the current implementation.
- The current observability stack is stronger for AI cost and usage than for
  activation, retention, and commercial learning.

## Technical-System Verdict

- The repo already has a stronger architecture foundation than the UI alone
  suggests.
- The next major technical bottlenecks are trust-boundary hardening, runtime
  ownership cleanup, and the missing product-observability layer needed to make
  business decisions safely.
