# Tasks: App-Wide AI and Flow Stabilization

**Input**: Design documents from `/specs/003-fix-ai-app-flow/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Tests**: Automated tests are required because this feature changes AI behavior, app state, server-side route behavior, active edital gating, and bug fixes.
**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm current app surfaces and establish test targets before shared implementation begins.

- [x] T001 Review existing AI, Planner, Engine, and navigation entry points in `apps/web/src/components/DailyAiPlannerCard.tsx`, `apps/web/src/app/api/planner-daily/route.ts`, `apps/web/src/components/ChatPanel.tsx`, `apps/web/src/app/api/chat/route.ts`, `apps/web/src/app/(app)/engine/page.tsx`, and `apps/web/src/app/(app)/planner/page.tsx`
- [x] T002 [P] Review existing API route and usage-limit behavior in `apps/api/src/modules/ai/routes.ts`, `apps/api/src/modules/ai/ai-usage-store.ts`, `apps/api/src/modules/engine/routes.ts`, and `apps/api/src/app.test.ts`
- [x] T003 [P] Review existing stability helpers and tests in `apps/web/src/lib/stability/core-flow.ts`, `apps/web/tests/stability/core-flow-regression.test.ts`, and `apps/web/tests/stability/ui-safety.test.ts`
- [x] T004 [P] Capture the initial local validation checklist from `specs/003-fix-ai-app-flow/quickstart.md` into `specs/003-fix-ai-app-flow/verification-results.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared contracts and policy primitives that must exist before story implementation.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Create shared AI capability contract exports in `packages/contracts/src/ai/AiCapability.ts`
- [x] T006 Create shared daily plan eligibility and result contract exports in `packages/contracts/src/planner/DailyPlan.ts`
- [x] T007 Create shared localhost verification contract exports in `packages/contracts/src/stability/LocalhostVerification.ts`
- [x] T008 Update package barrel exports in `packages/contracts/src/index.ts`
- [x] T009 [P] Add contract type coverage for AI capability, daily plan, and verification records in `apps/web/tests/contracts/ai-flow-contracts.test.ts`
- [x] T010 [P] Add AI capability state normalization helpers in `packages/application/src/use-cases/ai/ResolveAiCapabilityState.ts`
- [x] T011 [P] Add daily plan eligibility helper in `packages/application/src/use-cases/planner/ResolveDailyPlanEligibility.ts`
- [x] T012 Update application exports in `packages/application/src/index.ts`
- [x] T013 [P] Add application coverage for AI capability state normalization in `apps/web/tests/application/ai/ResolveAiCapabilityState.test.ts`
- [x] T014 [P] Add application coverage for daily plan eligibility decisions in `apps/web/tests/application/planner/ResolveDailyPlanEligibility.test.ts`

**Checkpoint**: Shared contracts and application decision helpers exist and can be tested without UI or provider calls.

---

## Phase 3: User Story 1 - Generate a Daily Study Plan Reliably (Priority: P1) MVP

**Goal**: The "Gerar plano" action becomes available when the user has enough data and shows precise missing requirements or fallback behavior when it is not available.

**Independent Test**: Register manual activity, return to Plano Diário, verify the button state and copy, then trigger generation with success and AI-failure conditions.

### Tests for User Story 1

- [ ] T015 [P] [US1] Add planner eligibility UI coverage for missing data and sufficient activity in `apps/web/tests/components/DailyAiPlannerCard.test.tsx`
- [ ] T016 [P] [US1] Add planner daily route coverage for eligible, insufficient-data, and fallback states in `apps/web/tests/api/planner-daily-route.test.ts`
- [ ] T017 [P] [US1] Add manual question registration regression coverage for dependent plan state in `apps/web/tests/stability/core-flow-regression.test.ts`

### Implementation for User Story 1

- [x] T018 [P] [US1] Wire daily plan eligibility from shared contracts into `apps/web/src/components/DailyAiPlannerCard.tsx`
- [x] T019 [US1] Replace unexplained disabled "Gerar plano" behavior with missing-requirement messaging in `apps/web/src/components/DailyAiPlannerCard.tsx`
- [x] T020 [US1] Normalize `/api/planner-daily` responses to `DailyPlanResult` and preserve user-entered data on failure in `apps/web/src/app/api/planner-daily/route.ts`
- [x] T021 [US1] Add deterministic fallback plan generation for AI-unavailable states in `apps/web/src/app/api/planner-daily/route.ts`
- [x] T022 [US1] Ensure manual registration updates refresh dependent daily plan state in `apps/web/src/app/(app)/planner/page.tsx`

**Checkpoint**: User Story 1 is functional and testable independently.

---

## Phase 4: User Story 2 - Use AI Features Without Dead Ends (Priority: P1)

**Goal**: Every AI action returns useful guidance, a typed limitation, or a safe recovery path instead of generic internal errors.

**Independent Test**: Force AI unavailable, misconfigured, limited, unexpected failure, and success states, then verify each visible AI surface renders the correct user-facing outcome.

### Tests for User Story 2

