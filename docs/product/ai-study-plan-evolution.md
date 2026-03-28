# Evolução do Plano de Estudo por IA

## Objetivo

Evoluir o AprovaMind de um gerador de plano diário para um **mentor que monta o plano macro e o plano executável**, usando:

- capacidade real do aluno para estudar por dia
- carga estimada do edital
- carga estimada do material de estudo do próprio aluno

## O que já existe hoje

### Base já pronta

- `PlanManager` já cria e edita planos por edital com:
  - nome
  - matérias
  - pesos
  - meta semanal
- `/api/parse-edital` já lê PDF de edital e devolve:
  - `planName`
  - `subjects`
  - `suggestedWeeklyGoalHours`
- `SmartScheduleCard` já faz um cronograma semanal com base em:
  - meta semanal
  - dias disponíveis
  - pesos do plano
  - precisão por matéria
- `DailyAiPlannerCard` já faz o plano diário executável com base em:
  - meta semanal
  - horas por matéria
  - plano vs real
  - acurácia
  - gaps diagnosticados

### Limite do estado atual

Hoje a IA ajuda bem na **execução** do estudo, mas ainda não monta de verdade o **plano macro completo**.

Falta principalmente:

- modelar a capacidade semanal de forma mais realista
- modelar prazo até prova
- modelar carga de conteúdo/material
- transformar tudo isso em uma rota de cobertura do edital

## Avaliação da proposta

## 1. Quantidade de horas disponíveis para estudo diário

**Faz muito sentido.**

Essa é a variável mais importante do planejamento real. A meta semanal atual é útil, mas ainda é simplificada. O ideal é trabalhar com:

- horas por dia da semana
- blocos livres por dia
- teto máximo sustentável
- folga para revisão, imprevisto e recuperação

### Recomendação

Adicionar uma camada de `study_capacity` por usuário/plano:

- `mondayMinutes`
- `tuesdayMinutes`
- ...
- `sundayMinutes`
- `weeklyCapacityMinutes`
- `preferredSessionSizeMinutes`

Isso alimenta tanto:

- plano macro
- smart schedule semanal
- planner diário

## 2. Quantidade de horas para cumprir o edital

**Também faz muito sentido**, mas depende de uma variável que hoje ainda não está explícita:

- **data-alvo** da prova ou horizonte de cobertura

Sem prazo, o sistema consegue dizer “quanto existe para estudar”, mas não consegue dizer com segurança:

- se o usuário está adiantado
- se está atrasado
- qual intensidade semanal mínima precisa cumprir

### Recomendação

Adicionar ao plano:

- `targetDate`
- `coverageGoal`
  - ex: `primeira_cobertura`
  - ex: `cobertura_com_revisao`
- `reviewBufferPercent`
  - ex: 20% da carga reservada para revisão/questões

### Resultado esperado

Com isso a IA consegue calcular:

- carga total estimada
- semanas restantes
- horas mínimas por semana para cobertura
- risco de inviabilidade

## 3. Quantidade de horas do material do usuário via PDF

**Faz sentido, mas com cuidado.**

Essa ideia é poderosa, só que é a parte mais delicada da proposta.

### O que faz sentido

O usuário enviar material próprio e o sistema estimar:

- densidade do conteúdo
- número de páginas úteis
- distribuição por matéria
- tempo estimado de leitura/estudo
- esforço relativo por bloco

### O que não faz sentido tratar como exato

Não devemos vender isso como “cálculo objetivo perfeito de horas”.

Um PDF pode ter:

- letra grande
- muita jurisprudência
- tabela
- peça prática
- questão comentada
- scan ruim
- índice e páginas vazias

Então o sistema deve tratar isso como:

- **estimativa assistida**
- nunca como verdade fechada

### Recomendação

Modelar essa frente como `material workload estimation`.

A IA pode devolver:

- matéria principal
- subtemas
- páginas úteis
- densidade do material
- tempo estimado em faixas
  - `baixo`
  - `médio`
  - `alto`
- minutos estimados

Mas a UI deve permitir:

- confirmar
- editar manualmente
- ajustar para a realidade do aluno

## O que mais precisa entrar para isso funcionar bem

Para essa evolução realmente fazer sentido, eu incluiria mais 3 variáveis:

### 1. Data da prova

Sem isso o planejamento fica cego para urgência.

### 2. Nível atual por matéria

Hoje já temos sinais indiretos:

- horas estudadas
- acurácia
- gaps

Isso pode virar um `baseline` por matéria:

- `novo`
- `intermediário`
- `avançado`

Isso muda completamente o tempo necessário para cobertura.

### 3. Estratégia de estudo do usuário

Exemplos:

- teoria primeiro
- teoria + questões
- questões desde o início
- revisão em ciclos

Isso influencia a distribuição do plano.

## Proposta de produto

