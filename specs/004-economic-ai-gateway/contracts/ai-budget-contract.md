# Contract: AI Budget Policy

## Purpose

Define how user-level and product-level AI spend guardrails are evaluated, reported, and recorded.

## Budget Policy

```ts
type AiBudgetWindow = "day" | "month";

type AiBudgetLimit = {
  scope: "user" | "global";
  window: AiBudgetWindow;
  limitUsd: number;
  consumedUsd: number;
  reservedUsd: number;
  remainingUsd: number;
};

type AiBudgetDecision = {
  allowed: boolean;
  task: AiEconomyTask;
  estimatedRequestCostUsd: number;
  limits: AiBudgetLimit[];
  blockReason?: "user_daily_budget" | "global_monthly_budget" | "missing_budget_policy";
  retryAfterSeconds?: number;
};
```

## Usage Event

```ts
type AiUsageEventStatus =
  | "success"
  | "failed"
  | "fallback"
  | "blocked_by_budget";

type AiUsageEvent = {
  eventId: string;
  userId?: string;
  route: string;
  task: AiEconomyTask;
  provider?: string;
  model?: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  status: AiUsageEventStatus;
  fallbackUsed: boolean;
  budgetBlocked: boolean;
  errorCode?: string;
  createdAt: string;
};
```

## Rules

- User daily budget and global monthly budget are evaluated before paid provider calls.
- If either budget would be exceeded, the decision is blocked and a `blocked_by_budget` event is recorded.
- Successful provider calls record provider/model, usage, and estimated cost.
- Fallback-only decisions record zero paid provider cost unless fallback uses another paid provider.
- Failed provider calls record estimated pre-call cost and failure status when safe to do so.
- Budget policy must be testable with deterministic clocks and mocked usage history.

## Acceptance

- A request under both budgets is allowed.
- A request over user daily budget is blocked with `blockReason: "user_daily_budget"`.
- A request over global monthly budget is blocked with `blockReason: "global_monthly_budget"`.
- Admin analytics can count budget-blocked events by task and time window.
