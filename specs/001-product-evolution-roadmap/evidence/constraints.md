# Audit Constraints And Guardrails

## Business Priorities

| ID | Constraint Type | Current Constraint | Why it matters |
|---|---|---|---|
| CON-01 | business | Retention, recurrence, and continuous routine are the primary tie-breakers for this roadmap. | Improvements that do not strengthen repeated usage should not outrank the core journey. |
| CON-02 | business | The roadmap must optimize for beginners, intermediate users, and advanced users without dropping the hybrid public already assumed by the spec. | Packaging and UX cannot overfit only the advanced multi-edital case. |
| CON-03 | business | `free -> pro` is the main commercial ladder; `premium` should come after the core ladder is clearer and more trustworthy. | Prevents premature premium expansion and keeps the roadmap anchored in the current commercial strategy. |
| CON-04 | business | The audit starts with `onboarding -> planner -> dashboard -> engine`, and adjacent areas should be interpreted from that core path first. | Avoids producing recommendations disconnected from the main product loop. |

## Operational Constraints

| ID | Constraint Type | Current Constraint | Why it matters |
|---|---|---|---|
| CON-05 | operations | Beta access is still controlled by a hardcoded allowlist in `/Users/marleite/workspace/aprova-flow/apps/web/src/lib/beta-access.ts`. | Access policy is operationally simple but creates onboarding and maintenance friction. |
| CON-06 | operations | Tester plan/status/usage operations are still manual and centered in `/settings`, as reinforced by `/Users/marleite/workspace/aprova-flow/docs/product/beta-operations-checklist.md`. | The beta learning loop depends on manual ops remaining stable until a real gateway exists. |
| CON-07 | operations | `apps/web` and `apps/api` are separately deployed, and the web still depends on Next API routes for several product-critical flows. | Runtime ownership cannot be changed carelessly without affecting deploy and auth behavior. |

## Technical Constraints

| ID | Constraint Type | Current Constraint | Why it matters |
|---|---|---|---|
| CON-08 | architecture | Ownership between `apps/web`, `apps/api`, and shared packages is still in consolidation. | This is the main technical limit already highlighted by the spec and plan. |
| CON-09 | architecture | `apps/api` already exposes AI, engine, and entitlement routes, while `apps/web` still hosts multiple overlapping server routes. | Creates duplicated ownership and complicates observability, auth, and maintenance. |
| CON-10 | commercial | `user_stats` is the current source of truth for plan tier, status-derived entitlements, and usage. | Any weak protection here directly affects monetization fairness and quota enforcement. |

## Measurement Constraints

| ID | Constraint Type | Current Constraint | Why it matters |
|---|---|---|---|
| CON-11 | measurement | AI usage and quota telemetry already exist, but product events for `feature_blocked`, upgrade CTA views/clicks, and commercial funnel moments do not. | The product can observe cost and usage, but still learns weakly from blocked value and upgrade intent. |
| CON-12 | measurement | Several route pages swallow fetch errors with empty `catch {}` or warning-only behavior. | Failures can stay invisible to both the user and the team, weakening diagnosis and product confidence. |

## Sequencing Guardrails

- No roadmap phase should recommend real gateway rollout before blocked-feature
  events, upgrade CTAs, and quota exhaustion signals are measurable.
- No roadmap phase should recommend deeper premium expansion before the core
  `planner -> dashboard -> engine` path becomes easier to discover and follow.
- No roadmap phase should treat current commercial or entitlement signals as
  trustworthy while end users can still influence entitlement state directly or
  while the dedicated API still accepts sandbox bypass in public paths.