- [x] T023 [P] [US2] Add AI route failure classification coverage in `apps/api/src/app.test.ts`
- [ ] T024 [P] [US2] Add web AI route failure classification coverage in `apps/web/tests/api/ai-failure-states.test.ts`
- [ ] T025 [P] [US2] Add Coach IA recoverable-state coverage in `apps/web/tests/components/ChatPanel.test.tsx`

### Implementation for User Story 2

- [x] T026 [P] [US2] Apply `AiCapabilityResponse` mapping to Fastify AI routes in `apps/api/src/modules/ai/routes.ts`
- [x] T027 [US2] Apply safe AI error normalization to web chat route in `apps/web/src/app/api/chat/route.ts`
- [x] T028 [US2] Apply safe AI error normalization to planner, smart schedule, weekly mentoring, and diagnosis routes in `apps/web/src/app/api/planner-daily/route.ts`, `apps/web/src/app/api/smart-schedule/route.ts`, `apps/web/src/app/api/weekly-mentoring/route.ts`, and `apps/web/src/app/api/error-diagnosis/route.ts`
- [x] T029 [US2] Replace generic Coach IA failure loop with typed recoverable states in `apps/web/src/components/ChatPanel.tsx`
- [x] T030 [US2] Replace generic AI error copy in focus and mentoring cards with typed recoverable states in `apps/web/src/components/SmartScheduleCard.tsx`, `apps/web/src/components/WeeklyMentoringCard.tsx`, and `apps/web/src/components/GeminiCoachCard.tsx`

**Checkpoint**: User Story 2 is functional and testable independently.

---

## Phase 5: User Story 3 - Keep Early AI Costs Controlled (Priority: P2)

**Goal**: Bounded AI actions become the primary early experience while open-ended chat is limited, disabled, or downgraded without blocking the core study workflow.

**Independent Test**: Review AI entry points and confirm that daily plan, focus allocation, and next-session recommendations are primary, while chat has clear limits or a useful disabled state.

### Tests for User Story 3

- [ ] T031 [P] [US3] Add chat entitlement and usage-boundary coverage in `apps/web/tests/server/aiRateLimit.test.ts`
- [ ] T032 [P] [US3] Add early AI surface prioritization coverage in `apps/web/tests/stability/ui-safety.test.ts`

### Implementation for User Story 3

- [ ] T033 [P] [US3] Add chat availability policy constants and copy in `apps/web/src/lib/ai/quota-feedback.ts`
- [ ] T034 [US3] Enforce chat bounded usage or disabled state in `apps/web/src/app/api/chat/route.ts`
- [ ] T035 [US3] Downgrade or hide open-ended chat entry points when unavailable in `apps/web/src/components/ChatPanel.tsx` and `apps/web/src/components/GeminiCoachCard.tsx`
- [ ] T036 [US3] Make bounded AI actions visually primary over chat in `apps/web/src/components/DailyAiPlannerCard.tsx`, `apps/web/src/components/SmartScheduleCard.tsx`, and `apps/web/src/components/WeeklyMentoringCard.tsx`

**Checkpoint**: User Story 3 is functional and testable independently.

---

## Phase 6: User Story 4 - Navigate Revision and Engine Flows Predictably (Priority: P2)

**Goal**: Revisão Geral and optimization actions either navigate to a relevant learning flow or explain the active edital requirement with a direct path to manage editais.

**Independent Test**: Trigger Revisão Geral and Engine actions with no active edital, incomplete edital, and active edital states, then verify destination and copy.

### Tests for User Story 4

- [x] T037 [P] [US4] Add active edital gating coverage in `apps/web/tests/stability/core-flow-regression.test.ts`
- [x] T038 [P] [US4] Add Engine empty-state route coverage in `apps/api/src/app.test.ts`
- [ ] T039 [P] [US4] Add Engine page empty-state coverage in `apps/web/tests/components/EnginePage.test.tsx`

### Implementation for User Story 4

- [x] T040 [P] [US4] Extend core-flow guidance for Revisão Geral and Engine active edital requirements in `apps/web/src/lib/stability/core-flow.ts`
- [x] T041 [US4] Update Planner recommendation actions to handle no-active-edital before routing in `apps/web/src/app/(app)/planner/page.tsx`
- [x] T042 [US4] Update Engine empty state with exact missing requirement and manage-editais path in `apps/web/src/app/(app)/engine/page.tsx`
- [x] T043 [US4] Update PlanEngine snapshot missing-data presentation in `apps/web/src/components/engine/PlanEngineSnapshotCard.tsx`
- [x] T044 [US4] Normalize Engine missing-active-edital API responses in `apps/api/src/modules/engine/routes.ts`

**Checkpoint**: User Story 4 is functional and testable independently.

---

## Phase 7: User Story 5 - Verify the Whole Local App Surface (Priority: P3)

**Goal**: Local web screens and API health/AI/Engine paths are checked with reproducible evidence after stabilization.

**Independent Test**: Run the local apps, visit each primary screen, exercise key actions, and record pass/fail outcomes using the verification contract.

### Tests for User Story 5

