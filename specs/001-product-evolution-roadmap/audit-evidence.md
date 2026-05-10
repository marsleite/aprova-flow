# Audit Evidence

## Audit Method

- Scope followed the approved spec: product value, UX/UI, onboarding and
  retention, architecture, technical quality, performance, observability,
  monetization, and scalability.
- The audit started with the main sequence
  `onboarding -> planner -> dashboard -> engine`.
- Findings below separate observed fact from inference and link back to concrete
  repository evidence.

## Ordered Product Areas

| Area ID | Name | Audit Goal | Priority Order | Primary Evidence |
|---|---|---|---|---|
| AREA-01 | ux-flows | Is the core journey coherent enough to create routine? | 1 | `evidence/core-journey.md`, `Sidebar.tsx`, `StudyJourneyCard.tsx` |
| AREA-02 | product-value | Does the current packaging reinforce the real core value? | 2 | `README.md`, landing/login pages, planner/dashboard/engine pages |
| AREA-03 | onboarding-retention | Does the first-run path lead users into repeated use? | 3 | login flow, beta access code, beta test docs |
| AREA-04 | monetization | Is the `free -> pro` ladder clear and trustworthy today? | 4 | entitlements matrix, settings/account modal, beta ops docs, rules |
| AREA-05 | architecture | Are runtime boundaries and ownership clear enough for safe evolution? | 5 | current architecture doc, web API routes, Fastify modules |
| AREA-06 | technical-quality | Is the codebase maintainable and testable enough for iteration? | 6 | shared packages, tests, legacy surfaces |
| AREA-07 | performance | Are there obvious growth bottlenecks in high-value flows? | 7 | planner page, caderno-erros page |
| AREA-08 | observability | Can the team learn from product behavior and blocked value? | 8 | AI telemetry code, beta metrics roadmap |
| AREA-09 | scalability | Can the current foundations support broader beta and future billing? | 9 | runtime duplication, beta operations, Firestore usage |

## Evidence Inventory

- Source catalog: `evidence/sources.md`
- Constraint catalog: `evidence/constraints.md`
- Runtime map: `evidence/system-map.md`
- Core journey notes: `evidence/core-journey.md`
- Product-system notes: `evidence/product-systems.md`
- Technical-system notes: `evidence/technical-systems.md`

## Consolidated Findings

### F-UX-01

- Type: `problem`
- Severity: `high`
- Area: `ux-flows`
- Summary: The product explains `planner -> dashboard -> engine`, but the real
  shell still sends users and nav priority through a different order.
- Affected personas: `iniciante`, `intermediario`, `avancado`
- Impacted journey: `onboarding`, `planner`, `dashboard`, `engine`
- Why it matters: Users have to reconstruct the mental model themselves, which
  increases activation friction and weakens recurring habit formation.
- Evidence: `evidence/core-journey.md`, `CODE-01`, `CODE-02`, `CODE-03`

### F-UX-02

- Type: `problem`
- Severity: `medium`
- Area: `ux-flows`
- Summary: Simulations still use two conceptual layers (`/simulations` overview
  and `/provas` execution hub) that are both valuable but not yet canonicalized.
- Affected personas: `intermediario`, `avancado`
- Impacted journey: `simulations`
- Why it matters: Discovery is acceptable, but the path from "understand" to
  "do" is less direct than necessary.
- Evidence: `CODE-04`, `evidence/product-systems.md`

### F-PV-01

- Type: `strength`
- Severity: `medium`
- Area: `product-value`
- Summary: The app already delivers a meaningful strategic-study product, not
  a thin timer or analytics shell.
- Affected personas: `iniciante`, `intermediario`, `avancado`
- Impacted journey: `planner`, `dashboard`, `engine`, `mentoring`, `simulations`
- Why it matters: The roadmap can focus on coherence and trust instead of
  inventing a missing core.
- Evidence: `README.md`, `CODE-03`, `CODE-04`, `CODE-05`

### F-PV-02

- Type: `inconsistency`
- Severity: `medium`
- Area: `product-value`
- Summary: Marketing and onboarding copy still foreground AI and multi-edital
  sophistication faster than the current roadmap strategy recommends.
- Affected personas: `iniciante`, `intermediario`
- Impacted journey: `onboarding`
- Why it matters: The product risks sounding broader and more complex than the
  clearest immediate value it already delivers.
- Evidence: `README.md`, `/Users/marleite/workspace/aprova-flow/apps/web/src/app/page.tsx`, `/Users/marleite/workspace/aprova-flow/apps/web/src/app/login/page.tsx`

### F-ONB-01

- Type: `problem`
- Severity: `high`
- Area: `onboarding-retention`
- Summary: Beta access is invite-only in practice, but the UI still behaves
  like open registration until the allowlist check rejects the user.
- Affected personas: `iniciante`, `intermediario`, `avancado`
- Impacted journey: `onboarding`
- Why it matters: The product spends trust on a flow that feels broken instead
  of intentionally gated.
- Evidence: `CODE-01`, `evidence/core-journey.md`

### F-MON-01

- Type: `strength`
- Severity: `medium`
- Area: `monetization`
- Summary: The intended plan ladder is already well-articulated across docs,
  contextual upgrade cards, and beta operations.
- Affected personas: `intermediario`, `avancado`
- Impacted journey: `planner`, `mentoring`, `simulations`, `settings`
- Why it matters: The team does not need to invent a packaging strategy from
  scratch; it needs better enforcement and better learning instrumentation.
- Evidence: `DOC-04`, `DOC-06`, `DOC-07`, `CODE-06`

### F-MON-02

