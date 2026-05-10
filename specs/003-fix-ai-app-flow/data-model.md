# Data Model: App-Wide AI and Flow Stabilization

## Study Activity

Represents user-entered or imported study/question performance that can drive daily planning and recommendations.

**Fields**:

- `id`: Stable activity identifier.
- `userId`: Owner of the activity.
- `subjectName`: Subject label entered or selected by the user.
- `totalQuestions`: Number of questions attempted.
- `correctAnswers`: Number of correct answers.
- `studyMinutes`: Optional study duration when the activity is a session rather than question-only record.
- `source`: Manual, imported, or generated source classification.
- `createdAt`: Activity creation time.

**Validation rules**:

- `totalQuestions` and `correctAnswers` cannot be negative.
- `correctAnswers` cannot exceed `totalQuestions`.
- An activity with zero questions and no study duration cannot make daily plan generation eligible.
- Unknown subjects may be accepted as drafts or new local subjects, but must be normalized before they drive recommendations.

**Relationships**:

- Contributes to Daily Plan eligibility.
- May map to an Active Edital subject when an edital exists.

## Daily Plan Eligibility

Represents whether the user can request a daily plan and why.

**Fields**:

- `status`: `eligible`, `missing_data`, `missing_active_edital`, `ai_unavailable`, `usage_limited`, or `blocked`.
- `missingRequirements`: Human-readable requirements that still need to be satisfied.
- `availableActions`: Actions the user can take next, such as register activity, manage editais, retry later, or generate fallback plan.
- `lastEvaluatedAt`: Time of evaluation.

**Validation rules**:

- `eligible` must not include blocking missing requirements.
- Non-eligible states must include at least one reason or next action.
- AI unavailability alone should not erase the possibility of a deterministic fallback plan.

**Relationships**:

- Derived from Study Activity, Active Edital state, user entitlements, and AI Capability State.
- Controls whether Daily Plan generation is primary, fallback-only, or unavailable.

## Daily Plan

Represents the user's recommended plan for the current day.

**Fields**:

- `id`: Stable plan identifier.
- `userId`: Owner of the plan.
- `date`: Plan date.
- `items`: Ordered study blocks with subject, duration, and goal.
- `rationale`: Short explanation of why the plan was chosen.
- `generationMode`: `ai_generated`, `deterministic_fallback`, or `manual_guided`.
- `sourceEligibility`: Eligibility snapshot used when the plan was created.
- `createdAt`: Plan creation time.

**Validation rules**:

- A plan must contain at least one actionable study item.
- Fallback plans must clearly identify that they are usable without live AI.
- Plan generation must not discard or mutate source Study Activity.

**State transitions**:

- `not_requested` -> `generating`
- `generating` -> `ready`
- `generating` -> `fallback_ready`
- `generating` -> `failed_recoverable`

## AI Capability State

Represents what AI-powered actions are currently allowed to do.

**Fields**:

- `capability`: `daily_plan`, `focus_allocation`, `next_session`, `chat`, or another bounded AI surface.
- `state`: `enabled`, `disabled`, `limited`, `misconfigured`, `provider_unavailable`, `insufficient_data`, or `unexpected_failure`.
- `userMessage`: Safe Portuguese message for the UI.
- `nextActions`: Recoverable actions for the user.
- `retryAfter`: Optional time hint for limited or unavailable states.
- `usageRemaining`: Optional remaining usage count for bounded features.

**Validation rules**:

- Browser-facing state must never include provider secrets, stack traces, raw prompts, or raw provider errors.
- `chat` must include a bounded usage policy when enabled.
- Failed states must include a next action unless the issue is purely transient and retry is the action.

**Relationships**:

- Influences Daily Plan Eligibility and AI surface presentation.
- Backed by server-side entitlement, rate limit, and provider diagnostics.

## Active Edital

Represents the selected syllabus/program used by Dashboard, Engine, and recommendations.

**Fields**:

- `id`: Stable edital identifier.
- `userId`: Owner.
- `name`: Display name.
- `status`: `active`, `inactive`, `draft`, or `incomplete`.
- `subjects`: Subjects and weights used by planning/recommendations.
- `updatedAt`: Last update time.

**Validation rules**:

- Only one edital should be treated as the active source for Engine decisions at a time.
- Active editais must contain enough subject metadata to support Engine recommendations.
- Incomplete active editais must produce actionable setup guidance.

**Relationships**:

- Required by Engine and Dashboard recommendation flows.
- May enrich Study Activity subject matching.

## Screen Verification Result

Represents one browser or API verification observation for localhost validation.

**Fields**:

- `surface`: Screen or API path name.
- `path`: Local path or endpoint.
- `precondition`: Empty, partial, active edital, API down, AI disabled, or other tested state.
- `action`: User or request action taken.
- `expectedOutcome`: Expected result from the spec.
- `actualOutcome`: Observed result.
- `status`: `pass`, `fail`, or `blocked`.
- `severity`: `low`, `medium`, `high`, or `critical`.
- `evidence`: Screenshot, console note, response summary, or reproduction notes.

**Validation rules**:

- Failing high-severity results must include reproducible steps.
- Blocked results must state the missing setup or dependency.
- Results must not capture production secrets or personal data.
