---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include automated test tasks whenever the change affects domain,
application, contracts, APIs, billing, entitlements, bug fixes, or other
behavior with meaningful regression risk. Purely visual or copy-only changes
may use documented manual validation only when the spec records that exception.

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **AprovaMind monorepo (default)**: `apps/web/`, `apps/api/`, `packages/domain/`,
  `packages/application/`, `packages/contracts/`, `packages/ai-gateway/`
- **Docs and operations**: `README.md`, `docs/architecture/`, `docs/product/`
- Paths shown below assume the existing monorepo layout - adjust only when the
  plan documents a justified exception

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and baseline safeguards for the selected
slice

- [ ] T001 Confirm target paths and ownership in `apps/web`, `apps/api`, and/or `packages/*`
- [ ] T002 Initialize or update feature scaffolding in the chosen monorepo locations
- [ ] T003 [P] Configure or verify lint, typecheck, and test entry points affected by the slice

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story
can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T004 Create or update shared contracts in `packages/contracts/src/`
- [ ] T005 [P] Add or update domain rules in `packages/domain/src/`
- [ ] T006 [P] Add or update use cases or ports in `packages/application/src/`
- [ ] T007 Establish auth, entitlement, or server-side guardrails in `apps/api/src/` or `apps/web/src/app/api/`
- [ ] T008 Add telemetry, logging, rate limiting, or error handling required by the plan
- [ ] T009 Capture documentation impact in `README.md` or `docs/architecture/` when boundaries change

**Checkpoint**: Foundation ready - user story implementation can now begin in
parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1

> **Write the required automated tests before or alongside implementation for risky behavior changes.**

- [ ] T010 [P] [US1] Add domain or application coverage in `apps/web/tests/` or the relevant package test target
- [ ] T011 [P] [US1] Add API, integration, or contract coverage for the affected server-side path

### Implementation for User Story 1

- [ ] T012 [P] [US1] Update shared types, contracts, or schemas in `packages/contracts/src/`
- [ ] T013 [P] [US1] Implement core business rules in `packages/domain/src/`
- [ ] T014 [US1] Implement orchestration in `packages/application/src/` (depends on T012, T013)
- [ ] T015 [US1] Wire the feature into `apps/api/src/`, `apps/web/src/app/api/`, or `apps/web/src/` as planned
- [ ] T016 [US1] Add validation, fallback, and error handling for the main flow
- [ ] T017 [US1] Add observability, docs, or rollout notes required for this story

**Checkpoint**: At this point, User Story 1 should be fully functional and
testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2

- [ ] T018 [P] [US2] Add automated coverage for the new behavior in the affected layer
- [ ] T019 [P] [US2] Add integration or contract coverage for cross-boundary behavior

### Implementation for User Story 2

- [ ] T020 [P] [US2] Extend domain, application, or contract support in the relevant package path
- [ ] T021 [US2] Implement app-layer behavior in `apps/web/` or `apps/api/`
- [ ] T022 [US2] Integrate with User Story 1 components or routes as needed
- [ ] T023 [US2] Update docs, telemetry, or security controls introduced by this story

**Checkpoint**: At this point, User Stories 1 AND 2 should both work
independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3

- [ ] T024 [P] [US3] Add automated coverage for the story's risky behavior
- [ ] T025 [P] [US3] Add end-to-end, integration, or contract coverage when boundaries change

### Implementation for User Story 3

- [ ] T026 [P] [US3] Extend shared packages or infrastructure required by the story
- [ ] T027 [US3] Implement the user-facing or API-facing behavior in the chosen app
- [ ] T028 [US3] Validate rollout, docs, and operational safeguards for the completed slice

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation updates in `README.md` or `docs/`
- [ ] TXXX Cross-story refactoring and cleanup
- [ ] TXXX Performance or reliability improvements across affected apps/packages
- [ ] TXXX [P] Additional automated tests in the appropriate workspace
- [ ] TXXX Security, entitlement, or rate-limit hardening
- [ ] TXXX Validate quickstart, rollout notes, and operational checks

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Required automated tests MUST be added for risky behavior changes
- Shared contracts and domain rules before app-layer wiring
- Server-side guards before exposing premium, billing, or AI behavior to clients
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Independent tests for a user story marked [P] can run in parallel
- Shared package work and app-layer wiring can run in parallel when they target different files
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch the independent coverage tasks together:
Task: "Add domain or application coverage in the relevant test target"
Task: "Add API, integration, or contract coverage for the affected server-side path"

# Launch independent shared-layer tasks together:
Task: "Update shared contracts or schemas in packages/contracts/src/"
Task: "Implement core business rules in packages/domain/src/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add User Story 1 -> Test independently -> Deploy/Demo (MVP)
3. Add User Story 2 -> Test independently -> Deploy/Demo
4. Add User Story 3 -> Test independently -> Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Document any approved manual-only validation explicitly
- Update architecture or deploy docs when runtime boundaries change
- Avoid: vague tasks, same file conflicts, and cross-story dependencies that break independence
