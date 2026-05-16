# Tasks: Economic AI Gateway

**Input**: Design documents from `/specs/004-economic-ai-gateway/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required by the specification for routing, budget enforcement, fallback selection, usage event recording, admin summaries, and route integration without live external AI calls.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the baseline and prevent accidental drift before changing AI behavior.

- [x] T001 Inspect current AI entry points and record migration notes in `specs/004-economic-ai-gateway/implementation-notes.md`
- [x] T002 [P] Verify package exports and build entry points for `packages/ai-gateway/src/index.ts`
- [x] T003 [P] Verify existing web AI proxy usage in `apps/web/src/lib/server/dedicatedAi.ts`
- [x] T004 [P] Verify existing API AI usage persistence in `apps/api/src/modules/ai/ai-usage-store.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared contracts, decision types, pricing, and test scaffolding that all stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Add AI economy decision contracts in `packages/contracts/src/ai/AiEconomy.ts`
- [x] T006 Export AI economy contracts from `packages/contracts/src/index.ts`
- [x] T007 Add gateway decision, budget, provider profile, and usage event types in `packages/ai-gateway/src/types.ts`
- [x] T008 [P] Extend model pricing for Gemini Flash-Lite, Qwen Flash/Qwen 3.5 Flash, DeepSeek Chat, GPT-5 nano, and GPT-5 mini in `packages/ai-gateway/src/pricing.ts`
- [x] T009 [P] Add deterministic token and request-cost estimation helpers in `packages/ai-gateway/src/metrics.ts`
- [x] T010 Add task policy defaults for model choice, max output, fallback permission, and estimated request size in `packages/ai-gateway/src/gateway.ts`
- [x] T011 [P] Add gateway routing tests for default OpenRouter and task-specific provider/model resolution in `packages/ai-gateway/src/gateway.test.ts`
- [x] T012 [P] Add pricing and cost estimation tests in `packages/ai-gateway/src/pricing.test.ts`
- [x] T013 Update web AI re-export wrappers to use package gateway contracts in `apps/web/src/lib/ai/index.ts`

**Checkpoint**: Foundation ready; shared AI decision and cost primitives are available for all stories.

---

## Phase 3: User Story 1 - Keep Critical Study Flows Working (Priority: P1) MVP

**Goal**: Daily plan, smart schedule, weekly mentoring, and diagnosis keep returning useful guidance when the provider fails or budget is exhausted.

**Independent Test**: Simulate provider failure and exhausted budget, then confirm each critical flow returns a local fallback or clear unavailable state without raw provider errors.

### Tests for User Story 1

- [x] T014 [P] [US1] Add fallback contract tests for AI decision outcomes in `apps/web/tests/contracts/ai-economy-contracts.test.ts`
- [x] T015 [P] [US1] Add daily plan provider-failure fallback coverage in `apps/web/tests/api/planner-daily-route.test.ts`
- [x] T016 [P] [US1] Add smart schedule provider-failure fallback coverage in `apps/web/tests/api/smart-schedule-route.test.ts`
- [x] T017 [P] [US1] Add weekly mentoring provider-failure fallback coverage in `apps/web/tests/api/weekly-mentoring-route.test.ts`
- [x] T018 [P] [US1] Add error diagnosis provider-failure unavailable/fallback coverage in `apps/web/tests/api/error-diagnosis-route.test.ts`

### Implementation for User Story 1

- [x] T019 [P] [US1] Add fallback response helpers for critical tasks in `packages/application/src/use-cases/ai/ResolveAiFallbackResponse.ts`
- [x] T020 [P] [US1] Export fallback response use case from `packages/application/src/index.ts`
- [x] T021 [US1] Extend `runAiText` to return normalized success, fallback, failed, and budget-block statuses in `packages/ai-gateway/src/gateway.ts`
- [x] T022 [US1] Wire provider failure normalization through the API AI route in `apps/api/src/modules/ai/routes.ts`
- [x] T023 [US1] Update daily plan route to call the normalized AI decision path and preserve deterministic fallback in `apps/web/src/app/api/planner-daily/route.ts`
- [x] T024 [US1] Update smart schedule route to use normalized fallback/unavailable handling in `apps/web/src/app/api/smart-schedule/route.ts`
- [x] T025 [US1] Update weekly mentoring route to use normalized fallback/unavailable handling in `apps/web/src/app/api/weekly-mentoring/route.ts`
- [x] T026 [US1] Update error diagnosis route to use normalized fallback/unavailable handling in `apps/web/src/app/api/error-diagnosis/route.ts`
- [x] T027 [US1] Ensure UI fallback copy is displayed as resilient guidance in `apps/web/src/components/DailyAiPlannerCard.tsx`
- [x] T028 [US1] Ensure smart schedule and mentoring components render fallback/unavailable states cleanly in `apps/web/src/components/SmartScheduleCard.tsx`
- [x] T029 [US1] Ensure mentoring fallback/unavailable states render cleanly in `apps/web/src/components/WeeklyMentoringCard.tsx`

