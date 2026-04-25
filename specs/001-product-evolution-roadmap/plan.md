# Implementation Plan: Reavaliacao e Roadmap do Produto

**Branch**: `001-product-evolution-roadmap` | **Date**: 2026-04-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-product-evolution-roadmap/spec.md`

**Note**: This plan turns the approved re-evaluation spec into a concrete audit
workflow and a decision-ready roadmap structure, grounded in the current
AprovaMind codebase, product docs, beta metrics, and monetization artifacts.

## Summary

Realizar uma auditoria horizontal do AprovaMind, usando o estado real atual do
produto para produzir um roadmap priorizado de evolucao. A leitura comeca pela
jornada central `onboarding -> planner -> dashboard -> engine`, usa evidencias
de uso funcional e recorrencia como fonte principal de diagnostico, trata a
coerencia de experiencia como dor prioritaria, e posiciona monetizacao como
aprendizado controlado de beta antes de gateway real.

O entregavel final desta iniciativa deve sair pronto para ser apresentado em
oito blocos consistentes: diagnostico do estado atual, pontos fortes, problemas
e riscos, quick wins, melhorias estruturais, melhorias estrategicas, roadmap
por fases, e dependencias com ordem recomendada de execucao.

## Technical Context

**Language/Version**: TypeScript 5.x no monorepo; React 19.2 e Next.js 16.1.6 no `apps/web`; Node + Fastify 5.6 no `apps/api`  
**Primary Dependencies**: Next.js 16, React 19, Fastify 5, Firebase 12, `@google/genai`, `@aprovamind/*` packages compartilhados, Vitest, Node test runner  
**Storage**: Cloud Firestore para dados de produto e beta; artefatos desta iniciativa em arquivos Markdown dentro de `specs/`  
**Testing**: Vitest no `apps/web`, Node `--test` via `tsx` no `apps/api`, validacao manual baseada em evidencias para esta iniciativa de planejamento  
**Target Platform**: Aplicacao web em Vercel, API dedicada com deploy separado, e fluxo local de planejamento via Spec Kit  
**Project Type**: Monorepo com `apps/web`, `apps/api`, pacotes compartilhados e documentacao de produto/arquitetura  
**Performance Goals**: Identificar gargalos perceptiveis na jornada principal e classificar oportunidades de remediacao sem introduzir novos SLAs de producao nesta fase  
**Constraints**: Considerar apenas o estado real atual do projeto, evitar sugestoes genericas, priorizar retencao e recorrencia, manter `free -> pro` como principal escada comercial, e respeitar as fronteiras atuais entre `apps/web`, `apps/api` e `packages/*`  
**Scale/Scope**: Auditoria completa do produto atual, cobrindo proposta de valor, UX/UI, onboarding, retencao, arquitetura, testabilidade, performance, observabilidade, monetizacao e escalabilidade futura

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Architecture boundaries respected: a auditoria vai inspecionar, mas nao
      diluir, as responsabilidades entre `apps/web`, `apps/api` e
      `packages/*`; achados e recomendacoes distinguirao claramente camada de
      experiencia, camada server-side e regras compartilhadas.
- [x] Server-side trust boundaries respected: a revisao de IA, billing,
      entitlements e quotas parte do principio de enforcement server-side e nao
      propora gating final confiando apenas no frontend.
- [x] Risk-based test strategy defined: esta iniciativa cria artefatos de
      planejamento, entao a validacao e documental e baseada em evidencias;
      qualquer trabalho derivado que altere comportamento em runtime devera
      definir cobertura automatizada conforme risco.
- [x] Operational readiness defined: a auditoria inclui explicitamente
      observabilidade, health, quotas, eventos de bloqueio, operacao beta e
      fronteiras de deploy como areas de diagnostico.
- [x] Documentation impact captured: este plano cria artefatos em `specs/`; as
      futuras iniciativas do roadmap deverao atualizar `README.md`,
      `docs/architecture/current-architecture.md` e
      `docs/architecture/deploy-and-environments.md` quando houver mudanca de
      estrutura, runtime ou fluxo operacional.

**Post-Design Re-check**: PASS. Os artefatos gerados nesta fase mantem a
constituicao sem violacoes: nao criam nova fronteira de runtime, nao afrouxam
enforcement server-side, e deixam explicita a justificativa de validacao manual
para um artefato de planejamento.

## Project Structure

### Documentation (this feature)

```text
specs/001-product-evolution-roadmap/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- roadmap-deliverable.md
`-- tasks.md
```

### Source Code (repository root)

```text
apps/
|-- web/
|   |-- src/app/
|   |-- src/components/
|   |-- src/lib/
|   `-- tests/
`-- api/
    |-- src/
    `-- api/

packages/
|-- domain/
|-- application/
|-- contracts/
|-- ai-gateway/
|-- infrastructure-firebase/
`-- infrastructure-billing/

docs/
|-- architecture/
`-- product/
```

**Structure Decision**: A auditoria opera sobre o monorepo atual e sobre a
documentacao existente. As principais fontes de evidencia desta rodada sao
`README.md`, `docs/product/pre-launch-audit.md`,
`docs/product/beta-metrics-roadmap.md`,
`docs/product/entitlements-matrix.md`,
`docs/architecture/current-architecture.md`,
`apps/web/src/app/(app)/`, `apps/web/src/components/`, `apps/api/src/`, e os
pacotes compartilhados relevantes para motor, entitlements e AI gateway.

## Complexity Tracking

Nenhuma violacao da constituicao foi identificada nesta fase. A unica excecao
explicitamente aceita e a validacao manual do conteudo destes artefatos, por se
tratar de uma iniciativa de diagnostico e roadmap sem mudanca de comportamento
em producao.
