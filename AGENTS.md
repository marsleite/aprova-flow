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
### Diretrizes Fundamentais de Desenvolvimento
- **Arquitetura Monorepo**: `apps/web` (Next.js 16 + React 19) e `apps/api` (Fastify 5.6) consom os pacotes compartilhados `@aprovamind/*` (`domain`, `contracts`, `application`, `ai-gateway`, `infrastructure-firebase`, `infrastructure-billing`).
- **Política de IA**: Jamais instanciar chamadas diretas de IA para feedbacks simples ou estatísticas diárias. Use o motor de regras local no frontend (`MentorCard`, `PostSessionToast`). Reservar IA para o AI Gateway centralizado (`/ai/text`, `/ai/pdf`, `/api/chat`, `/api/planner-daily`, `/api/weekly-mentoring`, `/api/parse-edital`).
- **Idioma**: Textos de interface e mensagens ao usuário sempre em Português do Brasil (pt-BR). Identificadores de código, tipos, funções e comentários técnicos em Inglês.
- **Multi-Edital**: Ao manipular sessões, metas ou estatísticas de questões, sempre preservar a amarração com `planId` e tratar o fallback para visualização global quando `planId` for nulo/geral.
- **Validação de Testes**: Executar `npm test` (`npm run test -w @aprovamind/web` / `npm run test:domain`) e `npm run lint` ao finalizar alterações.
<!-- MANUAL ADDITIONS END -->
