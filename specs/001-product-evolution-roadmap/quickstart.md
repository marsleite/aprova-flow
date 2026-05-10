# Quickstart: Como Executar a Reavaliacao

## Objetivo

Produzir uma leitura ponta a ponta do AprovaMind que saia do nivel de
impressao geral e termine em um roadmap priorizado, apoiado por evidencias do
produto atual.

## Pre-requisitos

- Estar no branch `001-product-evolution-roadmap`
- Usar esta pasta `specs/001-product-evolution-roadmap/` como fonte dos
  artefatos de planejamento
- Consultar as principais fontes de contexto do projeto:
  - `README.md`
  - `docs/product/pre-launch-audit.md`
  - `docs/product/beta-metrics-roadmap.md`
  - `docs/product/entitlements-matrix.md`
  - `docs/architecture/current-architecture.md`
  - superficies atuais de `apps/web/src/app/(app)/`, `apps/web/src/components/`
    e `apps/api/src/`

## Workflow Recomendado

### 1. Ler a jornada principal primeiro

- Revisar onboarding, planner, dashboard e engine como uma sequencia unica
- Anotar quebras de narrativa, descoberta, navegacao, expectativa e confianca
- Separar problemas de fluxo de problemas de implementacao

### 2. Expandir para as areas adjacentes

Depois da jornada principal, revisar:

- proposta de valor e posicionamento do produto
- UX/UI e naming
- onboarding e retencao
- provas, simulados e caderno de erros
- arquitetura, ownership e organizacao do codigo
- testabilidade e qualidade tecnica
- performance e gargalos perceptiveis
- observabilidade, eventos e metricas
- monetizacao, gates, quotas e escada de planos
- escalabilidade futura

### 3. Registrar os achados no modelo da auditoria

Para cada area:

- criar `Finding` com tipo, gravidade e evidencia
- diferenciar `strength`, `problem`, `risk`, `inconsistency` e
  `measurement-gap`
- ligar cada achado a pelo menos uma evidencia concreta

### 4. Transformar achados em oportunidades

Para cada problema relevante:

- propor uma `Opportunity`
- classificar por `impact`, `effort`, `risk` e `dependencies`
- marcar como `quick-win`, `structural` ou `strategic`
- explicitar o sinal esperado de melhora

### 5. Montar o roadmap por fases

- Comecar pelo que aumenta coerencia, retencao e recorrencia da rotina
- Tratar monetizacao atual como beta manual de aprendizado
- Adiar gateway real e movimentos pro dependentes de fundacao comercial
- Nao abrir frentes arquiteturais mais profundas sem esclarecer ownership entre
  `apps/web`, `apps/api` e `packages/*`

### 6. Validar contra o contrato do entregavel

Antes de considerar a analise pronta, confirmar que o resultado respeita o
contrato em `contracts/roadmap-deliverable.md`:

- tem os 8 blocos obrigatorios
- comeca pela jornada principal
- usa evidencias de estado atual
- evita sugestoes genericas
- explicita dependencias e ordem recomendada

## Resultado Esperado

Ao final da execucao, o time deve ter um material que permita responder:

- onde o produto ja entrega valor real hoje
- quais problemas e riscos mais ameacam retencao e confianca
- o que pode ser corrigido rapido
- o que exige base estrutural
- o que e aposta estrategica para depois
- qual a ordem mais segura e valiosa para executar essas frentes
