# Contract: Localhost Verification Record

## Purpose

Define the evidence format for the requested browser/API pass across the local app.

## Verification Result

```ts
type VerificationStatus = "pass" | "fail" | "blocked";
type VerificationSeverity = "low" | "medium" | "high" | "critical";

type LocalhostVerificationResult = {
  surface: string;
  path: string;
  precondition: string;
  action: string;
  expectedOutcome: string;
  actualOutcome: string;
  status: VerificationStatus;
  severity?: VerificationSeverity;
  evidence?: string;
};
```

## Required Web Surfaces

- Landing or authenticated app entry.
- Planner, including Registro Manual and Plano Diario.
- Dashboard.
- Engine, including active edital empty state.
- Mentoria or Coach IA surface.
- Analises.
- Historico.
- Edital management path reachable from "Gerenciar Editais".

## Required API Checks

- Health endpoint.
- AI route availability/failure classification.
- Daily plan route behavior for eligible and insufficient-data states.
- Engine route behavior for missing and active edital states.

## Rules

- Each failure includes the user action, expected outcome, actual outcome, severity, and reproduction note.
- Blocked checks explain which local dependency was unavailable.
- Evidence must avoid secrets, tokens, production data, and provider raw error payloads.

## Acceptance

- Primary screens load without unhandled crashes.
- Empty states are actionable and tied to the tested precondition.
- API checks classify failures as configuration, entitlement, provider, validation, or application behavior.
