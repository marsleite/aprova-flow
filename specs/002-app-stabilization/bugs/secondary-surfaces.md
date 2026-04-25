# Secondary Surfaces Audit

## Objetivo

Mapear riscos e bugs fora do primeiro corte `login -> planner -> dashboard -> engine`
sem perder a ordem de ataque.

## Itens Mapeados

### `SEC-001` - Falta smoke documentado de coerencia de tier nas telas adjacentes

- superficies: `mentoring`, `provas`, `caderno-erros`, `settings`
- tipo: `wrong-gate`
- impacto: medio
- nota: as telas ja receberam alinhamentos de copy e CTA em trabalhos
  anteriores, mas este ciclo ainda nao registrou um passe dedicado comparando
  usuario real e sandbox nessas superficies.

### `SEC-002` - Compatibilidade via rotas Next ainda esconde parte do ownership para quem faz triagem

- superficies: `apps/web/src/app/api/*`
- tipo: `observability-gap`
- impacto: medio
- nota: o runtime canonico migrou para a `api`, mas a presenca de proxies finos
  na `web` ainda exige leitura arquitetural para nao atribuir bug ao lugar
  errado.

### `SEC-003` - Fluxos administrativos do beta continuam dependendo de validacao operacional manual

- superficies: `/settings`, painel admin do beta, sandbox de entitlement
- tipo: `regression`
- impacto: medio
- nota: isso nao bloqueia a cadeia principal, mas e relevante para revisao
  semanal do beta.

## Ordem Recomendada

1. Cobrir real user vs sandbox em `settings` e ao menos uma superficie adjacente
2. Revisar gates de `provas` e `mentoring`
3. Só depois abrir limpeza de warnings menores fora do fluxo principal
