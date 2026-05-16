# Contract: Admin AI Cost and Reliability Summary

## Purpose

Define the beta/admin summary used to monitor AI cost, provider reliability, fallbacks, and budget pressure.

## Summary Response

```ts
type AdminAiSummaryWindow = 7 | 14 | 30;

type AiTaskSummary = {
  task: AiEconomyTask;
  events: number;
  estimatedCostUsd: number;
  success: number;
  failed: number;
  fallback: number;
  blockedByBudget: number;
};

type AiProviderSummary = {
  provider: string;
  model: string;
  events: number;
  estimatedCostUsd: number;
  failureRate: number;
  fallbackRate: number;
};

type AdminAiSummary = {
  windowDays: AdminAiSummaryWindow;
  estimatedCostUsd: number;
  totalEvents: number;
  fallbackRate: number;
  failureRate: number;
  budgetBlocks: number;
  tasks: AiTaskSummary[];
  providers: AiProviderSummary[];
  dataWarnings: string[];
  generatedAt: string;
};
```

## Rules

- Supported windows are 7, 14, and 30 days.
- Summaries aggregate `ai_usage_events` by event timestamp.
- Missing provider/model values are grouped under explicit unknown/local labels.
- Partial data failures return available metrics plus `dataWarnings`.
- The UI must not show stack traces, raw prompts, or provider secrets.

## Acceptance

- The summary shows estimated cost for the selected window.
- The summary separates usage by task and provider/model.
- Budget blocks, fallbacks, and failures are visible as counts and rates.
- If AI usage events cannot be read, the panel shows a warning and avoids crashing the entire beta/admin view.
