# Structural Improvements

## ST-01 - Endurecer trust boundaries de auth, entitlements e quota

- Category: `structural`
- Related findings: `F-MON-02`, `F-SEC-01`
- Expected user value: acesso, upgrade e limites passam a ser percebidos como
  justos e confiaveis.
- Business goal: proteger monetizacao, evitar vazamento de planos e parar de
  contaminar o aprendizado do beta.
- Impact: `high`
- Effort: `medium`
- Risk: `high`
- Dependencies: nenhuma; esta melhoria deve preceder qualquer leitura seria de
  monetizacao ou escalada do beta.
- Expected signal: nao existe mais caminho cliente-direto para alterar
  `planTier`/usage; a API dedicada exige auth real fora de sandbox controlado.

## ST-02 - Consolidar ownership server-side entre `apps/web` e `apps/api`

- Category: `structural`
- Related findings: `F-ARCH-01`
- Expected user value: menos inconsistencias de comportamento e menos risco de
  regressao entre rotas aparentemente equivalentes.
- Business goal: simplificar deploy, observabilidade, autorizacao e evolucao
  futura do backend.
- Impact: `high`
- Effort: `high`
- Risk: `medium`
- Dependencies: `ST-01`.
- Expected signal: AI, engine e entitlements passam a ter ownership unico ou
  explicitamente mediado, com menos duplicidade de rotas.

## ST-03 - Criar baseline de observabilidade de produto

- Category: `structural`
- Related findings: `F-OBS-02`
- Expected user value: o produto aprende mais rapido com pontos de bloqueio,
  friccao e uso recorrente.
- Business goal: orientar retencao e monetizacao por evidencia, nao por
  intuicao local.
- Impact: `high`
- Effort: `medium`
- Risk: `medium`
- Dependencies: `ST-01` para evitar sinal comercial poluido.
- Expected signal: eventos de bloqueio, CTA, quota e status passam a ser
  visiveis em revisao semanal do beta.

## ST-04 - Expandir cobertura automatizada para a jornada principal e gates

- Category: `structural`
- Related findings: `F-TECH-02`
- Expected user value: menos regressao nas telas e flows mais sensiveis do
  produto.
- Business goal: ganhar velocidade de iteracao sem quebrar onboarding,
  entitlements ou jornada principal.
- Impact: `medium`
- Effort: `medium`
- Risk: `low`
- Dependencies: `ST-01`; idealmente tambem acompanha `ST-02`.
- Expected signal: existe suite cobrindo pelo menos onboarding, journey
  coherence, entitlements e rotas server-side centrais.

## ST-05 - Reduzir fan-out e custo das leituras mais pesadas

- Category: `structural`
- Related findings: `F-PERF-01`, `F-PERF-02`
- Expected user value: planner multi-edital e caderno de erros ficam mais
  responsivos conforme o volume cresce.
- Business goal: ampliar beta e uso pro sem degradar as areas de maior
  valor percebido.
- Impact: `medium`
- Effort: `medium`
- Risk: `medium`
- Dependencies: pode comecar cedo, mas fica mais seguro apos `ST-02`.
- Expected signal: queda em latencia percebida nessas superficies e menos
  necessidade de tolerar gargalos via "beta pequeno".

## ST-06 - Atualizar documentacao de arquitetura e eliminar drift de superficies legadas

- Category: `structural`
- Related findings: `F-ARCH-02`
- Expected user value: indireto, via maior clareza interna e menor risco de
  decisao errada em evolucoes futuras.
- Business goal: alinhar time, docs e ownership real do monorepo.
- Impact: `medium`
- Effort: `medium`
- Risk: `low`
- Dependencies: idealmente depois de `ST-02`, quando a nova fronteira estiver
  mais clara.
- Expected signal: `README.md` e docs de arquitetura refletem o runtime atual,
  e superficies legadas deixam de competir por ownership.
