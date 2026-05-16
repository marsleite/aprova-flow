# Implementation Plan: Economic AI Gateway

**Branch**: `004-economic-ai-gateway` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-economic-ai-gateway/spec.md`

## Summary

Build an economical, resilient AI control layer for AprovaMind by making the existing `packages/ai-gateway` the single decision boundary for AI task routing, provider selection, budget checks, cost estimation, usage telemetry, and fallback signaling. OpenRouter is the default provider so Qwen, DeepSeek, Gemini, and other models can be selected per task through one API, while Gemini remains an operational fallback. Existing web/API AI flows keep their user-facing purpose, but paid AI calls become budget-aware, auditable, and replaceable with deterministic fallbacks for critical study actions.

## Technical Context

**Language/Version**: TypeScript 5.x across the monorepo; React 19.2 and Next.js 16.1.6 in `apps/web`; Node with Fastify 5.6 in `apps/api`  
**Primary Dependencies**: Next.js, Fastify, Firebase 12, `@google/genai`, `@aprovamind/domain`, `@aprovamind/application`, `@aprovamind/contracts`, `@aprovamind/ai-gateway`, `@aprovamind/infrastructure-firebase`, Vitest, Node test runner, `tsx`  
**Storage**: Cloud Firestore for AI usage events, product events, user stats, and entitlement data; environment configuration for provider/model/budget policy; Markdown artifacts in `specs/004-economic-ai-gateway/`  
**Testing**: Vitest for gateway/domain/application/contracts/web route behavior; Node test runner for API modules; browser verification for Coach IA, daily plan, schedule, mentoring, diagnosis, and beta/admin usage panels  
**Target Platform**: Web app and API running as separate deployable runtimes on Vercel-compatible server environments  
**Project Type**: Monorepo web + API + shared packages  
**Performance Goals**: Budget decisions complete before paid provider calls; blocked/fallback responses return within 2 seconds; paid AI calls preserve current user-facing response targets; admin AI summaries load within 30 seconds for 7/14/30 day windows  
**Constraints**: AI secrets stay server-side; browser receives only filtered state and results; every paid AI call records an auditable usage outcome; critical study flows must degrade locally; budget checks must be race-tolerant enough for early beta traffic  
**Scale/Scope**: Cross-cutting AI infrastructure across `packages/ai-gateway`, contracts/application/domain policy, `apps/api` AI routes and usage persistence, web BFF routes, Coach IA, Planner, smart schedule, mentoring, diagnosis, and beta/admin signals

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
specs/004-economic-ai-gateway/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ai-decision-contract.md
│   ├── ai-budget-contract.md
│   └── admin-ai-summary-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/
├── web/
│   ├── src/app/api/
│   ├── src/components/
│   ├── src/lib/ai/
│   ├── src/lib/server/
│   └── tests/
└── api/
    └── src/modules/
        ├── ai/
        └── entitlements/

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

docs/
└── architecture/
```

**Structure Decision**: Extend the existing monorepo layout. Central AI request/routing/cost abstractions live in `packages/ai-gateway` and `packages/contracts`; budget policy lives in `packages/domain` or `packages/application`; Firestore persistence adapters stay in app/server infrastructure; UI only renders guided actions, budget state, fallback copy, and admin summaries. No new runtime root is planned.

## Phase 0 Research

See [research.md](./research.md).

## Phase 1 Design

See [data-model.md](./data-model.md), [quickstart.md](./quickstart.md), and the contracts in [contracts/](./contracts/).

## Post-Design Constitution Check

- [x] Architecture boundaries respected: design assigns shared contracts to `packages/contracts`, routing/provider/cost execution to `packages/ai-gateway`, budget decisions to `domain/application`, and route/UI composition to `apps/api` and `apps/web`.
- [x] Server-side trust boundaries respected: provider keys, base URLs, model names, budget enforcement, and usage persistence stay server-side; browser-visible state is filtered through explicit contracts.
- [x] Risk-based test strategy defined: plan requires automated tests for provider routing, budget blocking, fallback decisions, usage events, admin aggregation, and route integration, plus browser verification for key AI surfaces.
- [x] Operational readiness defined: every AI decision produces telemetry, budget blocks are counted, partial admin data degrades with warnings, and critical study features define local fallback outcomes.
- [x] Documentation impact captured: current architecture and deploy/environment docs must describe AI provider configuration, budget policy, fallback behavior, and monitoring expectations.

## Complexity Tracking

No constitution violations. The feature touches multiple apps/packages because existing AI usage is distributed, but the design reduces complexity by consolidating decisions into the existing gateway and shared contracts rather than adding a new runtime boundary.