- [x] T045 [P] [US5] Add verification result schema coverage in `apps/web/tests/contracts/localhost-verification.test.ts`
- [x] T046 [P] [US5] Add API health and route classification coverage in `apps/api/src/core-flow.stability.test.ts`

### Implementation for User Story 5

- [x] T047 [P] [US5] Create local verification result template in `specs/003-fix-ai-app-flow/verification-results.md`
- [x] T048 [US5] Run the Planner, Dashboard, Engine, Mentoria, Analises, Historico, and edital management browser pass and record results in `specs/003-fix-ai-app-flow/verification-results.md`
- [x] T049 [US5] Run API health, AI, daily-plan, and Engine local checks and record results in `specs/003-fix-ai-app-flow/verification-results.md`
- [x] T050 [US5] Capture high-severity reproduction steps for any failures in `specs/003-fix-ai-app-flow/verification-results.md`

**Checkpoint**: User Story 5 is complete when the verification record is filled and any high-severity findings are reproducible.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, documentation, and validation across stories.

- [ ] T051 [P] Update architecture documentation for AI capability policy and chat cost control in `docs/architecture/current-architecture.md`
- [ ] T052 [P] Update deploy/environment documentation if AI or API env expectations changed in `docs/architecture/deploy-and-environments.md`
- [ ] T053 [P] Update launch notes with the final AI product decision in `docs/launch.md`
- [x] T054 Run full web test suite defined in `apps/web/package.json` with `npm run test:run -w @aprovamind/web`
- [x] T055 Run full API test suite defined in `apps/api/package.json` with `npm run test -w @aprovamind/api`
- [x] T056 Run lint command defined in root `package.json` with `npm run lint`
- [x] T057 Review user-facing Portuguese copy for all AI and empty states in `apps/web/src/components/DailyAiPlannerCard.tsx`, `apps/web/src/components/ChatPanel.tsx`, `apps/web/src/components/SmartScheduleCard.tsx`, `apps/web/src/components/WeeklyMentoringCard.tsx`, and `apps/web/src/app/(app)/engine/page.tsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **User Stories (Phase 3+)**: Depend on Foundational completion.
- **Polish (Phase 8)**: Depends on all desired user stories.

### User Story Dependencies

- **US1 Generate a Daily Study Plan Reliably (P1)**: Starts after Foundational; recommended MVP.
- **US2 Use AI Features Without Dead Ends (P1)**: Starts after Foundational; can run in parallel with US1 after shared contracts exist.
- **US3 Keep Early AI Costs Controlled (P2)**: Starts after Foundational; benefits from US2 normalization but remains independently testable.
- **US4 Navigate Revision and Engine Flows Predictably (P2)**: Starts after Foundational; independent from chat/cost work.
- **US5 Verify the Whole Local App Surface (P3)**: Best after US1-US4, but template and schema tasks can begin earlier.

### Parallel Opportunities

- Setup review tasks T002-T004 can run in parallel.
- Foundational contract, application helper, and test tasks T009-T014 can run in parallel after T005-T008 are drafted.
- US1 tests T015-T017 can run in parallel.
- US2 tests T023-T025 and route/component implementation tasks T026-T030 can be split by surface.
- US3 tests T031-T032 can run in parallel with policy work T033.
- US4 tests T037-T039 can run in parallel with core-flow guidance T040.
- US5 schema/template work T045-T047 can run before the full browser/API pass.

---

## Parallel Example: User Story 1

```bash
Task: "T015 Add planner eligibility UI coverage in apps/web/tests/components/DailyAiPlannerCard.test.tsx"
Task: "T016 Add planner daily route coverage in apps/web/tests/api/planner-daily-route.test.ts"
Task: "T017 Add manual question registration regression coverage in apps/web/tests/stability/core-flow-regression.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "T023 Add AI route failure classification coverage in apps/api/src/app.test.ts"
Task: "T024 Add web AI route failure classification coverage in apps/web/tests/api/ai-failure-states.test.ts"
Task: "T025 Add Coach IA recoverable-state coverage in apps/web/tests/components/ChatPanel.test.tsx"
```

## Parallel Example: User Story 4

```bash
Task: "T037 Add active edital gating coverage in apps/web/tests/stability/core-flow-regression.test.ts"
Task: "T038 Add Engine empty-state route coverage in apps/api/src/app.test.ts"
Task: "T039 Add Engine page empty-state coverage in apps/web/tests/components/EnginePage.test.tsx"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Implement US1 so Plano Diário becomes usable or clearly explains missing requirements.
3. Validate US1 independently with automated tests and a Planner browser pass.

### Incremental Delivery

1. Deliver US1 for the broken daily plan action.
2. Deliver US2 to remove AI dead ends and generic internal errors.
3. Deliver US3 to control early AI chat cost exposure.
4. Deliver US4 to repair Revisão Geral/Engine navigation expectations.
5. Deliver US5 to record the full localhost web/API verification pass.

### Final Validation

Run:

```bash
npm run test:run -w @aprovamind/web
npm run test -w @aprovamind/api
npm run lint
```

Then complete the browser/API checks in `specs/003-fix-ai-app-flow/verification-results.md`.
