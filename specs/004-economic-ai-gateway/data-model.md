# Data Model: Economic AI Gateway

## AI Task Request

Represents one normalized request for an AI-assisted product action before any paid provider is called.

**Fields**:

- `task`: Task type such as `chat`, `planner-daily`, `smart-schedule`, `weekly-mentoring`, `error-diagnosis`, `explain-answer`, or `parse-edital`.
- `userId`: Authenticated user identifier when available.
- `route`: Product route or server entry point that originated the request.
- `inputSummary`: Safe description of the request shape for logging and testing, without raw sensitive prompt content.
- `maxOutputTokens`: Optional response size cap.
- `budgetTier`: User/product budget tier used for spend decisions.
- `allowFallback`: Whether local fallback is allowed for the task.
- `requestedAt`: Timestamp when the decision started.

**Validation Rules**:

- `task` must be one of the supported AI task keys.
- Browser callers must not provide provider credentials or override trusted budget state.
- `maxOutputTokens` must be capped by task policy.
- `allowFallback` defaults to true for critical study guidance and false for tasks that cannot be safely approximated.

## AI Provider Profile

Represents a server-side provider/model option that can serve one or more tasks.

**Fields**:

- `provider`: Provider family, such as Gemini or an alternative compatible provider profile.
- `model`: Concrete model identifier.
- `taskScope`: Tasks allowed to use the profile.
- `qualityTier`: Intended quality/cost class: economical, balanced, or premium.
- `priceInputPerMillion`: Estimated input token price.
- `priceOutputPerMillion`: Estimated output token price.
- `enabled`: Whether the profile may receive traffic.
- `fallbackProvider`: Optional safer provider/profile to use if this one fails.

**Validation Rules**:

- Disabled profiles must never receive paid calls.
- Missing price information is allowed only if the task is blocked from production use or records zero-cost unknown pricing with an explicit warning.
- Provider secrets and base URLs are server-side configuration, not browser data.

## AI Budget Policy

Represents the spend guardrail used before an external provider call.

**Fields**:

- `userDailyBudgetUsd`: Maximum estimated spend per user per day.
- `globalMonthlyBudgetUsd`: Maximum estimated product-wide spend per month.
- `reservedCostUsd`: Estimated amount reserved before a call.
- `consumedCostUsd`: Estimated amount recorded from completed calls.
- `remainingUserBudgetUsd`: Remaining daily user allowance.
- `remainingGlobalBudgetUsd`: Remaining monthly product allowance.
- `blockReason`: Optional reason when a request is denied.
- `periodKey`: Day or month bucket used for aggregation.

**Validation Rules**:

- Budgets must be non-negative.
- A request is blocked when either user or global remaining budget is insufficient for the task estimate.
- Budget blocks must be recorded as AI usage events.
- Admin/tester overrides must be explicit and auditable.

## AI Decision Result

Represents the outcome of one gateway decision.

**Fields**:

- `status`: `success`, `failed`, `fallback`, or `blocked_by_budget`.
- `task`: Task that was evaluated.
- `provider`: Provider used when a paid call happened.
- `model`: Model used when a paid call happened.
- `text`: User-facing response when available.
- `fallbackUsed`: Whether local fallback fulfilled the request.
- `budgetBlocked`: Whether budget policy prevented paid usage.
- `userMessage`: Safe Portuguese status message for the UI.
- `usage`: Estimated input/output/total tokens and estimated cost.
- `latencyMs`: Decision latency.
- `errorCode`: Optional internal-safe failure category.

**Validation Rules**:

- `blocked_by_budget` must not include paid provider usage.
- `fallback` must include a visible user-facing message and mark `fallbackUsed`.
- Provider/model are required for paid provider outcomes.
- Raw provider errors, prompts, stack traces, and secrets are never returned to browser users.

## AI Usage Event

Durable audit record for every AI decision attempt.

**Fields**:

- `eventId`: Unique event identifier.
- `userId`: User identifier when known.
- `route`: Originating route or feature surface.
- `task`: AI task.
- `provider`: Provider used, fallback marker, or none for budget blocks.
- `model`: Model used when applicable.
- `estimatedInputTokens`: Estimated or provider-reported input usage.
- `estimatedOutputTokens`: Estimated or provider-reported output usage.
- `estimatedCostUsd`: Estimated cost for the decision.
- `status`: `success`, `failed`, `fallback`, or `blocked_by_budget`.
- `fallbackUsed`: Whether local fallback was used.
- `budgetBlocked`: Whether budget prevented paid usage.
- `errorCode`: Optional failure category.
- `createdAt`: Event timestamp.

**Validation Rules**:

- One event should be recorded for every AI decision attempt, including blocks and fallbacks.
- Event data must avoid raw prompt bodies and secrets.
- Events with partial usage must still include a cost estimate, even if zero with an unknown-pricing warning.

## Fallback Response

Represents a local response generated without paid external AI.

**Fields**:

- `task`: Task fulfilled by fallback.
- `sourceData`: Safe description of product data used.
- `message`: User-facing explanation.
- `payload`: Task-specific structured result when applicable.
- `limitations`: Short note explaining reduced personalization if needed.
- `createdAt`: Timestamp.

**Validation Rules**:

- Daily plan fallback must produce at least one actionable study block when sufficient local data exists.
- Fallback responses must not pretend to be live model output.
- If fallback cannot safely satisfy the task, the product returns a clear unavailable state.

## Admin AI Summary

Aggregated view used by the beta/admin panel.

**Fields**:

- `windowDays`: 7, 14, or 30.
- `estimatedCostUsd`: Total estimated spend in the window.
- `callsByTask`: Count and cost by task.
- `providers`: Count, cost, failure rate, and fallback rate by provider/model.
- `budgetBlocks`: Count of user/global budget blocks.
- `fallbackRate`: Share of decisions fulfilled by local fallback.
- `failureRate`: Share of decisions that failed without fallback.
- `dataWarnings`: Sources that were unavailable or partial.

**Validation Rules**:

- Summary must load with partial data when non-critical sources fail.
- Window filters must use event timestamps.
- Provider/model breakdown must group unknown values separately.
