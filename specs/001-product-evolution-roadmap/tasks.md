# Tasks: Reavaliacao e Roadmap do Produto

**Input**: Design documents from `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/`
**Prerequisites**: `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/plan.md`, `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/spec.md`, `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/research.md`, `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/data-model.md`, `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/contracts/roadmap-deliverable.md`, `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/quickstart.md`

**Tests**: Esta iniciativa nao altera runtime. A validacao e manual e deve ser registrada ao longo da execucao em `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/roadmap.md` e `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/audit-evidence.md`.

**Organization**: Tasks grouped by user story so each story can be completed and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`)
- Include exact file paths in every task description

## Phase 1: Setup (Working Artifacts)

**Purpose**: Create the working structure that will hold evidence, prioritization, and the final roadmap deliverable.

- [x] T001 Create `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/evidence/`, `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/opportunities/`, `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/audit-evidence.md`, `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/phases.md`, `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/dependency-order.md`, and `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/roadmap.md` as the working outputs for the audit
- [x] T002 Map the 8 required sections from `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/contracts/roadmap-deliverable.md` into the outline of `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/roadmap.md`
- [x] T003 Mirror the `ProductArea`, `EvidenceSource`, `Finding`, `Opportunity`, `Constraint`, and `RoadmapPhase` structures from `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/data-model.md` into reusable templates inside `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/audit-evidence.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the evidence map, guardrails, and scoring rules that block all downstream audit work.

**CRITICAL**: No user story work should start before this phase is complete.

- [x] T004 Inventory the documentary evidence from `/Users/marleite/workspace/aprova-flow/README.md`, `/Users/marleite/workspace/aprova-flow/docs/product/pre-launch-audit.md`, `/Users/marleite/workspace/aprova-flow/docs/product/beta-metrics-roadmap.md`, `/Users/marleite/workspace/aprova-flow/docs/product/entitlements-matrix.md`, and `/Users/marleite/workspace/aprova-flow/docs/architecture/current-architecture.md` in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/evidence/sources.md`
- [x] T005 [P] Register business priorities and guardrails from `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/spec.md`, `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/plan.md`, and `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/research.md` in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/evidence/constraints.md`
- [x] T006 [P] Map the current code surfaces in `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/`, `/Users/marleite/workspace/aprova-flow/apps/web/src/components/`, `/Users/marleite/workspace/aprova-flow/apps/api/src/`, `/Users/marleite/workspace/aprova-flow/packages/domain/`, `/Users/marleite/workspace/aprova-flow/packages/application/`, `/Users/marleite/workspace/aprova-flow/packages/contracts/`, and `/Users/marleite/workspace/aprova-flow/packages/ai-gateway/` inside `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/evidence/system-map.md`
- [x] T007 Consolidate the ordered audit areas, evidence inventory, and current constraints from `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/evidence/sources.md`, `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/evidence/constraints.md`, and `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/evidence/system-map.md` into `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/audit-evidence.md`
- [x] T008 [P] Define the scoring rubric for `impact`, `effort`, `risk`, `dependency`, and `category` from `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/contracts/roadmap-deliverable.md` in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/opportunities/README.md`

**Checkpoint**: The audit has a stable evidence map, explicit constraints, and a scoring system that can support all user stories.

---

## Phase 3: User Story 1 - Diagnostico Confiavel (Priority: P1) 🎯 MVP

**Goal**: Produce a state-of-the-product diagnosis grounded in the current application, documentation, and available signals.

**Independent Test**: A reviewer can read `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/roadmap.md` and identify, for each required audit area, the current state, main strengths, main weaknesses, risks, and evidence gaps without relying on generic assumptions.

- [x] T009 [P] [US1] Audit the main journey `onboarding -> planner -> dashboard -> engine` across `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/`, `/Users/marleite/workspace/aprova-flow/apps/web/src/components/`, and `/Users/marleite/workspace/aprova-flow/docs/product/pre-launch-audit.md` in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/evidence/core-journey.md`
- [x] T010 [P] [US1] Audit product value, UX/UI, onboarding-retention, and monetization evidence from `/Users/marleite/workspace/aprova-flow/README.md`, `/Users/marleite/workspace/aprova-flow/docs/product/pre-launch-audit.md`, `/Users/marleite/workspace/aprova-flow/docs/product/entitlements-matrix.md`, and `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/` in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/evidence/product-systems.md`
- [x] T011 [P] [US1] Audit architecture, code organization, testability, performance, observability, and scalability evidence from `/Users/marleite/workspace/aprova-flow/docs/architecture/current-architecture.md`, `/Users/marleite/workspace/aprova-flow/docs/product/beta-metrics-roadmap.md`, `/Users/marleite/workspace/aprova-flow/apps/api/src/`, `/Users/marleite/workspace/aprova-flow/packages/domain/`, `/Users/marleite/workspace/aprova-flow/packages/application/`, and `/Users/marleite/workspace/aprova-flow/packages/contracts/` in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/evidence/technical-systems.md`
- [x] T012 [US1] Consolidate `strength`, `problem`, `risk`, `inconsistency`, and `measurement-gap` findings from `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/evidence/core-journey.md`, `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/evidence/product-systems.md`, and `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/evidence/technical-systems.md` in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/audit-evidence.md`
- [x] T013 [US1] Draft sections `Diagnostico do estado atual`, `Pontos fortes`, and `Problemas e riscos` in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/roadmap.md` from the validated findings in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/audit-evidence.md`
- [x] T014 [US1] Validate sections 1-3 of `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/roadmap.md` against `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/contracts/roadmap-deliverable.md` and record any remaining evidence gaps or manual-validation notes in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/audit-evidence.md`