- Type: `risk`
- Severity: `critical`
- Area: `monetization`
- Summary: End-user entitlement state is not sufficiently protected because
  `user_stats` is writable by the owner and the current account modal mutates
  `planTier` from the client path.
- Affected personas: `iniciante`, `intermediario`, `avancado`
- Impacted journey: `settings`, `billing`, `entitlements`
- Why it matters: This undermines fairness, quota enforcement, commercial
  learning, and trust in any future paid ladder.
- Evidence: `CODE-06`, `CODE-08`, `evidence/technical-systems.md`

### F-ARCH-01

- Type: `problem`
- Severity: `high`
- Area: `architecture`
- Summary: Route ownership is duplicated between web BFF routes and the
  dedicated Fastify API for adjacent AI and engine responsibilities.
- Affected personas: `intermediario`, `avancado`
- Impacted journey: `planner`, `engine`, `mentoring`, `simulations`
- Why it matters: It increases complexity around auth, observability, deploy,
  and future extraction work.
- Evidence: `DOC-05`, `CODE-07`, `evidence/system-map.md`

### F-ARCH-02

- Type: `inconsistency`
- Severity: `medium`
- Area: `architecture`
- Summary: Documentation and codebase shape are out of sync; the README still
  describes an older single-app structure and a legacy `Dashboard.tsx` remains
  in the repo without being used by current route pages.
- Affected personas: `intermediario`, `avancado`
- Impacted journey: `architecture`
- Why it matters: Drift increases onboarding cost for future contributors and
  makes planning decisions harder to ground quickly.
- Evidence: `README.md`, `CODE-11`, `DOC-05`

### F-SEC-01

- Type: `risk`
- Severity: `critical`
- Area: `architecture`
- Summary: The dedicated API is currently configured with sandbox auth bypass
  enabled for protected routes.
- Affected personas: `iniciante`, `intermediario`, `avancado`
- Impacted journey: `entitlements`, `ai`, `engine`
- Why it matters: Protected routes can be exercised without a real auth token
  if the sandbox header remains publicly reachable.
- Evidence: `CODE-07`, `evidence/technical-systems.md`

### F-TECH-01

- Type: `strength`
- Severity: `medium`
- Area: `technical-quality`
- Summary: Shared domain and application rules already have meaningful automated
  coverage, especially around engine and entitlements.
- Affected personas: `intermediario`, `avancado`
- Impacted journey: `technical-quality`
- Why it matters: Core business behavior is in better shape than the UI layer
  alone would suggest.
- Evidence: `CODE-09`, `packages/domain`, `packages/application`

### F-TECH-02

- Type: `problem`
- Severity: `medium`
- Area: `technical-quality`
- Summary: The most visible front-end flows still have much weaker regression
  coverage than domain/application logic.
- Affected personas: `iniciante`, `intermediario`, `avancado`
- Impacted journey: `onboarding`, `planner`, `dashboard`, `engine`, `settings`
- Why it matters: Journey-level regressions can slip through even while domain
  rules remain correct.
- Evidence: `CODE-09`, route pages under `apps/web/src/app/(app)/`

### F-PERF-01

- Type: `risk`
- Severity: `medium`
- Area: `performance`
- Summary: The error notebook still performs serial question lookups per wrong
  attempt, which will age poorly with larger beta volume.
- Affected personas: `intermediario`, `avancado`
- Impacted journey: `caderno-erros`
- Why it matters: Slower pro surfaces directly hurt perceived product
  quality and upgrade willingness.
- Evidence: `CODE-05`

### F-PERF-02

- Type: `risk`
- Severity: `medium`
- Area: `performance`
- Summary: Planner stats are loaded with repeated per-plan analytics queries,
  which scales linearly with the number of active plans.
- Affected personas: `avancado`
- Impacted journey: `planner`
- Why it matters: The product promises multi-edital sophistication, so this
  path needs to stay healthy as complexity increases.
- Evidence: `CODE-03`

### F-OBS-01

- Type: `strength`
- Severity: `medium`
- Area: `observability`
- Summary: AI usage, quota state, and usage-cost traces are already more
  measurable than many early-stage products.
- Affected personas: `intermediario`, `avancado`
- Impacted journey: `ai`, `entitlements`
- Why it matters: The team already has a reliable baseline for AI cost and
  operational quota tracking.
- Evidence: `DOC-03`, `CODE-10`

### F-OBS-02

- Type: `measurement-gap`
- Severity: `high`
- Area: `observability`
- Summary: The product still cannot reliably answer which blocked moments,
  upgrade surfaces, or quota collisions actually change user behavior.
- Affected personas: `iniciante`, `intermediario`, `avancado`
- Impacted journey: `onboarding`, `simulations`, `mentoring`, `settings`
- Why it matters: Without these events, monetization and retention decisions
  stay guess-heavy even when AI telemetry looks healthy.
- Evidence: `DOC-03`, `DOC-06`, `DOC-07`

## Measurement Gaps

- Missing product events:
  - `feature_blocked`
  - `upgrade_cta_viewed`
  - `upgrade_cta_clicked`
  - `ai_quota_exhausted`
  - `plan_status_changed`
  - `tester_subscription_updated`
- Missing consolidated product dashboard joining:
  - recurring usage of the core journey
  - blocked-feature events
  - upgrade intent
  - qualitative weekly beta review

## Manual Validation Notes

- This initiative produced analysis and roadmap artifacts only; no runtime
  behavior was changed as part of the audit itself.
- Findings marked `critical` were derived from direct code and rules review, not
  from runtime speculation.
- Historical product audit notes were treated as context and cross-checked
  against current code before being reused.
