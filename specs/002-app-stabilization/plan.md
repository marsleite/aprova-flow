# Implementation Plan: Estabilizacao da Aplicacao

**Branch**: `002-app-stabilization` | **Date**: 2026-04-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-app-stabilization/spec.md`

**Note**: This plan turns the stabilization spec into a concrete execution flow
for mapping real bugs, prioritizing by user impact, and eliminating failures in
short batches, starting from `login -> planner -> dashboard -> engine`.

## Summary

Executar uma frente dedicada de estabilizacao do AprovaMind, com tres saidas
principais: um backlog confiavel de bugs reais, uma ordem objetiva de ataque
por impacto e dependencia, e um protocolo de correcao com blindagem de
regressao. O primeiro ciclo comeca na jornada central
`login -> planner -> dashboard -> engine`, trata erros visiveis, acoes
enganosas e estados contraditorios como falhas reais, e usa evidencias do
produto atual para decidir o que entra em cada lote.

O plano parte do estado real do monorepo apos as fases iniciais de endurecimento
da `apps/api`: `web` segue responsavel pela experiencia, `api` e a borda
canonico para recursos protegidos, e a estabilidade agora depende de fechar as
quebras restantes de UI, entitlements, carregamento de dados, ownership entre
camadas e validacao de regressao.

## Technical Context

**Language/Version**: TypeScript 5.x no monorepo; React 19.2 e Next.js 16.1.6 no `apps/web`; Node + Fastify 5.6 no `apps/api`  
**Primary Dependencies**: Next.js 16, React 19, Fastify 5, Firebase 12, `@google/genai`, `@aprovamind/domain`, `@aprovamind/application`, `@aprovamind/contracts`, `@aprovamind/infrastructure-firebase`, Vitest, `tsx`, Node test runner  
**Storage**: Cloud Firestore para dados de produto, entitlements e eventos; estado local no browser para sessao e sandbox de entitlements; artefatos desta iniciativa em Markdown dentro de `specs/002-app-stabilization/`  
**Testing**: `vitest run` no `apps/web`, `eslint` no `apps/web`, `node --import tsx --test` no `apps/api`, `tsc --noEmit` no `apps/api`, e smoke testing manual documentado para a jornada critica  
**Target Platform**: Aplicacao web em browser, `apps/web` e `apps/api` com deploy separado, e ambiente local de debug para reproduzir bugs reais  
**Project Type**: Monorepo com `apps/web`, `apps/api`, pacotes compartilhados e documentacao de arquitetura/produto  
**Performance Goals**: Eliminar bloqueios funcionais e erros de runtime na jornada principal, remover botoes e gates que parecem quebrados, e evitar regressao de fan-out, refetch ou estados contraditorios em `planner`, `dashboard` e `engine`  
**Constraints**: Enforcement final de authz, entitlements, billing e IA permanece server-side; o beta ainda opera com escada manual `free -> pro -> premium`; o sandbox de entitlements pode distorcer a leitura do usuario real; dados Firestore podem chegar ausentes ou parciais; `web` e `api` continuam deployando separadas  
**Scale/Scope**: Primeiro ciclo de estabilizacao cobre `login -> planner -> dashboard -> engine`, bugs visiveis que mascaram valor do produto, e causas raiz cross-layer diretamente ligadas a esses fluxos; areas secundarias entram depois, salvo quando forem a origem de uma quebra P1

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Architecture boundaries respected: o plano separa sintomas de UI,
      contratos, entitlements, API e dominio, e exige que cada correcao
      respeite a fronteira ja definida entre `apps/web`, `apps/api` e
      `packages/*`.
- [x] Server-side trust boundaries respected: bugs em auth, quotas,
      entitlements, billing e IA serao tratados a partir da verdade server-side
      e nao por mascaramento no frontend.
- [x] Risk-based test strategy defined: bugs em fluxos criticos, APIs,
      contratos, entitlements e regressao MUST receber cobertura automatizada;
      excecoes manuais ficam limitadas a ajustes visuais de baixo risco, com
      justificativa e smoke documentado.
- [x] Operational readiness defined: o plano inclui telemetria, erros de
      runtime, sinais de console, contratos de smoke, e revalidacao do fluxo
      principal apos cada lote de correcao.
- [x] Documentation impact captured: qualquer mudanca que altere ownership,
      rotas canonicas, fluxo operacional ou gates MUST atualizar
      `docs/architecture/current-architecture.md` e docs operacionais
      pertinentes no mesmo trabalho.

**Post-Design Re-check**: PASS. Os artefatos desta fase mantem a constituicao:
nao criam nova fronteira de runtime, reforcam o server-side como fonte final de
confianca, definem cobertura por risco e deixam a documentacao como requisito
de conclusao sempre que o fix alterar comportamento arquitetural ou operacional.

## Project Structure

### Documentation (this feature)

```text
specs/002-app-stabilization/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   |-- smoke-validation.md
|   `-- stability-backlog.md
`-- tasks.md
```

### Source Code (repository root)

```text
apps/
|-- web/
|   |-- src/app/login/
|   |-- src/app/(app)/planner/
|   |-- src/app/(app)/dashboard/
|   |-- src/app/(app)/engine/
|   |-- src/components/
|   `-- tests/
`-- api/
    |-- src/modules/engine/
    |-- src/modules/entitlements/
    |-- src/modules/ai/
    `-- src/

packages/
|-- domain/
|-- application/
|-- contracts/
`-- infrastructure-firebase/

docs/
|-- architecture/
`-- product/
```

**Structure Decision**: A estabilizacao opera sobre o monorepo atual e usa como
fontes principais os fluxos de `apps/web/src/app/login/page.tsx`,
`apps/web/src/app/(app)/planner/page.tsx`,
`apps/web/src/app/(app)/dashboard/page.tsx`,
`apps/web/src/app/(app)/engine/page.tsx`,
componentes como `PlanManager`, `Dashboard`, `EntitlementSandboxCard`,
camadas server-side de `apps/api/src/modules/*`, a arquitetura viva em
`docs/architecture/current-architecture.md`, e a cobertura automatizada ja
existente em `apps/web/tests/` e `apps/api/src/**/*.test.ts`.

## Complexity Tracking

Nenhuma violacao da constituicao foi identificada nesta fase. A unica excecao
aceitavel nesta iniciativa e o uso de validacao manual complementar para bugs
puramente visuais ou de experiencia de baixo risco, desde que o lote registre
por que nao precisa de um guarda automatizado novo.
