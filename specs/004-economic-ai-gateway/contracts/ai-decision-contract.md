# Contract: AI Decision and Routing

## Purpose

Define the shared contract for evaluating an AI-assisted task before external provider usage. This contract keeps provider selection, budget checks, fallbacks, and telemetry consistent across Coach IA, daily plan, smart schedule, mentoring, diagnosis, and supporting AI tasks.

## Request

```ts
type AiEconomyTask =
  | "chat"
  | "planner-daily"
  | "smart-schedule"
  | "weekly-mentoring"
  | "error-diagnosis"
  | "explain-answer"
  | "parse-edital"
  | "interrogation"
  | "predictive-exam";

type AiBudgetTier = "free" | "tester" | "pro" | "admin";

type AiDecisionRequest = {
  task: AiEconomyTask;
  userId?: string;
  route: string;
  prompt: string;
  systemInstruction?: string;
  maxOutputTokens?: number;
  preferJson?: boolean;
  budgetTier: AiBudgetTier;
  allowFallback: boolean;
  requestId?: string;
};
```

## Response

```ts
type AiDecisionStatus =
  | "success"
  | "fallback"
  | "failed"
  | "blocked_by_budget";

type AiDecisionResponse = {
  status: AiDecisionStatus;
  text?: string;
  provider?: "gemini" | "openai-compatible" | "local-heuristic";
  model?: string;
  latencyMs: number;
  fallbackUsed: boolean;
  budgetBlocked: boolean;
  userMessage: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };
  errorCode?: string;
};
```

## Rules

- Every AI-assisted product route must create an `AiDecisionRequest` before paid provider usage.
- Provider selection is derived from trusted server-side task policy, not from browser input.
- `maxOutputTokens` may be lowered by task policy.
- `blocked_by_budget` responses must not attempt paid provider usage.
- `fallback` responses must set `fallbackUsed: true` and include helpful Portuguese user copy.
- Raw prompts, provider stack traces, secrets, hidden policy text, and unfiltered provider errors are never sent to the browser.

## Acceptance

- A normal chat request can route to the configured economical provider and return usage/cost data.
- A daily plan request can return deterministic fallback when the provider fails.
- A budget-blocked request records a decision without paid provider data.
- A malformed provider response becomes a recoverable failure or fallback, not a raw internal error.
