# Core Flow Bugs: Login and Planner

## Objetivo

Registrar as falhas reproduzidas na entrada do fluxo e na primeira etapa
autenticada.

## `STAB-001`

### Sintoma

O CTA `Novo Edital` no topo do Planner podia ser lido como botao quebrado quando
o usuario estava no limite do seu tier.

### Evidencia

- relato manual do usuario durante o fluxo de estabilizacao
- `/apps/web/src/app/(app)/planner/page.tsx`
- `/apps/web/src/lib/stability/core-flow.ts`
- `/apps/web/tests/stability/core-flow-regression.test.ts`

### Reproducao

1. Entrar no Planner com `pro` ou sandbox equivalente.
2. Manter `1` edital ativo.
3. Tentar abrir `Novo Edital`.
4. Confirmar que a UI precisa virar CTA de upgrade coerente, nao acao morta.

### Causa Suspeita

Ausencia de uma representacao explicita de estado:
`create` vs `upgrade` vs `disabled`.

### Estado Atual

Corrigido em codigo com `getPlannerCreateEditalState(...)`; aguardando smoke
manual da cadeia completa.

## `STAB-002`

### Sintoma

`PlanManager` disparava warning de chave duplicada ao renderizar a paleta de
cores.

### Evidencia

- screenshot do usuario com stack em `src/components/PlanManager.tsx (557:21)`
- `/apps/web/src/components/PlanManager.tsx`
- `/apps/web/src/types/index.ts`
- `/apps/web/tests/stability/ui-safety.test.ts`

### Reproducao

1. Abrir `Novo Edital` ou editar edital existente.
2. Observar o seletor de cor.
3. Ver o warning `Encountered two children with the same key`.

### Causa Suspeita

Repeticao de `var(--primary)` em `PLAN_COLORS` e `key` baseada apenas em `hex`.

### Estado Atual

Corrigido com paleta unica e chave `name-hex`; aguardando revalidacao manual no
modal.

## `STAB-003`

### Sintoma

Usuario podia testar a aplicacao acreditando estar em conta real, enquanto a UI
continuava refletindo sandbox local persistido no navegador.

### Evidencia

- `/apps/web/src/app/login/page.tsx`
- `/apps/web/src/app/(app)/planner/page.tsx`
- `/apps/web/src/lib/entitlement-sandbox.ts`
- `/apps/web/tests/stability/ui-safety.test.ts`

### Reproducao

1. Persistir `entitlementScenario=premium-user`.
2. Voltar ao `/login`.
3. Prosseguir para o Planner.
4. Notar que o contexto de sandbox precisava ficar explicito logo no inicio da
   jornada.

### Causa Suspeita

O sandbox ja existia no estado do browser, mas nao era comunicado de forma
proporcional ao risco de confusao.

### Estado Atual

Corrigido com aviso dedicado no login e badge/callout no Planner; ainda depende
de smoke manual comparando usuario real vs sandbox.