**Checkpoint**: User Story 1 is complete when the diagnosis can stand on its own as a reliable picture of the current product.

---

## Phase 4: User Story 2 - Priorizacao Acionavel (Priority: P2)

**Goal**: Turn the diagnosis into a prioritized set of opportunities with enough context to support product and engineering decisions.

**Independent Test**: A reviewer can read the opportunities and decide what to do now, later, or not yet by using only the documented value, impact, effort, risk, and dependency data.

- [x] T015 [P] [US2] Derive quick wins from `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/audit-evidence.md` and document them with `impact`, `effort`, `risk`, `dependency`, `expected_user_value`, and `expected_signal` in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/opportunities/quick-wins.md`
- [x] T016 [P] [US2] Derive structural improvements from `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/audit-evidence.md` and document them with `impact`, `effort`, `risk`, `dependency`, `business_goal`, and `expected_signal` in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/opportunities/structural.md`
- [x] T017 [P] [US2] Derive strategic improvements from `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/audit-evidence.md` and document them with `impact`, `effort`, `risk`, `dependency`, `business_goal`, and `expected_signal` in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/opportunities/strategic.md`
- [x] T018 [US2] Consolidate tradeoffs, dependency notes, and sequencing rationale from `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/opportunities/quick-wins.md`, `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/opportunities/structural.md`, and `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/opportunities/strategic.md` in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/opportunities/README.md`
- [x] T019 [US2] Draft sections `Quick wins`, `Melhorias estruturais`, and `Melhorias estrategicas` in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/roadmap.md` from the categorized opportunities in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/opportunities/`
- [x] T020 [US2] Validate sections 4-6 of `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/roadmap.md` against the scoring taxonomy in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/contracts/roadmap-deliverable.md` and the opportunity rules in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/data-model.md`

**Checkpoint**: User Story 2 is complete when every relevant opportunity is clearly categorized and decision-ready.

---

## Phase 5: User Story 3 - Roadmap de Evolucao (Priority: P3)

**Goal**: Sequence the prioritized opportunities into phases with clear dependencies, entry criteria, and reasons for the chosen order.

**Independent Test**: Two reviewers can read the final roadmap and arrive at the same interpretation of what should happen first, what must wait, and why the execution order is the safest one.

- [x] T021 [P] [US3] Define phase candidates, objectives, included opportunities, entry criteria, and exit signals from `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/opportunities/README.md` in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/phases.md`
- [x] T022 [P] [US3] Define the dependency graph and execution-order rationale from `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/spec.md`, `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/research.md`, and `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/opportunities/README.md` in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/dependency-order.md`
- [x] T023 [US3] Draft sections `Roadmap por fases` and `Dependencias e ordem recomendada de execucao` in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/roadmap.md` from `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/phases.md` and `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/dependency-order.md`
- [x] T024 [US3] Validate sections 7-8 of `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/roadmap.md` against the retention-first, `free -> pro` first, beta-manual monetization, and architecture-boundary rules recorded in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/spec.md` and `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/research.md`

