# Auditoria Pré-Lançamento

Data: 2026-03-20

Contexto:
- beta já em produção com testers reais
- objetivo agora é reduzir fricção, aumentar clareza e fortalecer confiança antes de ampliar o beta e aproximar o lançamento
- esta auditoria foi feita a partir de leitura horizontal dos fluxos centrais do app e do estado atual da interface

## Leitura Geral

O produto já tem um valor real e perceptível. O núcleo de proposta está forte:
- plano macro com viabilidade e cobertura
- planner diário com IA
- motor de sessão
- simulados
- caderno de erros
- mentoria/copilot

O principal risco agora não é falta de feature. O principal risco é coerência de experiência:
- descoberta desigual de recursos fortes
- alguns fluxos ainda parecem “duas gerações de produto” convivendo
- pequenos pontos de confiança quebram mais percepção de qualidade do que a falta de uma nova feature

## Pontos Fortes

- O planner saiu do nível puramente tático e já conversa com capacidade real e prazo.
- O app já transmite a ideia de “mentor”, não só de registro.
- O pipeline de entitlements e beta operations está suficientemente maduro para teste real.
- O motor de estudo, o caderno de erros e a mentoria já formam uma espinha dorsal boa para retenção.

## P0

### 1. Fluxo de cadastro no beta promete mais do que entrega

A tela de login permite criar conta normalmente, mas a allowlist do beta bloqueia quem não está liberado depois do auth. Isso cria uma experiência confusa: o usuário consegue iniciar cadastro, mas não entende claramente a política de acesso.

Evidências:
- `/Users/marleite/workspace/aprova-flow/apps/web/src/components/LoginScreen.tsx`
- `/Users/marleite/workspace/aprova-flow/apps/web/src/hooks/useAuth.ts`

Impacto:
- aumenta suporte manual
- gera sensação de erro, não de controle beta
- reduz confiança logo na entrada

Recomendação:
- no beta, deixar explícito na tela que o acesso é controlado
- se a allowlist continuar, tratar cadastro de forma coerente com esse modelo

## P1

### 1. A navegação de provas ainda está dividida entre overview e rota legada

Hoje a navegação principal já expõe `simulations` e `caderno-erros`, mas a experiência de provas ainda se divide entre a visão do app shell e o centro legado em `/provas`.

Evidências:
- `/Users/marleite/workspace/aprova-flow/apps/web/src/components/layout/Sidebar.tsx`
- `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/simulations/page.tsx`
- `/Users/marleite/workspace/aprova-flow/apps/web/src/app/provas/page.tsx`

Impacto:
- parte do produto ainda parece separada do resto da navegação
- há uma pequena quebra de continuidade entre descoberta e execução

Recomendação:
- harmonizar naming e entradas
- deixar o caminho entre overview, banco oficial e simulado customizado mais claro

### 2. A narrativa macro -> semana -> hoje ainda não está totalmente amarrada

O produto melhorou bastante com viabilidade de plano e capacidade real, mas a jornada ainda está distribuída em telas diferentes sem uma narrativa explícita.

Evidências:
- `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/planner/page.tsx`
- `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/dashboard/page.tsx`
- `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/engine/page.tsx`
- `/Users/marleite/workspace/aprova-flow/apps/web/src/components/SmartScheduleCard.tsx`
- `/Users/marleite/workspace/aprova-flow/apps/web/src/components/DailyAiPlannerCard.tsx`

Impacto:
- o usuário entende o valor, mas pode não entender o “encadeamento”
- há risco de o app parecer poderoso, porém um pouco espalhado

Recomendação:
- explicitar a sequência:
  - prazo e cobertura
  - distribuição semanal
  - execução diária
- reforçar links/contexto entre planner, dashboard e engine

### 3. Simulados misturam promessa premium com métricas ainda vazias

A tela de simulados vende alta sofisticação, mas alguns KPIs continuam com placeholder estático.

Evidência:
- `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/simulations/page.tsx`

