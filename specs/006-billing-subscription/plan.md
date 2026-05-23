# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See
`.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., TypeScript 5.x, Python 3.11, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., Next.js 16, Fastify 5, Firebase, Vitest or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., Firestore, PostgreSQL, files or N/A]  
**Testing**: [e.g., Vitest, Node test runner, contract tests or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Web, Vercel serverless, Node server or NEEDS CLARIFICATION]  
**Project Type**: [e.g., monorepo web + api + shared packages or NEEDS CLARIFICATION]  
**Performance Goals**: [domain-specific, e.g., response time, throughput, UX targets or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., server-side auth, rate limits, quota, <200ms p95 or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., single feature slice, multi-app rollout, shared package impact or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [ ] Architecture boundaries respected: business rules live in
      `packages/domain`, orchestration and ports live in
      `packages/application`, shared DTOs and contracts live in
      `packages/contracts`, and app layers stay focused on UI, API, and
      integration.
- [ ] Server-side trust boundaries respected: secrets, AI providers, authz,
      billing, and entitlements remain enforced on the server; any
      browser-facing behavior documents the matching server-side control.
- [ ] Risk-based test strategy defined: automated coverage is listed for
      behavior changes in domain, application, contracts, APIs, billing,
      entitlements, and bug fixes; any manual-only validation is explicitly
      justified.
- [ ] Operational readiness defined: telemetry, error handling, health checks,
      rate limits, or rollout validation are captured for backend or AI
      changes.
- [ ] Documentation impact captured: updates to `README.md`,
      `docs/architecture/current-architecture.md`, and
      `docs/architecture/deploy-and-environments.md` are listed when
      structure, runtime boundaries, or deploy flow change.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/
├── web/
│   ├── src/
│   └── tests/
└── api/
    ├── src/
    └── api/

packages/
├── domain/
│   └── src/
├── application/
│   └── src/
├── contracts/
│   └── src/
├── ai-gateway/
│   └── src/
├── infrastructure-firebase/
│   └── src/
└── infrastructure-billing/
    └── src/

docs/
├── architecture/
└── product/
```

**Structure Decision**: Use the existing monorepo layout. New work MUST extend
the current `apps/*` and `packages/*` roots unless the Constitution Check
captures an explicit, justified exception.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., new runtime boundary] | [current need] | [why the existing app/package structure is insufficient] |
| [e.g., manual-only validation] | [specific reason] | [why automated coverage is not feasible for this slice] |
