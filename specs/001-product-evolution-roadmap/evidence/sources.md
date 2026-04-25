# Evidence Sources

## Documentary Sources

| ID | Type | Reference | Confidence | Why it matters | Note |
|---|---|---|---|---|---|
| DOC-01 | doc | `/Users/marleite/workspace/aprova-flow/README.md` | medium | Captures the public product story, personas, legacy architecture narrative, and stated journey. | Useful for value proposition; partially outdated for current monorepo/runtime ownership. |
| DOC-02 | doc | `/Users/marleite/workspace/aprova-flow/docs/product/pre-launch-audit.md` | medium | Shows the last explicit horizontal product read before this audit. | Some issues listed there were already improved in code, so it is a historical baseline rather than the current source of truth. |
| DOC-03 | doc | `/Users/marleite/workspace/aprova-flow/docs/product/beta-metrics-roadmap.md` | high | Defines what is already measured and what still lacks instrumentation for beta learning. | Strong source for observability and monetization gaps. |
| DOC-04 | doc | `/Users/marleite/workspace/aprova-flow/docs/product/entitlements-matrix.md` | high | Defines the intended `free -> pro -> premium` ladder and server-side authorization expectations. | Strong source for commercial packaging and gating expectations. |
| DOC-05 | doc | `/Users/marleite/workspace/aprova-flow/docs/architecture/current-architecture.md` | high | Defines intended ownership between `apps/web`, `apps/api`, and shared packages. | Main architecture baseline for this audit. |
| DOC-06 | doc | `/Users/marleite/workspace/aprova-flow/docs/product/beta-test-plan.md` | high | Defines what beta should validate around activation, recurring usage, and upgrade desire. | Useful to connect roadmap sequencing with business learning goals. |
| DOC-07 | doc | `/Users/marleite/workspace/aprova-flow/docs/product/beta-operations-checklist.md` | high | Defines the current manual tester operation and minimum operational scenarios. | Useful to evaluate beta readiness and operational dependency. |

## Code Sources

| ID | Type | Reference | Confidence | Why it matters | Note |
|---|---|---|---|---|---|
| CODE-01 | code | `/Users/marleite/workspace/aprova-flow/apps/web/src/app/login/page.tsx`, `/Users/marleite/workspace/aprova-flow/apps/web/src/components/LoginScreen.tsx`, `/Users/marleite/workspace/aprova-flow/apps/web/src/hooks/useAuth.ts`, `/Users/marleite/workspace/aprova-flow/apps/web/src/lib/beta-access.ts` | high | Shows the real onboarding, login copy, beta access gating, and redirect behavior. | Key source for onboarding and first-run friction. |
| CODE-02 | code | `/Users/marleite/workspace/aprova-flow/apps/web/src/components/layout/Sidebar.tsx`, `/Users/marleite/workspace/aprova-flow/apps/web/src/components/StudyJourneyCard.tsx` | high | Shows the canonical journey story versus the actual navigation order. | Key source for coherence analysis. |
| CODE-03 | code | `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/planner/page.tsx`, `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/dashboard/page.tsx`, `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/engine/page.tsx` | high | Shows how the core loop is currently implemented. | Main source for `planner -> dashboard -> engine`. |
| CODE-04 | code | `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/simulations/page.tsx`, `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/provas/page.tsx` | high | Shows the split between overview and execution flows for simulations. | Key source for navigation and discovery analysis. |
| CODE-05 | code | `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/caderno-erros/page.tsx` | high | Shows premium gating, transparency of diagnosis sample, and query strategy. | Key source for performance and product maturity analysis. |
| CODE-06 | code | `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/settings/page.tsx`, `/Users/marleite/workspace/aprova-flow/apps/web/src/components/AccountPlanModal.tsx`, `/Users/marleite/workspace/aprova-flow/apps/web/src/lib/firebase/entitlements.ts`, `/Users/marleite/workspace/aprova-flow/apps/web/src/hooks/useEntitlements.ts` | high | Shows real monetization UX and entitlement source-of-truth behavior. | Key source for commercial trust and beta operations. |
| CODE-07 | code | `/Users/marleite/workspace/aprova-flow/apps/api/src/app.ts`, `/Users/marleite/workspace/aprova-flow/apps/api/src/plugins/firebase-auth.ts`, `/Users/marleite/workspace/aprova-flow/apps/api/src/modules/ai/routes.ts`, `/Users/marleite/workspace/aprova-flow/apps/api/src/modules/engine/routes.ts`, `/Users/marleite/workspace/aprova-flow/apps/api/src/modules/entitlements/routes.ts` | high | Shows the dedicated API, auth behavior, entitlement routes, and duplicated route ownership. | Key source for server-side trust boundaries. |
| CODE-08 | code | `/Users/marleite/workspace/aprova-flow/firestore.rules` | high | Defines whether plan and entitlement state are actually protected. | Critical source for monetization and authorization risk. |
| CODE-09 | code | `/Users/marleite/workspace/aprova-flow/apps/web/tests/`, `/Users/marleite/workspace/aprova-flow/apps/api/src/app.test.ts`, `/Users/marleite/workspace/aprova-flow/apps/api/src/modules/entitlements/*.test.ts` | high | Shows where automated coverage exists today. | Useful for testability and maintenance assessment. |
| CODE-10 | code | `/Users/marleite/workspace/aprova-flow/apps/web/src/lib/ai/metrics.ts`, `/Users/marleite/workspace/aprova-flow/apps/web/src/lib/server/aiUsageStore.ts`, `/Users/marleite/workspace/aprova-flow/apps/web/src/lib/server/aiRateLimit.ts` | high | Shows the current observability baseline around AI usage and quotas. | Strong source for what is already measurable. |
| CODE-11 | code | `/Users/marleite/workspace/aprova-flow/apps/web/src/components/Dashboard.tsx` | high | Shows a large legacy orchestration surface that is no longer imported by current route pages. | Useful as maintenance-drift evidence. |

## Confidence Notes

- Evidence tied to route/page/components and Firestore rules was treated as `high`
  confidence because it reflects the actual current behavior in the repository.
- Product and architecture docs were treated as `medium` or `high` depending on
  alignment with current code.
- Historical audit notes were kept as context, not as the current truth, when
  the code already showed a more recent state.
