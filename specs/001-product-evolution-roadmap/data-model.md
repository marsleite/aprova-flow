# Data Model: Reavaliacao e Roadmap do Produto

Este modelo descreve as entidades conceituais que estruturam a auditoria e o
roadmap. Nao se trata de schema de producao; ele define como os achados devem
ser organizados, comparados e priorizados nesta iniciativa.

## Entity: ProductArea

| Field | Type | Description | Validation |
|---|---|---|---|
| `area_id` | string | Identificador estavel da area auditada | MUST be unique |
| `name` | enum | Nome canonico da area | MUST be one of: `product-value`, `ux-flows`, `onboarding-retention`, `architecture`, `technical-quality`, `performance`, `observability`, `monetization`, `scalability` |
| `audit_goal` | string | Pergunta central que a area precisa responder | MUST be explicit and user/business-oriented |
| `priority_order` | integer | Ordem recomendada de leitura na auditoria | MUST be >= 1 |
| `primary_evidence` | string[] | Fontes principais para essa area | MUST reference docs, code, metrics, or qualitative input |

## Entity: EvidenceSource

| Field | Type | Description | Validation |
|---|---|---|---|
| `evidence_id` | string | Identificador estavel da evidencia | MUST be unique |
| `source_type` | enum | Tipo de evidencia | MUST be one of: `code`, `doc`, `metric`, `qualitative`, `derived` |
| `reference` | string | Caminho, evento, view ou descricao curta | MUST be traceable |
| `confidence` | enum | Quanta confianca a evidencia suporta | MUST be one of: `high`, `medium`, `low` |
| `note` | string | Observacao contextual opcional | SHOULD explain caveats when confidence is not `high` |

## Entity: Finding

| Field | Type | Description | Validation |
|---|---|---|---|
| `finding_id` | string | Identificador estavel do achado | MUST be unique |
| `area_id` | string | Area do produto associada | MUST reference an existing `ProductArea` |
| `finding_type` | enum | Natureza do achado | MUST be one of: `strength`, `problem`, `risk`, `inconsistency`, `measurement-gap` |
| `summary` | string | Descricao curta e objetiva | MUST be understandable without implementation detail |
| `severity` | enum | Gravidade atual | MUST be one of: `low`, `medium`, `high`, `critical` |
| `affected_personas` | string[] | Perfis mais impactados | SHOULD reference `iniciante`, `intermediario`, `avancado` when relevant |
| `impacted_journey` | string | Trecho da jornada impactado | SHOULD use canonical names like `onboarding`, `planner`, `dashboard`, `engine` |
| `why_it_matters` | string | Razao de negocio/usuario/operacao | MUST explain consequence |
| `evidence_ids` | string[] | Evidencias que sustentam o achado | MUST contain at least one evidence source |

## Entity: Opportunity

| Field | Type | Description | Validation |
|---|---|---|---|
| `opportunity_id` | string | Identificador estavel da oportunidade | MUST be unique |
| `title` | string | Nome curto da oportunidade | MUST be specific |
| `category` | enum | Tipo de investimento | MUST be one of: `quick-win`, `structural`, `strategic` |
| `related_findings` | string[] | Achados que motivam a oportunidade | MUST reference one or more `Finding` entries |
| `expected_user_value` | string | Beneficio para o usuario | MUST be explicit |
| `business_goal` | string | Resultado de negocio esperado | SHOULD align with retention/recurrence first |
| `impact` | enum | Potencial de melhoria | MUST be one of: `low`, `medium`, `high` |
| `effort` | enum | Esforco relativo | MUST be one of: `low`, `medium`, `high` |
| `risk` | enum | Risco de execucao ou regressao | MUST be one of: `low`, `medium`, `high` |
| `dependencies` | string[] | Dependencias previas | MAY reference opportunities, constraints, or metrics gaps |
| `expected_signal` | string | Como verificar se funcionou | MUST describe an observable outcome |
| `recommended_phase` | string | Fase candidata do roadmap | MUST reference a `RoadmapPhase` |

## Entity: Constraint

| Field | Type | Description | Validation |
|---|---|---|---|
| `constraint_id` | string | Identificador da restricao | MUST be unique |
| `constraint_type` | enum | Tipo de restricao | MUST be one of: `architecture`, `operations`, `measurement`, `commercial`, `capacity` |
| `description` | string | Restricao observada | MUST describe the current limit |
| `affected_areas` | string[] | Areas impactadas | MUST reference one or more `ProductArea` values |
| `mitigation_direction` | string | Direcao de mitigacao | SHOULD be actionable |

## Entity: RoadmapPhase

| Field | Type | Description | Validation |
|---|---|---|---|
| `phase_id` | string | Identificador estavel da fase | MUST be unique |
| `name` | string | Nome da fase | MUST be specific and outcome-oriented |
| `objective` | string | Objetivo principal | MUST be singular and testable |
| `entry_criteria` | string[] | O que precisa estar claro antes da fase | SHOULD be explicit |
| `included_opportunities` | string[] | Oportunidades que pertencem a fase | MUST reference existing `Opportunity` entries |
| `exit_signals` | string[] | Sinais de conclusao da fase | MUST be observable |

## Entity: MetricSignal

| Field | Type | Description | Validation |
|---|---|---|---|
| `metric_id` | string | Identificador da metrica ou evento | MUST be unique |
| `name` | string | Nome canonico da metrica/evento | MUST be explicit |
| `availability` | enum | Situacao atual | MUST be one of: `existing`, `derived`, `missing` |
| `decision_use` | string | Que decisao essa metrica informa | MUST be clear |
| `source_reference` | string | Onde observar ou por que falta | SHOULD cite docs/code when available |

## Relationships

- Um `ProductArea` possui muitos `Finding`.
- Um `Finding` referencia uma ou mais `EvidenceSource`.
- Uma `Opportunity` responde a um ou mais `Finding`.
- Uma `Opportunity` pode depender de `Constraint` e de `MetricSignal` ausentes.
- Um `RoadmapPhase` agrupa varias `Opportunity`.
- Um `MetricSignal` pode ser ligado a varias `ProductArea` e a varias
  `Opportunity`.

## Validation Rules

- Todo `Finding` MUST citar pelo menos uma evidencia observavel.
- Toda `Opportunity` MUST explicitar `impact`, `effort`, `risk`,
  `dependencies`, `expected_user_value` e `expected_signal`.
- Toda `RoadmapPhase` MUST ter um objetivo central e sinais claros de saida.
- Nenhuma recomendacao pode existir sem relacao com o estado atual documentado
  do produto.

## State Transitions

### Opportunity Lifecycle

`identified` -> `assessed` -> `prioritized` -> `sequenced` -> `executed` -> `measured`

- `identified`: oportunidade extraida do diagnostico
- `assessed`: classificada por impacto, esforco, risco e dependencia
- `prioritized`: aceita como candidata ao roadmap
- `sequenced`: posicionada em fase com pre-requisitos claros
- `executed`: transformada em iniciativa real
- `measured`: validada por sinais de resultado

### RoadmapPhase Lifecycle

`proposed` -> `approved` -> `active` -> `completed`

- `proposed`: fase ainda em desenho
- `approved`: fase aceita como parte da ordem recomendada
- `active`: execucao em andamento
- `completed`: objetivos e sinais de saida atingidos
