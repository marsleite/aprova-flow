# Implementation Plan: App-Wide AI and Flow Stabilization

**Branch**: `003-fix-ai-app-flow` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-fix-ai-app-flow/spec.md`

## Summary

Stabilize the app-wide AI and study-flow experience by making daily plan eligibility explicit, replacing generic AI failures with typed recoverable states, reducing early-product exposure to open-ended AI chat, repairing Revisão Geral/Engine routing expectations, and documenting a repeatable localhost verification pass for the web and API apps. The technical approach keeps product rules and contracts in shared packages, keeps AI/provider trust boundaries server-side, and uses the web app only to present state, actions, fallbacks, and verification feedback.

## Technical Context

**Language/Version**: TypeScript 5.x across the monorepo; React 19.2 and Next.js 16.1.6 in `apps/web`; Node with Fastify 5.6 in `apps/api`  
**Primary Dependencies**: Next.js, Fastify, Firebase 12, `@google/genai`, `@aprovamind/domain`, `@aprovamind/application`, `@aprovamind/contracts`, `@aprovamind/ai-gateway`, `@aprovamind/infrastructure-firebase`, Vitest, Node test runner, `tsx`  
**Storage**: Cloud Firestore for product/user study data and entitlements; local browser state for session and entitlement sandbox behavior; Markdown artifacts in `specs/003-fix-ai-app-flow/`  
**Testing**: Vitest for web/domain/application-facing behavior; Node test runner for API routes/modules; browser-based localhost verification for user-visible navigation and empty states  
**Target Platform**: Web app and API running as separate deployable runtimes, validated locally via localhost  
**Project Type**: Monorepo web + API + shared packages  
**Performance Goals**: Daily plan eligibility communicates enabled/missing state within 2 seconds; daily plan generation or fallback completes within 30 seconds for sufficient data; primary localhost screens load without unhandled crashes  
**Constraints**: AI secrets and provider calls remain server-side; frontend receives only filtered capability/result states; chat must be bounded, hidden, or degraded during early product stage; active edital gating must be explicit before recommendation flows appear broken  
**Scale/Scope**: Multi-surface stabilization across Planner, Dashboard, Engine, Mentoring/chat, Analytics, History, edital management, web AI routes, API health/AI/engine modules, and shared contracts/application rules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Architecture boundaries respected: business rules live in
      `packages/domain`, orchestration and ports live in
      `packages/application`, shared DTOs and contracts live in
      `packages/contracts`, and app layers stay focused on UI, API, and
      integration.
- [x] Server-side trust boundaries respected: secrets, AI providers, authz,
      billing, and entitlements remain enforced on the server; any
      browser-facing behavior documents the matching server-side control.
- [x] Risk-based test strategy defined: automated coverage is listed for
      behavior changes in domain, application, contracts, APIs, billing,
      entitlements, and bug fixes; any manual-only validation is explicitly
      justified.
- [x] Operational readiness defined: telemetry, error handling, health checks,
      rate limits, or rollout validation are captured for backend or AI
      changes.
- [x] Documentation impact captured: updates to `README.md`,
      `docs/architecture/current-architecture.md`, and
      `docs/architecture/deploy-and-environments.md` are listed when
      structure, runtime boundaries, or deploy flow change.

## Project Structure

### Documentation (this feature)

```text
specs/003-fix-ai-app-flow/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ai-capability-contract.md
│   ├── daily-plan-contract.md
│   └── localhost-verification-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/
├── web/
│   ├── src/app/(app)/
│   ├── src/app/api/
│   ├── src/lib/
│   └── tests/
└── api/
    ├── src/modules/ai/
    ├── src/modules/engine/
    └── src/

packages/
├── domain/
│   └── src/
├── application/
│   └── src/
├── contracts/
│   └── src/
├── ai-gateway/
│   └── src/
└── infrastructure-firebase/
    └── src/
```

**Structure Decision**: Use the existing monorepo layout. Add or adjust shared types in `packages/contracts`, eligibility and policy logic in `packages/domain` or `packages/application`, AI/provider normalization in server-side routes or gateway modules, and UI presentation in `apps/web`. Do not create new runtime roots.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [quickstart.md](./quickstart.md), and the contracts in [contracts/](./contracts/).

## Post-Design Constitution Check

- [x] Architecture boundaries respected: design assigns capability states and DTOs to `packages/contracts`, decision/eligibility logic to `domain/application`, and view handling to `apps/web`.
- [x] Server-side trust boundaries respected: contracts expose AI capability/result states, never provider secrets or raw errors; usage and entitlement enforcement stay server-side.
- [x] Risk-based test strategy defined: plan requires tests for eligibility, AI error normalization, chat limiting/degradation, active edital gating, and API route behavior, plus browser verification for the whole local surface.
- [x] Operational readiness defined: design includes health checks, typed AI failure categories, recoverable fallbacks, usage-limit messaging, and a localhost verification record.
- [x] Documentation impact captured: docs update required if chat policy, AI capability policy, or deploy/runtime boundaries change.

## Complexity Tracking

No constitution violations. No additional top-level architecture, runtime, or manual-only behavioral exception is planned.