**Checkpoint**: Critical study flows are independently usable without live AI success.

---

## Phase 4: User Story 2 - Control AI Spend Before It Exceeds Revenue (Priority: P1)

**Goal**: User daily and global monthly AI budgets block paid usage before external calls and record the block.

**Independent Test**: Configure low budgets, send requests until budget is exhausted, and verify paid calls stop while critical fallbacks and friendly messages continue.

### Tests for User Story 2

- [x] T030 [P] [US2] Add budget policy tests in `packages/domain/src/ai/AiBudgetPolicy.test.ts`
- [x] T031 [P] [US2] Add gateway budget-block tests in `packages/ai-gateway/src/gateway-budget.test.ts`
- [x] T032 [P] [US2] Add API usage-event persistence tests for blocked and fallback statuses in `apps/api/src/modules/ai/ai-usage-store.test.ts`
- [x] T033 [P] [US2] Add web rate-limit/budget response tests in `apps/web/tests/server/aiBudgetPolicy.test.ts`

### Implementation for User Story 2

- [x] T034 [P] [US2] Implement AI budget policy rules in `packages/domain/src/ai/AiBudgetPolicy.ts`
- [x] T035 [P] [US2] Export AI budget policy from `packages/domain/src/index.ts`
- [x] T036 [US2] Add AI budget decision orchestration in `packages/application/src/use-cases/ai/ResolveAiBudgetDecision.ts`
- [x] T037 [US2] Export AI budget decision use case from `packages/application/src/index.ts`
- [x] T038 [US2] Add environment-backed budget configuration parsing in `packages/ai-gateway/src/gateway.ts`
- [x] T039 [US2] Enforce pre-call budget decisions and blocked responses in `packages/ai-gateway/src/gateway.ts`
- [x] T040 [US2] Extend AI usage event schema/status handling in `packages/ai-gateway/src/types.ts`
- [x] T041 [US2] Persist blocked, fallback, failed, and success AI events in `apps/api/src/modules/ai/routes.ts`
- [x] T042 [US2] Add budget-aware response handling to web dedicated AI client in `apps/web/src/lib/server/dedicatedAi.ts`
- [x] T043 [US2] Add user-facing budget copy helper in `apps/web/src/lib/ai/quota-feedback.ts`
- [x] T044 [US2] Apply budget-aware chat response behavior in `apps/web/src/app/api/chat/route.ts`

**Checkpoint**: Paid AI usage is budget-gated and auditable before the provider is called.

---

## Phase 5: User Story 3 - Measure AI Cost and Reliability (Priority: P2)

**Goal**: Admin can review AI cost, usage, failures, fallbacks, and budget blocks for 7/14/30 day windows.

**Independent Test**: Seed successful, failed, fallback, and budget-block events, then confirm admin summaries group them by task and provider/model with partial-data warnings.

### Tests for User Story 3

- [x] T045 [P] [US3] Add beta/admin AI summary aggregation tests in `apps/api/src/modules/entitlements/beta-signals.test.ts`
- [x] T046 [P] [US3] Add web Firebase AI usage aggregation tests in `apps/web/tests/firebase/beta-signals.test.ts`
- [x] T047 [P] [US3] Add BetaSignalsCard rendering coverage for cost, fallback, failure, and budget-block metrics in `apps/web/tests/components/BetaSignalsCard.test.tsx`

### Implementation for User Story 3

- [x] T048 [US3] Extend AI usage Firestore store to persist new status fields in `apps/api/src/modules/ai/ai-usage-store.ts`
- [x] T049 [US3] Extend beta signal aggregation for AI task/provider/fallback/budget metrics in `apps/api/src/modules/entitlements/beta-signals.ts`
- [x] T050 [US3] Extend shared beta signal contracts with AI summary fields in `packages/contracts/src/analytics/BetaSignals.ts`
- [x] T051 [US3] Update web Firebase AI usage summary mapping in `apps/web/src/lib/firebase/aiUsage.ts`
- [x] T052 [US3] Render AI cost, provider reliability, fallback rate, and budget blocks in `apps/web/src/components/BetaSignalsCard.tsx`
- [x] T053 [US3] Preserve partial-data warning behavior for unavailable AI usage sources in `apps/web/src/components/BetaSignalsCard.tsx`

