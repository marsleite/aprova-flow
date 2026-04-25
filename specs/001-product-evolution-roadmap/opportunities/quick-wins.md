# Quick Wins

## QW-01 - Realinhar a entrada do produto com a jornada canonica

- Category: `quick-win`
- Related findings: `F-UX-01`, `F-ONB-01`
- Expected user value: o usuario entende mais cedo por onde comecar e como o
  produto se encadeia.
- Business goal: aumentar ativacao com menos confusao entre macro, semana e
  hoje.
- Impact: `high`
- Effort: `low`
- Risk: `low`
- Dependency: nenhuma dependencia tecnica pesada; pode ser planejado logo apos
  o hardening minimo de trust boundary.
- Expected signal: menor confusao qualitativa sobre `planner`, `dashboard` e
  `engine`; mais usuarios chegam ao primeiro plano e a primeira sessao com
  menos explicacao manual.

## QW-02 - Tornar o onboarding beta honestamente invite-first

- Category: `quick-win`
- Related findings: `F-ONB-01`
- Expected user value: o usuario entende imediatamente que o acesso e por
  convite e nao sente "erro disfarcado" no cadastro.
- Business goal: reduzir suporte manual e aumentar confianca logo na entrada.
- Impact: `high`
- Effort: `low`
- Risk: `low`
- Dependency: nenhuma.
- Expected signal: queda em relatos de cadastro confuso e menor friccao no
  primeiro contato.

## QW-03 - Canonicalizar a navegacao de simulados

- Category: `quick-win`
- Related findings: `F-UX-02`
- Expected user value: a area de provas passa a ter um caminho unico e mais
  previsivel entre descoberta e execucao.
- Business goal: aumentar uso de simulados sem depender de memoria de rotas.
- Impact: `high`
- Effort: `medium`
- Risk: `low`
- Dependency: nenhuma dependencia estrutural; convem alinhar junto do trabalho
  de naming.
- Expected signal: menos loops de navegacao e mais inicio direto de prova ou
  simulado a partir da area principal.

## QW-04 - Normalizar naming e copy da jornada principal

- Category: `quick-win`
- Related findings: `F-UX-01`, `F-PV-02`
- Expected user value: os nomes das superficies passam a reforcar a mesma
  historia do produto.
- Business goal: reduzir dispersao narrativa e melhorar memorizacao da proposta
  principal.
- Impact: `medium`
- Effort: `low`
- Risk: `low`
- Dependency: nenhuma.
- Expected signal: usuarios conseguem explicar com mais consistencia a
  diferenca entre planner, dashboard e engine.

## QW-05 - Trocar linguagem de billing por linguagem honesta de beta

- Category: `quick-win`
- Related findings: `F-MON-01`, `F-MON-02`
- Expected user value: a experiencia comercial deixa de prometer faturamento
  real quando o fluxo ainda e operacional/manual.
- Business goal: alinhar expectativa e evitar erosao de confianca.
- Impact: `medium`
- Effort: `low`
- Risk: `low`
- Dependency: deve acompanhar o endurecimento do fluxo real de permissao para
  nao mascarar o problema estrutural.
- Expected signal: menos ambiguidade entre "plano", "beta" e "faturamento" nas
  conversas com testers.

## QW-06 - Explicitar vazios e falhas nas telas analiticas

- Category: `quick-win`
- Related findings: `F-TECH-02`, `F-OBS-02`
- Expected user value: o usuario sabe quando esta vendo ausencia de dados e nao
  uma leitura definitiva do sistema.
- Business goal: aumentar confianca sem inflar artificialmente a sensacao de
  maturidade.
- Impact: `medium`
- Effort: `medium`
- Risk: `low`
- Dependency: nenhuma.
- Expected signal: menos feedback qualitativo sobre telas "quebradas" ou
  metricas pouco confiaveis.