Em vez de chamar isso só de “plano de estudo por IA”, a melhor leitura é:

### Camada 1. Planejamento Estrutural

A IA monta o plano macro:

- quanto cabe estudar
- quanto precisa ser coberto
- em quanto tempo
- onde está o gargalo

### Camada 2. Planejamento Tático

A IA distribui a semana:

- matérias por dia
- blocos prioritários
- balanceamento entre teoria, questões e revisão

### Camada 3. Planejamento Executável

A IA monta o dia:

- blocos
- duração
- objetivo concreto
- contingência

Hoje o app já está forte na camada 2 e 3. A oportunidade está em fechar a camada 1.

## Arquitetura recomendada

## Novos blocos de domínio

### `study_capacity`

Capacidade semanal real do aluno.

## Fase 1 implementada nesta branch

Entrou uma primeira versão prática dessa evolução, sem ainda depender do PDF do material:

- `StudyPlanEdital` agora pode guardar:
  - `examDate`
  - `materialWorkloadHours`
  - `studyCapacityHours`
- `PlanManager` passou a permitir:
  - informar a data da prova
  - informar a carga estimada do material
  - declarar horas disponíveis por dia da semana
- `/api/parse-edital` agora também tenta extrair `examDate` do edital
- o planner ganhou uma leitura de viabilidade do plano, mostrando:
  - capacidade semanal real
  - ritmo necessário
  - prazo até a prova
  - cobertura projetada
- o `DailyAiPlannerCard` deixou de assumir `180` minutos fixos e passa a usar a capacidade do dia do plano ativo

## O que esta Fase 1 resolve

- tira o plano do campo puramente tático
- adiciona uma camada macro de viabilidade
- aproxima a IA da rotina real do aluno
- prepara o terreno para estimar carga de material depois

## Fase 2 em andamento: coerencia semanal

Próximo corte natural:

- fazer o `SmartSchedule` respeitar a disponibilidade real por dia
- parar de distribuir a semana como se todos os dias fossem igualmente livres
- levar para o prompt semanal:
  - nome do plano ativo
  - data da prova
  - carga do material
  - ritmo semanal necessário
  - status de cobertura

Objetivo:

- alinhar a camada macro com a camada tática semanal
- reduzir a chance de a IA sugerir 4h em um dia onde o aluno declarou 1h

## O que ainda fica para depois

- estimativa automática de carga a partir do PDF do material do aluno
- baseline por matéria (`novo`, `intermediário`, `avançado`)
- plano macro completo gerado pela IA, e não apenas projetado
- uso da capacidade também no cronograma semanal/smart schedule

### `plan_target`

Prazo, objetivo de cobertura e buffer.

### `study_materials`

Materiais enviados pelo usuário com estimativa de carga.

### `coverage_projection`

Saída calculada pelo sistema:

- carga total do plano
- carga concluída
- carga pendente
- previsão de cobertura
- risco

## Fluxo recomendado

1. usuário cria/edita o plano
2. envia edital PDF
3. sistema extrai matérias e pesos
4. usuário informa disponibilidade semanal
5. usuário informa data-alvo
6. usuário envia materiais
7. sistema estima carga dos materiais
8. IA monta projeção macro
9. smart schedule e planner diário passam a obedecer essa projeção

## Estratégia incremental

## Fase 1. Capacity + Target

Implementar primeiro:

- disponibilidade por dia
- data-alvo
- cálculo de horas semanais necessárias
- indicador de viabilidade do plano

### Motivo

É o maior ganho com menor risco.

## Fase 2. AI Study Plan Setup

Criar um novo fluxo/assistente que monta o plano inicial com base em:

- edital
- capacidade
- prazo
- baseline por matéria

### Saída

- meta semanal sugerida
- distribuição por matéria
- ordem de ataque
- risco de atraso

## Fase 3. Material Workload Estimation

Adicionar upload de material do aluno para estimativa de carga.

### Importante

Sempre com revisão humana na UI.

## Fase 4. Coverage Engine

Calcular:

- % do edital coberto
- horas restantes
- previsão de término
- necessidade de compressão do plano

## Recomendação objetiva

**Sim, a proposta faz bastante sentido.**

Mas eu recomendo fortemente esta ordem:

1. capacidade diária/semanal
2. prazo da prova
3. plano macro por IA
4. material PDF do aluno

### Motivo

O upload de material é valioso, mas é a parte mais cara, mais sujeita a erro e mais difícil de explicar. Se começarmos por ele, o risco de complexidade sobe cedo demais.

## Próximo passo desta branch

Se seguirmos com essa frente, o corte certo é:

1. modelar `study_capacity` e `plan_target`
2. criar a projeção de cobertura
3. só depois abrir a UX de “IA monta meu plano”

Esse é o melhor caminho para uma primeira versão realmente útil e sustentável.
