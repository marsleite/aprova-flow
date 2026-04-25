# Tasks: Estabilizacao da Aplicacao

**Input**: Design documents from `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/`
**Prerequisites**: `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/plan.md`, `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/spec.md`, `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/research.md`, `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/data-model.md`, `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/contracts/stability-backlog.md`, `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/contracts/smoke-validation.md`, `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/quickstart.md`

**Tests**: Esta iniciativa inclui bug fixes e blindagem de regressao. Toda correcao em fluxo critico, contrato, API, entitlements ou gating MUST receber cobertura automatizada proporcional ao risco; tarefas documentais usam validacao manual registrada nos artefatos de estabilizacao.

**Organization**: Tasks grouped by user story so each story can be completed and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: Which user story this belongs to (`[US1]`, `[US2]`, `[US3]`)
- Include exact file paths in every task description

## Phase 1: Setup (Working Artifacts)

**Purpose**: Create the working files that will hold the stabilization ledger, fix batches, and validation evidence.

- [x] T001 Create `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/bugs/`, `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/validation/`, `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/bug-ledger.md`, `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/batches.md`, and `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/validation/closure-log.md` as the working outputs for the stabilization cycle
- [x] T002 Map the required bug fields from `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/contracts/stability-backlog.md` into the outline of `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/bug-ledger.md`
- [x] T003 [P] Map the required smoke fields and backlog-review checkpoints from `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/contracts/smoke-validation.md` into `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/validation/core-flow-smoke.md` and `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/validation/backlog-review.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the source map, triage rules, and baseline validation context that block all downstream work.

**CRITICAL**: No user story work should start before this phase is complete.

- [x] T004 Inventory the current core-flow source surfaces and existing regression touchpoints from `/Users/marleite/workspace/aprova-flow/apps/web/src/app/login/page.tsx`, `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/planner/page.tsx`, `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/dashboard/page.tsx`, `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/engine/page.tsx`, `/Users/marleite/workspace/aprova-flow/apps/web/src/components/PlanManager.tsx`, `/Users/marleite/workspace/aprova-flow/apps/web/src/components/Dashboard.tsx`, and `/Users/marleite/workspace/aprova-flow/apps/api/src/modules/engine/routes.ts` in `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/system-map.md`
- [x] T005 [P] Register the canonical checkpoints and blocking conditions for `login`, `planner`, `dashboard`, and `engine` from `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/spec.md`, `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/data-model.md`, and `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/quickstart.md` in `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/flow-checkpoints.md`
- [x] T006 [P] Register the baseline validation commands, account preconditions, and smoke preconditions from `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/plan.md` and `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/quickstart.md` in `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/validation/baseline.md`
- [x] T007 [P] Inventory auth, entitlement, quota, sandbox, and trust-boundary risk sources from `/Users/marleite/workspace/aprova-flow/apps/web/src/hooks/useEntitlements.ts`, `/Users/marleite/workspace/aprova-flow/apps/web/src/components/EntitlementSandboxCard.tsx`, `/Users/marleite/workspace/aprova-flow/apps/web/src/lib/entitlements.ts`, `/Users/marleite/workspace/aprova-flow/apps/api/src/modules/entitlements/`, `/Users/marleite/workspace/aprova-flow/apps/api/src/modules/engine/`, and `/Users/marleite/workspace/aprova-flow/firestore.rules` in `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/bugs/auth-entitlement-risks.md`
- [x] T008 Consolidate the triage rubric, priority rules, and lot entry/exit conventions from `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/research.md`, `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/data-model.md`, `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/contracts/stability-backlog.md`, and `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/contracts/smoke-validation.md` into `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/triage-rubric.md`

**Checkpoint**: The stabilization workspace has a stable source map, a fixed triage rubric, and a baseline validation protocol.

---

## Phase 3: User Story 1 - Fluxos Criticos Estaveis (Priority: P1) 🎯 MVP

**Goal**: Remove blockers, dead actions, and contradictory states from `login -> planner -> dashboard -> engine`.

**Independent Test**: A real user can complete `login -> planner -> dashboard -> engine` without blocker, dead-end, or action that looks enabled but does not reach the correct outcome.

### Evidence and Tests for User Story 1

- [x] T009 [P] [US1] Reproduce login and planner failures, including dead actions, gate incoherence, and visible console/runtime issues, in `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/bugs/core-flow-login-planner.md`
- [x] T010 [P] [US1] Reproduce dashboard and engine failures, including empty, contradictory, or API-linked blocking states, in `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/bugs/core-flow-dashboard-engine.md`
- [x] T011 [US1] Consolidate the P1 core-flow bugs, owners, dependencies, and suspected root causes from `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/bugs/core-flow-login-planner.md` and `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/bugs/core-flow-dashboard-engine.md` into `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/bug-ledger.md`
- [x] T012 [P] [US1] Add or update web regression coverage for core-flow gating, render-state, and warning-driven failures in `/Users/marleite/workspace/aprova-flow/apps/web/tests/stability/core-flow-regression.test.ts`
- [x] T013 [P] [US1] Add or update API regression coverage for engine and entitlement-backed core-flow routes in `/Users/marleite/workspace/aprova-flow/apps/api/src/core-flow.stability.test.ts`

### Implementation for User Story 1

- [x] T014 [US1] Fix the prioritized login and session-entry blockers from `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/bug-ledger.md` in `/Users/marleite/workspace/aprova-flow/apps/web/src/app/login/page.tsx`, `/Users/marleite/workspace/aprova-flow/apps/web/src/hooks/useEntitlements.ts`, and `/Users/marleite/workspace/aprova-flow/apps/web/src/lib/entitlement-sandbox.ts`
- [x] T015 [US1] Fix the prioritized planner blockers from `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/bug-ledger.md` in `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/planner/page.tsx`, `/Users/marleite/workspace/aprova-flow/apps/web/src/components/PlanManager.tsx`, and `/Users/marleite/workspace/aprova-flow/apps/web/src/lib/entitlements.ts`
- [x] T016 [US1] Fix the prioritized dashboard and engine blockers from `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/bug-ledger.md` in `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/dashboard/page.tsx`, `/Users/marleite/workspace/aprova-flow/apps/web/src/components/Dashboard.tsx`, `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/engine/page.tsx`, `/Users/marleite/workspace/aprova-flow/apps/web/src/app/api/engine/snapshot/route.ts`, and `/Users/marleite/workspace/aprova-flow/apps/api/src/modules/engine/routes.ts`
- [x] T017 [US1] Record the post-fix flow-chain smoke for `login -> planner -> dashboard -> engine` in `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/validation/core-flow-smoke.md` and register the pass/fail outcome in `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/validation/closure-log.md`

**Checkpoint**: User Story 1 is complete when the core journey is usable end-to-end and every closed P1 bug has evidence and a regression guard.

---

## Phase 4: User Story 2 - Backlog de Bugs Priorizado (Priority: P2)

**Goal**: Build a decision-ready backlog of real bugs beyond the first critical-flow slice, with severity, dependencies, and order of attack.

**Independent Test**: A reviewer can read the backlog and understand what should be fixed now, later, or deferred, without rediscovering the issue from code.

### Implementation for User Story 2

- [x] T018 [P] [US2] Audit secondary-surface bugs and recurring warnings from `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/`, `/Users/marleite/workspace/aprova-flow/apps/web/src/components/`, and `/Users/marleite/workspace/aprova-flow/apps/web/src/app/api/` into `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/bugs/secondary-surfaces.md`
- [x] T019 [P] [US2] Audit cross-layer contract, auth, entitlement, quota, and Firestore-rule risks from `/Users/marleite/workspace/aprova-flow/apps/api/src/modules/`, `/Users/marleite/workspace/aprova-flow/packages/contracts/src/`, `/Users/marleite/workspace/aprova-flow/packages/application/`, and `/Users/marleite/workspace/aprova-flow/firestore.rules` into `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/bugs/cross-layer-risks.md`
- [x] T020 [P] [US2] Audit regression-coverage gaps and observability blind spots from `/Users/marleite/workspace/aprova-flow/apps/web/tests/`, `/Users/marleite/workspace/aprova-flow/apps/api/src/`, `/Users/marleite/workspace/aprova-flow/docs/product/`, and `/Users/marleite/workspace/aprova-flow/docs/architecture/current-architecture.md` into `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/bugs/test-and-observability-gaps.md`
- [x] T021 [US2] Consolidate all mapped bugs into prioritized backlog order with severity, evidence, owner, dependency, and validation plan in `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/bug-ledger.md`
- [x] T022 [US2] Group the prioritized bugs into short fix batches with objective, dominant layer, entry criteria, and exit criteria in `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/batches.md`
- [x] T023 [US2] Validate `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/bug-ledger.md` and `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/batches.md` against `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/contracts/stability-backlog.md`, `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/research.md`, and `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/triage-rubric.md`, then capture deferred items and rationale in `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/validation/backlog-review.md`

**Checkpoint**: User Story 2 is complete when every known bug is traceable, prioritized, and sequenced into a defensible attack order.

---

## Phase 5: User Story 3 - Correcao com Blindagem de Regressao (Priority: P3)

**Goal**: Close stabilized bugs with repeatable guards, smoke evidence, and explicit reopen rules.

**Independent Test**: Every fixed bug leaves a validation trail, and an end-of-cycle regression pass can confirm that the corrected flows remain stable.

### Tests for User Story 3

- [x] T024 [P] [US3] Add or update reusable UI safety coverage for warning-free render and gate consistency in `/Users/marleite/workspace/aprova-flow/apps/web/tests/stability/ui-safety.test.ts`
- [x] T025 [P] [US3] Add or update reusable server-side coherence coverage for entitlement, quota, and engine-boundary behavior in `/Users/marleite/workspace/aprova-flow/apps/api/src/entitlement-stability.test.ts`

### Implementation for User Story 3

- [x] T026 [US3] Register the regression guards, smoke scope, and manual-validation exceptions for each fixed or deferred bug in `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/validation/regression-guards.md`
- [x] T027 [US3] Apply the closure protocol from `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/contracts/smoke-validation.md` to every fixed bug and update `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/validation/closure-log.md` with evidence links and reopen rules
- [x] T028 [US3] Run the end-of-cycle batch-regression pass across `/Users/marleite/workspace/aprova-flow/apps/web/` and `/Users/marleite/workspace/aprova-flow/apps/api/`, then capture the result in `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/validation/cycle-01-regression.md`

**Checkpoint**: User Story 3 is complete when bug closure no longer depends on memory or subjective impression.

---

## Phase 6: Polish & Cross-Cutting Validation

**Purpose**: Normalize the stabilization artifacts, sync docs, and close the cycle with explicit compliance evidence.

- [x] T029 [P] Normalize terminology, status names, and flow labels across `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/spec.md`, `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/plan.md`, `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/bug-ledger.md`, `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/batches.md`, and `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/validation/`
- [x] T030 Update `/Users/marleite/workspace/aprova-flow/docs/architecture/current-architecture.md` and the affected documents in `/Users/marleite/workspace/aprova-flow/docs/product/` when a closed batch changes ownership, gate behavior, observability expectations, or operational validation
- [x] T031 Run the final contract-compliance pass across `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/bug-ledger.md`, `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/batches.md`, `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/validation/`, and `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/quickstart.md`, confirming that every P1 fix has evidence, every deferred item has rationale, and every manual-only validation is justified

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** has no dependencies and should start immediately.
- **Phase 2: Foundational** depends on Phase 1 and blocks all user stories.
- **Phase 3: US1** depends on Phase 2 because the first cycle must lock the flow map, triage rubric, and baseline validation before fixing the core journey.
- **Phase 4: US2** depends on US1 evidence because the prioritized backlog must incorporate the already-mapped P1 failures and their root-cause learnings.
- **Phase 5: US3** depends on US1 fixes and US2 backlog structure because closure rules and reusable guards only make sense after bugs and batches are explicit.
- **Phase 6: Polish** depends on all user stories being complete.

### User Story Dependencies

- **US1 - Fluxos Criticos Estaveis**: starts after Foundational and delivers the MVP stabilization slice.
- **US2 - Backlog de Bugs Priorizado**: starts after US1 evidence is consolidated and expands the map into a broader attack plan.
- **US3 - Correcao com Blindagem de Regressao**: starts after US1 and US2 so it can bind real fixes to explicit guards and closure evidence.

### Within Each User Story

- Evidence and reproduction come before prioritization.
- Automated guards for risky bugs come before or alongside the fixes they protect.
- Core-flow fixes come before broad backlog expansion.
- Smoke validation and closure logging happen before a bug or batch can be marked done.

## Parallel Opportunities

- **Setup**: T003 can run in parallel with T002 after T001 creates the workspace.
- **Foundational**: T005, T006, and T007 can run in parallel after T004 defines the core source map.
- **US1**: T009 and T010 can run in parallel; T012 and T013 can run in parallel once T011 locks the P1 bug set.
- **US2**: T018, T019, and T020 can run in parallel because they populate different evidence files.
- **US3**: T024 and T025 can run in parallel because they target different runtimes and files.

## Parallel Example: User Story 1

```bash
Task: T009 Reproduce login and planner failures in bugs/core-flow-login-planner.md
Task: T010 Reproduce dashboard and engine failures in bugs/core-flow-dashboard-engine.md
```

## Parallel Example: User Story 2

```bash
Task: T018 Audit secondary-surface bugs in bugs/secondary-surfaces.md
Task: T019 Audit cross-layer risks in bugs/cross-layer-risks.md
Task: T020 Audit test and observability gaps in bugs/test-and-observability-gaps.md
```

## Parallel Example: User Story 3

```bash
Task: T024 Add UI safety coverage in apps/web/tests/stability/ui-safety.test.ts
Task: T025 Add server-side coherence coverage in apps/api/src/entitlement-stability.test.ts
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate the `login -> planner -> dashboard -> engine` chain with automated guards plus `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/validation/core-flow-smoke.md`
5. Stop and confirm the core journey is stable before expanding the backlog

### Incremental Delivery

1. Finish Setup and Foundational to lock the workspace, triage rubric, and smoke protocol
2. Deliver US1 to recover the core journey
3. Deliver US2 to expand the prioritized backlog without losing the P1 learnings
4. Deliver US3 to turn the fixes into a repeatable closure system
5. Finish with the cross-cutting validation and doc sync pass

### Team Strategy

1. One owner prepares the workspace and foundational artifacts
2. The first cycle then splits into core-flow reproduction, guard creation, and app/API fixes
3. After US1, the team can split by evidence lane for US2 and by runtime for US3 guards
4. A final reviewer closes the compliance and documentation pass before handoff

## Notes

- All tasks follow the mandatory checklist format with task ID, optional `[P]`, optional `[US#]`, and exact paths.
- The suggested MVP scope is **User Story 1 only**, because it restores the main journey before broader backlog expansion.
- Manual-only validation is allowed only for low-risk visual fixes and MUST be recorded in `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/validation/regression-guards.md` and `/Users/marleite/workspace/aprova-flow/specs/002-app-stabilization/validation/closure-log.md`.
