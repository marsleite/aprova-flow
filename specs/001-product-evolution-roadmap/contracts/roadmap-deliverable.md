# Contract: Reavaliacao e Roadmap Deliverable

## Purpose

Definir a estrutura minima obrigatoria do entregavel final desta iniciativa,
garantindo que o diagnostico e o roadmap saiam consistentes, comparaveis e
ancorados no estado real do AprovaMind.

## Output Format

- **Format**: Markdown
- **Audience**: produto, design, engenharia e operacao
- **Source of truth**: estado atual do codigo, documentacao, operacao beta e
  metricas disponiveis
- **Rule**: nenhuma recomendacao entra no entregavel sem evidencia de estado
  atual ou sem a explicacao de qual lacuna de medicao impede maior certeza

## Required Sections

| # | Section | Required Content |
|---|---|---|
| 1 | Diagnostico do estado atual | Leitura por area auditada, com estado atual, evidencias e implicacoes |
| 2 | Pontos fortes | Lista do que ja funciona bem e por que isso importa |
| 3 | Problemas e riscos | Problemas, inconsistencias, riscos e lacunas de medicao com gravidade |
| 4 | Quick wins | Melhorias de baixo esforco ou baixa dependencia com ganho perceptivel |
| 5 | Melhorias estruturais | Mudancas que fortalecem fundacao tecnica, operacional ou de UX |
| 6 | Melhorias estrategicas | Apostas de medio/longo prazo dependentes de base mais madura |
| 7 | Roadmap por fases | Fases sequenciadas com objetivo, itens incluidos e sinais de saida |
| 8 | Dependencias e ordem recomendada de execucao | O que precisa acontecer antes de cada fase e por que a ordem faz sentido |

## Section-Level Rules

### 1. Diagnostico do estado atual

- MUST cobrir: proposta de valor, UX/UI e fluxos principais, onboarding e
  retencao, arquitetura, qualidade tecnica, performance, observabilidade,
  monetizacao e escalabilidade.
- MUST comecar pela jornada `onboarding -> planner -> dashboard -> engine`.
- MUST separar fato observado de inferencia.

### 2. Pontos fortes

- MUST listar somente pontos sustentados por evidencias reais do produto atual.
- SHOULD destacar o que merece ser preservado no roadmap.

### 3. Problemas e riscos

- MUST incluir severidade (`low`, `medium`, `high`, `critical`).
- MUST indicar impacto em usuario, negocio ou operacao.
- SHOULD explicitar quando o problema vem de falta de medicao, nao apenas de UX
  ou implementacao.

### 4. Quick wins

- MUST ter `impact`, `effort`, `risk` e `dependency`.
- SHOULD representar ganho perceptivel sem exigir grande fundacao nova.

### 5. Melhorias estruturais

- MUST atacar limites de arquitetura, ownership, testabilidade,
  instrumentacao ou coerencia sistemica.
- SHOULD explicitar o risco de nao fazer.

### 6. Melhorias estrategicas

- MUST depender de aprendizados ou fundacoes anteriores quando apropriado.
- SHOULD deixar claro por que ainda nao sao o primeiro movimento.

### 7. Roadmap por fases

- MUST ordenar fases por dependencia real, nao por preferencia estetica.
- MUST refletir a prioridade de negocio em retencao e recorrencia.
- MUST tratar monetizacao atual como beta manual de aprendizado e gateway real
  como etapa posterior.

### 8. Dependencias e ordem recomendada de execucao

- MUST explicar o que precisa estar resolvido antes de abrir uma nova frente.
- SHOULD apontar o custo de executar fora de ordem.

## Scoring Taxonomy

| Field | Allowed Values | Meaning |
|---|---|---|
| Impact | `low`, `medium`, `high` | Potencial de melhorar valor percebido, retencao ou risco do produto |
| Effort | `low`, `medium`, `high` | Esforco relativo de entrega |
| Risk | `low`, `medium`, `high` | Risco de regressao, rework ou falha de execucao |
| Category | `quick-win`, `structural`, `strategic` | Tipo de investimento recomendado |

## Evidence Expectations

- Evidencia de produto: jornadas atuais, comportamento funcional, docs de
  produto, feedback qualitativo
- Evidencia tecnica: arquitetura atual, ownership de codigo, testabilidade,
  limites de deploy ou acoplamento
- Evidencia de medicao: o que ja existe hoje e o que ainda falta instrumentar
- Evidencia comercial: gates, quotas, bloqueios, copy de upgrade e clareza da
  escada `free -> pro -> premium`