**Checkpoint**: User Story 3 is complete when the roadmap phases and sequencing rationale are unambiguous and evidence-backed.

---

## Phase 6: Polish & Cross-Cutting Validation

**Purpose**: Ensure the deliverable is complete, traceable, and ready for execution handoff.

- [x] T025 Run a full contract-compliance pass across `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/roadmap.md` and `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/audit-evidence.md`, confirming all 8 required sections, evidence-versus-inference separation, and explicit measurement gaps
- [x] T026 Normalize terminology, canonical journey names, and business-priority wording across `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/spec.md`, `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/plan.md`, `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/audit-evidence.md`, `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/opportunities/README.md`, `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/phases.md`, `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/dependency-order.md`, and `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/roadmap.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** has no dependencies and should start immediately.
- **Phase 2: Foundational** depends on Phase 1 and blocks all user stories.
- **Phase 3: US1** depends on Phase 2 because the diagnosis needs the evidence map and constraints first.
- **Phase 4: US2** depends on US1 because prioritization needs validated findings before it can score opportunities.
- **Phase 5: US3** depends on US2 because the roadmap phases must be built from already-prioritized opportunities.
- **Phase 6: Polish** depends on the completion of all user stories.

### User Story Dependencies

- **US1 - Diagnostico Confiavel**: starts after Foundational and produces the base evidence and diagnosis.
- **US2 - Priorizacao Acionavel**: starts after US1 and converts findings into a scored opportunity backlog.
- **US3 - Roadmap de Evolucao**: starts after US2 and sequences the scored opportunities into phases.

### Within Each User Story

- Build the evidence or category-specific working files before consolidating them into `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/roadmap.md`.
- Validate each story against its independent test before starting the next one.
- Keep the main business tie-breakers explicit: retention and recurrence first, journey coherence before expansion, and `free -> pro` learning before a real gateway rollout.

## Parallel Opportunities

- **Foundational**: T005 and T006 can run in parallel after T004; T008 can also run in parallel once the contract is loaded.
- **US1**: T009, T010, and T011 can run in parallel because they populate different evidence files.
- **US2**: T015, T016, and T017 can run in parallel because they populate different opportunity files.
- **US3**: T021 and T022 can run in parallel because phase design and dependency rationale are tracked in different files.

## Parallel Example: User Story 1

```bash
Task: T009 Audit the main journey in evidence/core-journey.md
Task: T010 Audit product systems in evidence/product-systems.md
Task: T011 Audit technical systems in evidence/technical-systems.md
```

## Parallel Example: User Story 2

```bash
Task: T015 Derive quick wins in opportunities/quick-wins.md
Task: T016 Derive structural improvements in opportunities/structural.md
Task: T017 Derive strategic improvements in opportunities/strategic.md
```

## Parallel Example: User Story 3

```bash
Task: T021 Define roadmap phases in phases.md
Task: T022 Define dependency order in dependency-order.md
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate that `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/roadmap.md` already contains a trustworthy diagnosis before moving on

### Incremental Delivery

1. Finish Setup and Foundational to lock the audit method and source map
2. Deliver US1 to establish the diagnosis of the current state
3. Deliver US2 to turn the diagnosis into a decision-ready backlog
4. Deliver US3 to sequence the backlog into a phased roadmap
5. Finish with the cross-cutting validation pass

### Team Strategy

1. One owner sets up the working artifacts and foundational evidence map
2. The audit can then split by evidence lane in US1, by opportunity category in US2, and by phase-versus-dependency design in US3
3. A final reviewer closes the contract-compliance and terminology pass before handoff

## Notes

- All tasks follow the mandatory checklist format with task ID, optional `[P]`, optional `[US#]`, and exact file paths.
- Manual validation is intentional here because the initiative produces analysis artifacts instead of runtime behavior.
- If the completed audit reveals contradictions in `/Users/marleite/workspace/aprova-flow/README.md` or `/Users/marleite/workspace/aprova-flow/docs/`, capture them in `/Users/marleite/workspace/aprova-flow/specs/001-product-evolution-roadmap/roadmap.md` as follow-up work instead of editing product docs mid-audit.