Impacto:
- enfraquece credibilidade da tela
- pode dar sensação de “feature incompleta”

Recomendação:
- ou preencher os indicadores
- ou esconder/blindar o que ainda não tem dado confiável

### 4. Histórico manual ainda está menos alinhado ao plano ativo do que outros fluxos

O timer e o registro manual de questões já ficaram melhores com matérias customizadas e contexto do plano. O histórico manual ainda está menos aderente ao plano ativo.

Evidências:
- `/Users/marleite/workspace/aprova-flow/apps/web/src/components/SessionHistory.tsx`
- `/Users/marleite/workspace/aprova-flow/apps/web/src/components/StudyTimer.tsx`
- `/Users/marleite/workspace/aprova-flow/apps/web/src/components/QuestionTrackerCard.tsx`

Impacto:
- inconsistência entre fluxos de entrada de estudo
- menor sensação de continuidade

Recomendação:
- alinhar o formulário manual de sessões ao mesmo contexto de matérias do plano ativo

### 5. Gap Analyzer trabalha com subconjunto sem transparência explícita

O caderno de erros analisa apenas parte dos erros filtrados, mas isso não fica evidente para o usuário.

Evidência:
- `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/caderno-erros/page.tsx`

Impacto:
- risco de interpretação exagerada do diagnóstico
- confiança analítica menor quando o usuário descobre discrepância

Recomendação:
- informar com clareza quantos erros entraram no diagnóstico
- permitir ajuste futuro de amostra

## P2

### 1. Performance do caderno de erros tende a degradar com volume

Hoje a montagem do caderno faz busca por tentativa e questão em série, com cache local, mas ainda de forma pouco eficiente para volume maior.

Evidência:
- `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/caderno-erros/page.tsx`

Impacto:
- beta pequeno tolera
- escala maior pode sentir lentidão

Recomendação:
- otimizar depois da rodada principal de usabilidade

### 2. Operação beta ainda depende de listas e controles no código

Para o estágio atual isso funcionou bem, mas antes da abertura maior convém reduzir dependência de allowlist hardcoded.

Evidência:
- `/Users/marleite/workspace/aprova-flow/apps/web/src/hooks/useAuth.ts`

Impacto:
- manutenção manual
- risco operacional

Recomendação:
- migrar gradualmente para controle mais operacional/configurável

### 3. Linguagem e naming ainda têm pequenas inconsistências

Há termos fortes em várias telas, mas ainda não totalmente harmonizados:
- Planner Diário
- Agenda Estratégica
- Mentoria
- Copilot
- Provas
- Simulados

Impacto:
- baixa gravidade isoladamente
- somado, reduz clareza da proposta

Recomendação:
- fazer uma passada editorial antes do lançamento aberto

## Ordem Recomendada

### Sprint 1

- tornar o onboarding beta coerente com a allowlist
- harmonizar a navegação e a entrada da área de provas
- limpar os sinais de produto “em duas camadas” entre overview e legado

### Sprint 2

- limpar credibilidade da área de simulados
- amarrar melhor a jornada macro -> semana -> hoje
- alinhar histórico manual ao contexto do plano

### Sprint 3

- transparência do Gap Analyzer
- otimizações de performance
- revisão editorial de labels e linguagem

## Como Usar o Beta Agora

Com os 2 testers atuais, vale observar especialmente:
- se eles descobrem sozinhos `simulados`, `caderno-erros` e `mentoria`
- se entendem a diferença entre planner, dashboard e engine
- se sentem que o app “puxa” a próxima ação sem depender de explicação sua
- se algum ponto de UI parece quebrado ou incompleto

## Conclusão

O produto já está em um estágio bom de valor para beta. O trabalho mais importante agora não é abrir mais uma frente grande de feature. É consolidar:
- coerência
- descoberta
- confiança
- acabamento dos fluxos centrais

Se fizermos isso bem, a percepção de maturidade sobe muito mais do que abrir mais uma capacidade isolada.
