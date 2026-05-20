# Implementation Plan: Save AI Focus Schedule (Persistência do Cronograma de Foco)

**Branch**: `005-save-ai-schedule` | **Date**: 2026-05-19 | **Spec**: [spec.md](file:///Users/marleite/workspace/pessoal/aprova-flow/specs/005-save-ai-schedule/spec.md)

## Summary
The goal of this feature is to persist the AI-generated weekly focus schedule on the dashboard to Cloud Firestore. This ensures that when the user refreshes the page or navigates away, the study schedule remains saved and loaded automatically for the active study plan (`planId`) and calendar week.
We will achieve this by:
1. Creating a new client-side Firestore helper library `apps/web/src/lib/firebase/smartSchedules.ts` to fetch and store schedules.
2. Securing the new `weekly_smart_schedules` Firestore collection with strict security rules.
3. Updating `apps/web/src/components/SmartScheduleCard.tsx` to fetch the saved weekly schedule on mount (isolated by `activePlanId` and the current week's Monday date `YYYY-MM-DD`) and automatically save/update it on successful generation/recalculation.
4. Integrating the active plan context into `/dashboard` to pass the correct `activePlanId`.
5. Testing the core logic and Firestore interactions with Vitest unit tests.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: Next.js 16, React 19, Firebase 12, Vitest
**Storage**: Cloud Firestore (new collection `weekly_smart_schedules`)
**Testing**: Vitest
**Target Platform**: Web (Next.js Client SDK)
**Project Type**: Monorepo web + api
**Performance Goals**: Fetch and render saved schedules in < 1.5 seconds on mount.
**Constraints**: Pure client-side read/write via client SDK, user only reads/writes own data. No server-side changes to quotas.
**Scale/Scope**: Single feature slice under `apps/web` and `firestore.rules`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Architecture boundaries respected: Business/view logic lives in `apps/web/src/components` and uses a dedicated client-side Firebase library `apps/web/src/lib/firebase/smartSchedules.ts` to access Firestore, matching the design of sibling modules.
- [x] Server-side trust boundaries respected: Quota and rate limits are already fully enforced in the backend. Direct Firestore reads/writes are secured by strict security rules so users only access their own documents.
- [x] Risk-based test strategy defined: Automated unit tests will cover date calculations and database saving/retrieval functions (using mocks) in `apps/web/tests/firebase/smartSchedules.test.ts`. Manual verification scenarios are detailed in `quickstart.md`.
- [x] Operational readiness defined: Basic telemetry / error handling included (toast/alert notification if Firestore is down, fallback to memory-state).
- [x] Documentation impact captured: Updating `docs/architecture/current-architecture.md` to document the new collection `weekly_smart_schedules`.

## Project Structure

### Documentation (this feature)

```text
specs/005-save-ai-schedule/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── checklists/
│   └── requirements.md  # Specification Quality Checklist
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
└── contracts/
    └── schema.md        # Phase 1 output (/speckit.plan command)
```

### Source Code (repository root)

```text
apps/
└── web/
    ├── src/
    │   ├── app/(app)/dashboard/page.tsx
    │   ├── components/SmartScheduleCard.tsx
    │   └── lib/firebase/smartSchedules.ts
    └── tests/
        └── firebase/smartSchedules.test.ts

firestore.rules          # Firestore security rules at project root
```

**Structure Decision**: Use the existing monorepo layout. New work MUST extend the current `apps/*` and `packages/*` roots unless the Constitution Check captures an explicit, justified exception.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None. All architectural guidelines are fully respected.

## User Review Required

> [!NOTE]
> Free and Pro users both have access to the `smart-schedule` AI capability (quota: 10/week for free, 60/week for pro). The security rules in `firestore.rules` are configured to allow any authenticated user to read/write their own weekly focus schedules.

## Proposed Changes

We will modify and create the following files to implement the persistence flow:

### Root Configuration

#### [MODIFY] [firestore.rules](file:///Users/marleite/workspace/pessoal/aprova-flow/firestore.rules)
Add the security rules block for `/weekly_smart_schedules/{docId}`:
- Ensure authenticated access (`request.auth != null`).
- Check that the owner of the document is the logged-in user (`resource.data.userId == request.auth.uid` or `request.resource.data.userId == request.auth.uid`).
- Enforce schema validations on create and update operations.

---

### apps/web Component & Pages

#### [NEW] [smartSchedules.ts](file:///Users/marleite/workspace/pessoal/aprova-flow/apps/web/src/lib/firebase/smartSchedules.ts)
Implement the Firestore interaction logic:
- `getMondayOfCurrentWeek(date: Date): string` returns the Monday date string in `YYYY-MM-DD` format.
- `saveWeeklySmartSchedule(userId: string, planId: string, weekStart: string, schedule: SmartScheduleItem[]): Promise<void>` uses `setDoc` on `weekly_smart_schedules/${userId}_${planId}_${weekStart}`.
- `getWeeklySmartSchedule(userId: string, planId: string, weekStart: string): Promise<SmartScheduleItem[] | null>` retrieves the document using `getDoc` and returns the `schedule` list.

#### [MODIFY] [SmartScheduleCard.tsx](file:///Users/marleite/workspace/pessoal/aprova-flow/apps/web/src/components/SmartScheduleCard.tsx)
- Add `activePlanId: string | null` to props.
- Add `useEffect` to trigger a fetch upon mount, when `userId`, `activePlanId`, or the week changes.
- In `useEffect`, call `getWeeklySmartSchedule(userId, activePlanId, weekStart)`.
- If a schedule is found in the database, call `setSchedule` and set the expanded day.
- On successful AI generation inside `generateSchedule`, call `saveWeeklySmartSchedule(userId, activePlanId, weekStart, data.schedule)` to save/update it.
- Gracefully handle database loading/saving errors by showing user-friendly message fallback.

#### [MODIFY] [page.tsx](file:///Users/marleite/workspace/pessoal/aprova-flow/apps/web/src/app/(app)/dashboard/page.tsx)
- Pass `activePlanId={activePlanId}` down to `SmartScheduleCard`.

---

### Automated Tests

#### [NEW] [smartSchedules.test.ts](file:///Users/marleite/workspace/pessoal/aprova-flow/apps/web/tests/firebase/smartSchedules.test.ts)
- Test `getMondayOfCurrentWeek` helper with various dates (middle of week, Sundays, year transitions, month transitions) to ensure timezone-safe YYYY-MM-DD Monday returns.
- Mock firestore calls (`setDoc`, `getDoc`, `doc`, `db`) using Vitest to verify that `saveWeeklySmartSchedule` and `getWeeklySmartSchedule` pass correct paths, ids, and payloads.

## Verification Plan

### Automated Tests
Run unit tests to verify:
```bash
npx vitest run apps/web/tests/firebase/smartSchedules.test.ts
```
And check whole application linting/typechecking:
```bash
npm test && npm run lint
```

### Manual Verification
1. Open the `/dashboard` page locally.
2. Confirm the "Cronograma de Foco" displays "Gerar" if empty.
3. Click "Gerar" and watch the schedule compile. Verify in Firebase Emulator/Firestore that a new document was written inside `weekly_smart_schedules` under ID `userId_planId_weekStart`.
4. Refresh the page (F5) and verify the schedule loads instantly within `1.5s` and "Gerar" button is not shown.
5. Click "Recalcular" to verify the schedule updates and the new list is saved, overwriting the document.
6. Swap plans (Edital) and verify isolation: a different/empty schedule is displayed.
