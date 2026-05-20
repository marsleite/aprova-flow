# Phase 0 Research: Save AI Focus Schedule

## Findings & Technical Decisions

### Decision 1: Firestore Collection and Entity Structure
We will introduce a new collection named `weekly_smart_schedules` to persist weekly smart schedules.
- **Document ID Format**: `${userId}_${planId}_${weekStart}`
  - Where `weekStart` is the Monday date string in `YYYY-MM-DD` format.
  - This allows O(1) single-document lookups without needing full collection queries.
- **Fields**:
  - `userId` (string)
  - `planId` (string)
  - `weekStart` (string: YYYY-MM-DD)
  - `schedule` (array of `SmartScheduleItem` objects)
  - `generatedAt` (string ISO)
  - `updatedAt` (string ISO)

### Decision 2: Current Week Calculation
To identify the "current week", we will calculate the date of the Monday of the current calendar week based on the user's local date.
- We will implement a helper function `getMondayOfCurrentWeek(date: Date): string` that returns a `YYYY-MM-DD` string representing the Monday of that week.
- This ensures consistency: if the user loads `/dashboard` on a Wednesday, it looks for the Monday of that week. If they reload on Saturday, it continues loading the same week's schedule.

### Decision 3: Client-side vs Server-side Saving
- **Approach**: The client-side React component (`SmartScheduleCard.tsx`) already runs in the client browser. Since other Firestore collections (`sessions`, `study_plans`, `questions_stats`, `daily_ai_plan_progress`) are read/written directly via the client Firestore SDK, we will follow the established architecture:
  - Write directly to Firestore from the `SmartScheduleCard` component on successful AI response or fallback calculation.
  - Read directly from Firestore when mounting the `SmartScheduleCard` component.
- **Rationale**: Keeps execution logic close to the component, minimizes extra Next.js API overhead, and fully leverages the existing Firestore rules and client configuration.

### Decision 4: Firestore Security Rules hardending
- Both Free and Pro tiers have access to the `smart-schedule` AI capability (quota: 10/week for free, 60/week for pro).
- Therefore, the collection `weekly_smart_schedules` should be read-writeable by any authenticated user for their own documents. We will add custom, highly secure Firestore Rules to enforce this.

## Alternatives Considered

### Alternative A: Persist directly in the `study_plans` document
- **Considered**: Save the active schedule inside the `study_plans` collection in a nested field like `currentWeeklySchedule`.
- **Rejected because**: A study plan (edital) contains static config (matérias, pesos, carga horária). Mixing transient, week-by-week generated schedule allocations into the static plan document would bloat the study plan and make tracking history of weekly focus allocations harder in the future. Separating this into `weekly_smart_schedules` is clean, scalable, and follows Single Responsibility.
