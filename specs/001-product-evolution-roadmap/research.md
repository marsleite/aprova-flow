# Research: Reavaliacao e Roadmap do Produto

## Decision 1: Comecar pela jornada principal

- **Decision**: A auditoria deve comecar pela jornada `onboarding -> planner ->
  dashboard -> engine`.
- **Rationale**: A spec fixou coerencia de experiencia como dor prioritaria e
  retencao/recorrencia como principal criterio de desempate. O proprio
  `docs/product/pre-launch-audit.md` aponta a narrativa `macro -> semana ->
  hoje` como o principal ponto ainda frouxo da experiencia.
- **Alternatives considered**:
  - Comecar por monetizacao e gates: importante, mas tende a produzir ajustes
    menos confiaveis se a experiencia central ainda estiver difusa.
  - Comecar por simulados/caderno de erros: relevante, mas nao representa a
    espinha dorsal do valor principal definida na spec.

## Decision 2: Usar comportamento funcional e recorrencia como evidencia principal

- **Decision**: O diagnostico deve dar mais peso a sinais de uso funcional e
  recorrencia dos fluxos centrais do que a telemetria de IA ou aos sinais de
  conversao.
- **Rationale**: `docs/product/beta-metrics-roadmap.md` mostra que ja existem
  dados funcionais ricos e telemetria de IA, mas faltam eventos de produto mais
  fortes para billing e upgrade. Isso torna o comportamento recorrente mais
  confiavel hoje como base de leitura.
- **Alternatives considered**:
  - Priorizar telemetria de IA: util para custo e operacao, mas insuficiente
    como leitura principal de produto.
  - Priorizar bloqueio e upgrade: ainda existem lacunas de instrumentacao e o
    beta segue manual.

## Decision 3: Tratar monetizacao atual como aprendizado, nao como implantacao imediata

- **Decision**: O roadmap deve tratar monetizacao atual como fase de
  aprendizado controlado em beta e deixar gateway real para uma etapa posterior.
- **Rationale**: A documentacao de beta e monetizacao indica que a escada
  `free -> pro` ainda esta sendo calibrada, e o proprio beta depende mais de
  aprender valor percebido do que de cobrar cedo. Forcar gateway antes de
  clareza comercial aumenta rework.
- **Alternatives considered**:
  - Implantar cobranca cedo: aumentaria risco operacional sem reduzir as
    incertezas mais importantes.
  - Tirar monetizacao do radar: perderia uma dimensao essencial do roadmap,
    especialmente por a escada comercial ja existir no produto.

## Decision 4: Consolidar fronteiras arquiteturais como principal limite tecnico

- **Decision**: A principal limitacao tecnica a considerar nesta auditoria e a
  consolidacao ainda incompleta entre `apps/web`, `apps/api` e os pacotes
  compartilhados.
- **Rationale**: `docs/architecture/current-architecture.md` explicita que a
  `apps/api` existe e builda, mas ainda nao concentra auth, billing e
  persistencia real. Ao mesmo tempo, o `apps/web` ainda carrega rotas e
  responsabilidade operacional temporaria. Isso impacta ownership, testabilidade
  e evolucao futura.
- **Alternatives considered**:
  - Tratar performance do frontend como principal limite: importante, mas mais
    localizada.
  - Tratar allowlist/manual ops como principal limite: importante, mas mais
    operacional do que estrutural.

## Decision 5: Organizar o backlog em tres camadas de investimento

- **Decision**: As recomendacoes devem ser agrupadas em `quick wins`,
  `melhorias estruturais` e `melhorias estrategicas`.
- **Rationale**: O usuario pediu diferenciacao clara por impacto, esforco,
  risco e dependencia. A classificacao em tres camadas ajuda a separar o que
  melhora percepcao imediatamente do que precisa fundacao e do que depende de
  aprendizado previo.
- **Alternatives considered**:
  - Lista unica ordenada: facil de ler, mas pior para decidir capacidade e
    pre-requisitos.
  - Separacao por area apenas: boa para diagnostico, ruim para sequenciamento.

## Decision 6: Formalizar um contrato para o entregavel do roadmap

- **Decision**: O resultado da auditoria deve seguir um contrato documental com
  oito blocos obrigatorios e campos minimos por item.
- **Rationale**: Como esta iniciativa nao expoe uma API de runtime, o "contrato"
  mais util aqui e o formato minimo do entregavel analitico. Isso reduz risco
  de diagnosticos impressionistas e facilita posterior geracao de tasks.
- **Alternatives considered**:
  - Nao definir contrato: aumentaria liberdade, mas tambem inconsistencia entre
    analise, backlog e roadmap.