**Checkpoint**: Admin/beta panel shows operational AI cost and reliability signals.

---

## Phase 6: User Story 4 - Use Guided AI Instead of Open-Ended Chat (Priority: P2)

**Goal**: Coach IA favors concise guided study actions and handles budget/fallback states without encouraging expensive chat loops.

**Independent Test**: Open Coach IA, use guided actions, and verify at least four one-click intents produce concise budget-aware responses.

### Tests for User Story 4

- [x] T054 [P] [US4] Add guided action rendering tests for Coach IA in `apps/web/tests/components/ChatPanel.test.tsx`
- [x] T055 [P] [US4] Add concise chat prompt/max-output behavior tests in `apps/web/tests/api/chat-route.test.ts`

### Implementation for User Story 4

- [x] T056 [US4] Add guided Coach IA action definitions in `apps/web/src/components/ChatPanel.tsx`
- [x] T057 [US4] Add guided action click handling and prompt shaping in `apps/web/src/components/ChatPanel.tsx`
- [x] T058 [US4] Lower default chat answer size and attach task intent metadata in `apps/web/src/app/api/chat/route.ts`
- [x] T059 [US4] Display provider/budget/fallback status as helpful operational copy in `apps/web/src/components/ChatPanel.tsx`
- [x] T060 [US4] Update Coach IA entry card copy to emphasize guided actions in `apps/web/src/components/GeminiCoachCard.tsx`

**Checkpoint**: Coach IA is guided-first and lower-cost while preserving free-form chat as secondary.

---

## Phase 7: User Story 5 - Change AI Provider Without Product Disruption (Priority: P3)

**Goal**: Product owner can safely assign tasks to cheaper provider profiles such as Qwen or DeepSeek without changing the student-facing workflow.

**Independent Test**: Change task provider/model configuration in a safe environment, call a non-critical task, and confirm behavior, telemetry, and fallback remain stable.

### Tests for User Story 5

- [x] T061 [P] [US5] Add OpenAI-compatible provider configuration tests in `packages/ai-gateway/src/providers/openai.test.ts`
- [x] T062 [P] [US5] Add task provider override tests for Qwen/DeepSeek-like profiles in `packages/ai-gateway/src/gateway.test.ts`
- [x] T063 [P] [US5] Add web dedicated AI provider passthrough tests in `apps/web/tests/server/dedicatedAi.test.ts`

### Implementation for User Story 5

- [x] T064 [US5] Generalize provider naming from `openai` to OpenAI-compatible profiles in `packages/ai-gateway/src/types.ts`
- [x] T065 [US5] Add configurable base URL/API key/model handling for compatible providers in `packages/ai-gateway/src/providers/openai.ts`
- [x] T066 [US5] Add Qwen and DeepSeek model pricing aliases in `packages/ai-gateway/src/pricing.ts`
- [x] T067 [US5] Update provider fallback-to-Gemini rules for compatible provider outages in `packages/ai-gateway/src/gateway.ts`
- [x] T068 [US5] Ensure API route usage events record the configured provider/model names in `apps/api/src/modules/ai/routes.ts`
- [x] T069 [US5] Document provider/model environment configuration in `docs/architecture/deploy-and-environments.md`

**Checkpoint**: Provider switching can be tested safely per task without user-facing disruption.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and cleanup across stories.

- [x] T070 [P] Update AI architecture notes in `docs/architecture/current-architecture.md`
- [x] T071 Update quickstart verification results in `specs/004-economic-ai-gateway/verification-results.md`
- [x] T072 Run `npm run typecheck -w @aprovamind/ai-gateway` for `packages/ai-gateway/`
- [x] T073 Run `npm run typecheck -w @aprovamind/web` for `apps/web/`
- [x] T074 Run `npm run typecheck -w @aprovamind/api` for `apps/api/`
- [x] T075 Run gateway/domain/application/web automated tests covering `packages/ai-gateway/src/`, `packages/domain/src/`, `packages/application/src/`, and `apps/web/tests/`
- [x] T076 Run API automated tests covering AI routes, usage persistence, and beta signals in `apps/api/src/`
- [ ] T077 Use browser verification for Coach IA, daily plan, smart schedule, weekly mentoring, diagnosis, and beta/admin panel at `http://localhost:3000`, recording results in `specs/004-economic-ai-gateway/verification-results.md`
- [x] T078 Review browser/API responses for provider secrets, raw prompts, stack traces, and raw provider errors, recording findings in `specs/004-economic-ai-gateway/verification-results.md`
- [x] T079 Update `specs/004-economic-ai-gateway/quickstart.md` with any corrected local verification steps discovered during implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational; MVP reliability slice.
- **User Story 2 (Phase 4)**: Depends on Foundational; can run alongside US1 but reaches full value after US1 fallbacks exist.
- **User Story 3 (Phase 5)**: Depends on US2 usage event statuses for complete analytics.
- **User Story 4 (Phase 6)**: Depends on Foundational and benefits from US2 budget responses.
- **User Story 5 (Phase 7)**: Depends on Foundational and can run after core gateway contracts stabilize.
- **Polish (Phase 8)**: Depends on all desired stories.

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational; no dependency on other stories.
- **US2 (P1)**: Can start after Foundational; integrates best with US1 fallback semantics.
- **US3 (P2)**: Depends on US2 event statuses and can use partial implementation for success-only metrics.
- **US4 (P2)**: Can start after Foundational; uses US2 copy/status when available.
- **US5 (P3)**: Can start after Foundational; should avoid changing defaults until US1/US2 pass.

