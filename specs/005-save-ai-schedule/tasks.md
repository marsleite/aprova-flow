# Tasks: Save AI Focus Schedule (Persistência do Cronograma de Foco)

**Input**: Design documents from `/specs/005-save-ai-schedule/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Exact file paths are included in descriptions.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the environment and initialize baseline safeguards.

- [ ] T001 Confirm target paths and ownership in `apps/web`
- [ ] T002 Verify Next.js dev server and Vitest run smoothly in `apps/web`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement the database helpers, model schemas, and security rules that must be complete before any UI integration can begin.

- [ ] T003 [P] Update Firestore security rules in `firestore.rules` to secure the new `/weekly_smart_schedules/{docId}` collection.
- [ ] T004 Define TypeScript types and interfaces inside `apps/web/src/lib/firebase/smartSchedules.ts` matching the schema in `contracts/schema.md`.
- [ ] T005 Implement `getMondayOfCurrentWeek(date: Date): string` in `apps/web/src/lib/firebase/smartSchedules.ts` returning timezone-safe `YYYY-MM-DD`.
- [ ] T006 Implement database helper functions `saveWeeklySmartSchedule` and `getWeeklySmartSchedule` in `apps/web/src/lib/firebase/smartSchedules.ts`.

**Checkpoint**: Database rules and helper layers are ready. User story implementation can now begin.

---

## Phase 3: User Story 1 - Carregamento Automático do Cronograma Salvo (Priority: P1) 🎯 MVP

**Goal**: Automatically fetch and render the saved weekly smart schedule on dashboard mount.

**Independent Test**: Save a dummy focus schedule document inside Firestore for the current week and active plan, then load `/dashboard` and verify it loads instantly in `< 1.5 seconds` without showing the initial "Gerar" button.

### Tests for User Story 1

- [ ] T007 [P] [US1] Create unit tests in `apps/web/tests/firebase/smartSchedules.test.ts` for `getMondayOfCurrentWeek` and mock retrieval.

### Implementation for User Story 1

- [ ] T008 [US1] Update `apps/web/src/app/(app)/dashboard/page.tsx` to retrieve and pass `activePlanId` to the `SmartScheduleCard` component.
- [ ] T009 [US1] Update `apps/web/src/components/SmartScheduleCard.tsx` props to accept `activePlanId: string | null`.
- [ ] T010 [US1] Implement `useEffect` logic inside `apps/web/src/components/SmartScheduleCard.tsx` to automatically load the weekly schedule on component mount or user/plan change.
- [ ] T011 [US1] Wire correct loading and error states inside the render cycle of `apps/web/src/components/SmartScheduleCard.tsx`.

**Checkpoint**: Saved schedules are fetched and displayed automatically.

---

## Phase 4: User Story 2 - Salvamento Automático pós-Geração (Priority: P1)

**Goal**: Automatically save/overwrite focus schedules in Firestore upon successful AI generation or recalculation.

**Independent Test**: Access `/dashboard` with no saved schedule, click "Gerar" or "Recalcular", see the schedule render, check that the document was successfully persisted to Firestore, and reload the page (F5) to verify it loads from cache.

### Tests for User Story 2

- [ ] T012 [P] [US2] Add mock unit tests in `apps/web/tests/firebase/smartSchedules.test.ts` verifying saving logic and error states.

### Implementation for User Story 2

- [ ] T013 [US2] Update `generateSchedule` inside `apps/web/src/components/SmartScheduleCard.tsx` to call `saveWeeklySmartSchedule` when the API `/api/smart-schedule` returns a successful AI schedule.
- [ ] T014 [US2] Implement robust fallback handling in `apps/web/src/components/SmartScheduleCard.tsx` so that if Firestore writing fails, the schedule remains available in-memory with a gentle visual warning.

**Checkpoint**: Generated/recalculated schedules are successfully persisted without user intervention.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Documentation updates and system-wide verification.

- [ ] T015 Document the new Firestore collection and document ID format in `docs/architecture/current-architecture.md`.
- [ ] T016 Run all tests via `npm test` and lint the project via `npm run lint` to ensure zero regressions.

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion. BLOCKS Phase 3 and Phase 4.
- **User Stories (Phases 3 & 4)**: Depend on Foundational completion.
- **Polish (Phase 5)**: Depends on all user stories being complete.

### Parallel Opportunities
- Foundational helper rules (`T003`) can run in parallel with type definitions.
- Unit tests (`T007`, `T012`) can be drafted alongside implementation.
