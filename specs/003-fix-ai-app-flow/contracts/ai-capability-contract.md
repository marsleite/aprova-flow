# Contract: AI Capability and Failure States

## Purpose

Define the shared browser-facing contract for AI availability, failure normalization, cost control, and user recovery paths.

## Capability State

```ts
type AiCapability =
  | "daily_plan"
  | "focus_allocation"
  | "next_session"
  | "chat";

type AiCapabilityState =
  | "enabled"
  | "disabled"
  | "limited"
  | "misconfigured"
  | "provider_unavailable"
  | "insufficient_data"
  | "unexpected_failure";

type AiNextAction =
  | "register_activity"
  | "manage_editais"
  | "generate_fallback"
  | "retry_later"
  | "upgrade_or_wait"
  | "continue_without_ai";

type AiCapabilityResponse = {
  capability: AiCapability;
  state: AiCapabilityState;
  message: string;
  nextActions: AiNextAction[];
  retryAfterSeconds?: number;
  usageRemaining?: number;
};
```

## Rules

- `message` is safe for the user and written in Portuguese.
- Provider names, raw provider errors, stack traces, secrets, prompts, and hidden policy text are not included.
- `chat` returns `enabled` only when a server-side usage boundary exists.
- `limited`, `provider_unavailable`, `misconfigured`, and `unexpected_failure` include a recoverable next action.
- Bounded capabilities may return `generate_fallback` when the study workflow can continue without live AI.

## Error Category Mapping

| Category | User-facing state | Expected UI behavior |
|----------|-------------------|----------------------|
| Missing provider config | `misconfigured` | Explain temporary IA setup issue and offer non-AI path |
| Provider timeout/outage | `provider_unavailable` | Preserve user data and offer retry/fallback |
| Usage quota exceeded | `limited` | Explain limit and next availability or non-AI path |
| Missing study context | `insufficient_data` | Tell user which data is needed |
| Unknown exception | `unexpected_failure` | Show generic recoverable copy and log internally |

## Acceptance

- No visible AI surface shows "Erro interno ao consultar IA" as the final user guidance.
- All AI-powered actions can render a meaningful result from this contract without knowing provider internals.