### Parallel Opportunities

- T002, T003, and T004 can run in parallel.
- T008, T009, T011, and T012 can run in parallel after T007 starts.
- US1 tests T014-T018 can run in parallel before implementation.
- US2 tests T030-T033 can run in parallel before implementation.
- US3 tests T045-T047 can run in parallel before implementation.
- US4 tests T054-T055 can run in parallel before implementation.
- US5 tests T061-T063 can run in parallel before implementation.
- Documentation tasks T069 and T070 can run in parallel with late implementation once configuration behavior stabilizes.

---

## Parallel Example: User Story 1

```bash
# Launch independent tests for critical fallback routes:
Task: "T015 Add daily plan provider-failure fallback coverage in apps/web/tests/api/planner-daily-route.test.ts"
Task: "T016 Add smart schedule provider-failure fallback coverage in apps/web/tests/api/smart-schedule-route.test.ts"
Task: "T017 Add weekly mentoring provider-failure fallback coverage in apps/web/tests/api/weekly-mentoring-route.test.ts"
Task: "T018 Add error diagnosis provider-failure unavailable/fallback coverage in apps/web/tests/api/error-diagnosis-route.test.ts"
```

---

## Parallel Example: User Story 2

```bash
# Launch independent budget test work:
Task: "T030 Add budget policy tests in packages/domain/src/ai/AiBudgetPolicy.test.ts"
Task: "T031 Add gateway budget-block tests in packages/ai-gateway/src/gateway-budget.test.ts"
Task: "T032 Add API usage-event persistence tests for blocked and fallback statuses in apps/api/src/modules/ai/ai-usage-store.test.ts"
Task: "T033 Add web rate-limit/budget response tests in apps/web/tests/server/aiBudgetPolicy.test.ts"
```

---

## Parallel Example: User Story 3

```bash
# Launch independent admin summary coverage:
Task: "T045 Add beta/admin AI summary aggregation tests in apps/api/src/modules/entitlements/beta-signals.test.ts"
Task: "T046 Add web Firebase AI usage aggregation tests in apps/web/tests/firebase/beta-signals.test.ts"
Task: "T047 Add BetaSignalsCard rendering coverage for cost, fallback, failure, and budget-block metrics in apps/web/tests/components/BetaSignalsCard.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 and 2)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: US1 critical fallbacks.
4. Complete Phase 4: US2 budget enforcement.
5. Stop and validate critical flows with simulated provider failure and budget exhaustion.

### Incremental Delivery

1. Foundation: contracts, gateway primitives, pricing, task policy.
2. MVP: critical fallbacks and budget blocks.
3. Observability: admin summaries and usage event completeness.
4. UX cost reduction: guided Coach IA.
5. Provider flexibility: Qwen/DeepSeek-compatible profiles per task.

### Validation Commands

```bash
npm run typecheck -w @aprovamind/ai-gateway
npm run typecheck -w @aprovamind/web
npm run typecheck -w @aprovamind/api
npm run test:run -w @aprovamind/web
npm run test -w @aprovamind/api
npm run lint
```

## Notes

- `[P]` tasks target different files or independent test files.
- Story labels map directly to the user stories in `specs/004-economic-ai-gateway/spec.md`.
- Keep OpenRouter as the default provider and Gemini as an operational fallback until telemetry suggests a different split.
- Do not expose provider secrets, raw prompts, raw provider errors, or stack traces to browser responses.
- Treat the Vitest cache under `apps/web/node_modules/.vite/` as unrelated generated state.
