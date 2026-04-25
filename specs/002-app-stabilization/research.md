# Research: Estabilizacao da Aplicacao

## Decision 1: Comecar pela jornada principal, nao por uma varredura horizontal

- **Decision**: O primeiro ciclo de estabilizacao deve comecar por
  `login -> planner -> dashboard -> engine`, e so depois expandir para
  superficies secundarias.
- **Rationale**: A spec fixa essa jornada como a espinha dorsal do valor do
  produto, e os bugs que aparecem nela afetam confianca, recorrencia e
  percepcao de qualidade de forma imediata.
- **Alternatives considered**:
  - Fazer bug hunt repo-wide primeiro: aumentaria volume sem melhorar a ordem
    de ataque.
  - Comecar por telas adjacentes como provas ou settings: importante, mas nao
    remove o maior risco atual de quebra percebida.

## Decision 2: Tratar erros visiveis, warnings e acoes enganosas como bugs reais quando afetam o fluxo

- **Decision**: A iniciativa deve tratar erros de runtime, warnings de console,
  renderizacao quebrada e acoes que parecem habilitadas, mas falham ou nao
  levam ao fluxo correto, como bugs de estabilizacao de verdade.
- **Rationale**: No estado atual, problemas desse tipo ja apareceram em pontos
  centrais, como o warning de chave duplicada em `PlanManager` e o historico de
  CTA do Planner que parecia quebrado. Mesmo quando nao derrubam a pagina,
  esses sinais corrompem a confianca e mascaram falhas maiores.
- **Alternatives considered**:
  - Tratar warnings so como cleanup tecnico: deixa o usuario convivendo com
    sinais de quebra em telas principais.
  - Priorizar apenas erros fatais: perderia uma classe de falha que afeta uso e
    suporte, mesmo sem crash completo.

## Decision 3: Usar a verdade server-side para bugs de auth, plano, quota e IA

- **Decision**: Sempre que houver divergencia entre UI e backend em auth,
  entitlements, quotas, billing ou IA, a correcao deve partir do comportamento
  canonico server-side e depois alinhar a experiencia do frontend.
- **Rationale**: A arquitetura atual do repositorio ja consolidou `apps/api`
  como runtime canonico desses recursos. Corrigir so a copy ou so o estado do
  cliente sem bater com a fonte server-side reintroduz os mesmos bugs em outra
  tela.
- **Alternatives considered**:
  - Resolver por fallback de frontend: mais rapido localmente, mas mais fragil.
  - Duplicar guard no cliente e no servidor sem ownership claro: aumenta drift e
    dificulta manutencao.

## Decision 4: Organizar o backlog por camada de ownership e nao so por tela

- **Decision**: O backlog de bugs deve classificar cada item por fluxo afetado e
  por camada dominante de ownership: `ui-render-state`,
  `auth-entitlement-gating`, `api-data-contract`, `observability-test-gap` ou
  `cross-layer`.
- **Rationale**: Muitos bugs da jornada principal atravessam mais de uma tela e
  mais de uma camada. Agrupar apenas por pagina faz o time corrigir sintoma em
  um lugar e deixar a causa raiz viva em outro.
- **Alternatives considered**:
  - Classificar so por tela: bom para triagem inicial, ruim para eliminar raiz.
  - Classificar so por pacote/codigo: bom para engenharia, ruim para leitura de
    impacto no usuario.

## Decision 5: Trabalhar em lotes curtos com criterio de saida e smoke fixo

- **Decision**: As correcoes devem ser entregues em lotes pequenos, cada um com
  objetivo unico, bugs incluidos, dependencia explicita, guarda automatizado e
  smoke testing obrigatorio no fluxo afetado.
- **Rationale**: Estabilidade melhora mais com ciclos curtos e verificaveis do
  que com uma frente longa de "consertar tudo". Isso reduz regressao, facilita
  rollback mental e evita encerrar bug por impressao subjetiva.
- **Alternatives considered**:
  - Fazer uma grande rodada de bugfix: aumenta acoplamento entre causas.
  - Corrigir item a item sem agrupar: dificulta sequenciar dependencias e medir
    progresso do ciclo.

## Decision 6: Exigir um ledger de bugs e um contrato de smoke como fonte de verdade

- **Decision**: Esta iniciativa deve produzir dois contratos de trabalho: um
  para o backlog/ledger de bugs e outro para a validacao de smoke dos lotes.
- **Rationale**: O usuario pediu nao so correcao, mas um plano para deixar a
  aplicacao livre de falhas. Sem um formato minimo comum para registro,
  priorizacao e encerramento, a iniciativa volta a depender de memoria de
  conversa e percepcao local.
- **Alternatives considered**:
  - Confiar apenas em tasks futuras: as tasks ajudam na execucao, mas nao
    substituem o formato minimo do backlog e da validacao.
  - Usar comentarios soltos no PR: dificil de comparar, reusar e auditar.

## Decision 7: Aceitar progresso parcial quando o P1 estiver estabilizado

- **Decision**: O primeiro ciclo pode ser considerado bem-sucedido quando os
  bugs P1 da jornada principal estiverem mapeados, corrigidos ou com plano de
  ataque claro, mesmo que P2 e P3 continuem em aberto.
- **Rationale**: O objetivo do ciclo inicial e recuperar confianca e
  utilizabilidade. Esperar "zero bugs" antes de declarar progresso gera escopo
  infinito e atrasa o ganho principal.
- **Alternatives considered**:
  - Exigir eliminacao total de bugs: irrealista para um produto vivo.
  - Fechar ciclo sem backlog claro dos P2/P3: deixaria a iniciativa sem
    continuidade estruturada.
