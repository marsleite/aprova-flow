# aprova-flow Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-05-20

## Active Technologies
- TypeScript 5.x no monorepo; React 19.2 e Next.js 16.1.6 no `apps/web`; Node + Fastify 5.6 no `apps/api` + Next.js 16, React 19, Fastify 5, Firebase 12, `@google/genai`, `@aprovamind/domain`, `@aprovamind/application`, `@aprovamind/contracts`, `@aprovamind/infrastructure-firebase`, Vitest, `tsx`, Node test runner (002-app-stabilization)
- Cloud Firestore para dados de produto, entitlements e eventos; estado local no browser para sessao e sandbox de entitlements; artefatos desta iniciativa em Markdown dentro de `specs/002-app-stabilization/` (002-app-stabilization)
- TypeScript 5.x across the monorepo; React 19.2 and Next.js 16.1.6 in `apps/web`; Node with Fastify 5.6 in `apps/api` + Next.js, Fastify, Firebase 12, `@google/genai`, `@aprovamind/domain`, `@aprovamind/application`, `@aprovamind/contracts`, `@aprovamind/ai-gateway`, `@aprovamind/infrastructure-firebase`, Vitest, Node test runner, `tsx` (003-fix-ai-app-flow)
- Cloud Firestore for product/user study data and entitlements; local browser state for session and entitlement sandbox behavior; Markdown artifacts in `specs/003-fix-ai-app-flow/` (003-fix-ai-app-flow)
- Cloud Firestore for AI usage events, product events, user stats, and entitlement data; environment configuration for provider/model/budget policy; Markdown artifacts in `specs/004-economic-ai-gateway/` (004-economic-ai-gateway)
- TypeScript 5.x + Next.js 16, React 19, Firebase 12, Vites (005-save-ai-schedule)
- Cloud Firestore (new collection `weekly_smart_schedules`) (005-save-ai-schedule)

- TypeScript 5.x no monorepo; React 19.2 e Next.js 16.1.6 no `apps/web`; Node + Fastify 5.6 no `apps/api` + Next.js 16, React 19, Fastify 5, Firebase 12, `@google/genai`, `@aprovamind/*` packages compartilhados, Vitest, Node test runner (001-product-evolution-roadmap)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x no monorepo; React 19.2 e Next.js 16.1.6 no `apps/web`; Node + Fastify 5.6 no `apps/api`: Follow standard conventions

## Recent Changes
- 006-billing-subscription: Added [if applicable, e.g., Firestore, PostgreSQL, files or N/A]
- 005-save-ai-schedule: Added TypeScript 5.x + Next.js 16, React 19, Firebase 12, Vites
- 005-save-ai-schedule: Added [if applicable, e.g., Firestore, PostgreSQL, files or N/A]


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
