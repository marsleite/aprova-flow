# Contract: Daily Plan Eligibility and Generation

## Purpose

Define how the app decides whether "Gerar plano" is available, what the user sees when it is not available, and how generation/fallback results are represented.

## Eligibility

```ts
type DailyPlanEligibilityStatus =
  | "eligible"
  | "missing_data"
  | "missing_active_edital"
  | "ai_unavailable"
  | "usage_limited"
  | "blocked";

type DailyPlanEligibility = {
  status: DailyPlanEligibilityStatus;
  canGenerate: boolean;
  canGenerateFallback: boolean;
  missingRequirements: string[];
  nextActions: Array<
    | "register_activity"
    | "manage_editais"
    | "retry_later"
    | "generate_fallback"
    | "continue_without_ai"
  >;
  evaluatedAt: string;
};
```

## Generation Result

```ts
type DailyPlanGenerationMode =
  | "ai_generated"
  | "deterministic_fallback"
  | "manual_guided";

type DailyPlanItem = {
  subject: string;
  durationMinutes: number;
  goal: string;
};

type DailyPlanResult = {
  status: "ready" | "fallback_ready" | "failed_recoverable";
  generationMode?: DailyPlanGenerationMode;
  items: DailyPlanItem[];
  rationale?: string;
  userMessage: string;
  sourceEligibility: DailyPlanEligibility;
};
```

## Rules

- `canGenerate` is true only when the user has enough study data and no blocking account/setup issue exists.
- Disabled UI controls must be accompanied by `missingRequirements` or a visible explanation.
- AI failure does not erase manual registration data.
- If `canGenerateFallback` is true, the UI may offer a useful plan even when live AI is unavailable.
- `failed_recoverable` must include a user message and a next action path.

## Acceptance

- A user with sufficient activity can activate "Gerar plano".
- A user without sufficient activity sees the exact missing requirement.
- A live AI failure produces either `fallback_ready` or `failed_recoverable`, not a raw internal error.
