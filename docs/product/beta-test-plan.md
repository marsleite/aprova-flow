# Plano de Beta — AprovaMind

## Objetivo

Validar a proposta de valor do AprovaMind antes de integrar um gateway real de pagamento.

Durante o beta, queremos responder cinco perguntas:

1. O plano `free` entrega valor real logo no primeiro uso?
2. O plano `pro` parece claramente o plano principal para estudo sério?
3. O plano `premium` parece a experiência completa, e não apenas "mais limite"?
4. Os gates de feature parecem justos e compreensíveis?
5. Quais features realmente puxam desejo de upgrade?

## Duração sugerida

- Duração total: `8 semanas`
- Formato:
  - Fase 1: `2 semanas`
  - Fase 2: `4 semanas`
  - Fase 3: `2 semanas`

## Fase 1 — Beta Fechado Inicial

- Duração: `2 semanas`
- Grupo: `8 a 15 usuários`
- Perfil:
  - usuários próximos ao time
  - testers com boa disponibilidade de feedback
  - mistura de iniciantes e usuários mais organizados

### Objetivo

- estabilizar fluxo
- encontrar bugs de entitlement
- validar clareza da escada `free -> pro -> premium`
- entender se as mensagens de upgrade fazem sentido

### O que observar

- onboarding até o primeiro plano
- uso do motor em `/engine`
- uso de simulados
- uso do caderno de erros
- reação aos primeiros bloqueios de feature

### Critério de saída da fase

- sem bugs críticos de bloqueio/liberação
- sem divergência entre UI e backend em features premium
- feedback qualitativo suficiente para revisar copy dos planos

## Fase 2 — Beta de Uso Real

- Duração: `4 semanas`
- Grupo: `20 a 40 usuários`
- Perfil:
  - usuários de rotina real de estudo
  - variedade de concursos e maturidade

### Objetivo

- observar uso recorrente
- medir retenção semanal
- validar quais features realmente criam valor
- entender desejo real de upgrade entre planos

### O que observar

- retorno no dia seguinte
- retorno semanal
- uso do motor
- uso de simulados
- uso de IA
- tentativas de usar features bloqueadas
- cliques em CTA de upgrade

### Critério de saída da fase

- clareza de quais features sustentam `pro`
- clareza de quais features sustentam `premium`
- quotas iniciais calibradas o suficiente para seguir

## Fase 3 — Hardening Pré-Billing

- Duração: `2 semanas`
- Grupo: mesmos usuários + poucos novos, se necessário

### Objetivo

- ajustar quotas
- revisar gates
- fechar regras de downgrade e fallback
- preparar ambiente para gateway real

### O que observar

- usuários que bateram no limite de IA
- usuários que tentaram usar recursos premium com frequência
- fricção em billing/settings/upgrades
- consistência dos estados `active`, `past_due` e `expired`

### Critério de saída da fase

- matriz de entitlements estável
- copy de upgrade razoavelmente fechada
- operação manual de testers funcionando sem ruído
- confiança suficiente para integrar cobrança

## Baterias de Teste

### Bateria 1 — Ativação

Objetivo:
- validar se o usuário entende o valor rapidamente

Checklist:
- criou plano
- entendeu prioridade do dia
- entendeu a diferença entre visão básica e completa
- percebeu que existe progressão entre planos

### Bateria 2 — Confiança no Motor

Objetivo:
- validar se as recomendações parecem úteis

Checklist:
- saúde da matéria faz sentido
- prioridade do dia parece coerente
- recomendações não soam arbitrárias
- diagnóstico semanal ajuda em vez de confundir

### Bateria 3 — Execução

Objetivo:
- validar rotina de uso real

Checklist:
- usa engine
- usa simulados
- usa caderno de erros
- volta a usar no dia seguinte
- consegue transformar insight em ação

### Bateria 4 — Desejo de Upgrade

Objetivo:
- medir se a escada `free -> pro -> premium` está saudável

Checklist:
- qual feature bloqueada mais incomodou
- em qual tela o upgrade pareceu justo
- `pro` parece suficiente para estudo single-plan
- `premium` parece valioso para rotina complexa

### Bateria 5 — IA

Objetivo:
- validar se os recursos de IA realmente justificam quota e preço

Checklist:
- explicação por IA ajuda mesmo?
- mentoria semanal ajuda mesmo?
- gap analyzer parece premium?
- pós-simulado inteligente parece premium?

## Métricas Mínimas

### Produto

- `weekly_active_users`
- `daily_active_users`
- `engine_viewed`
- `simulation_completed`
- `error_notebook_used`
- `mentoring_viewed`

### Entitlements

- `feature_blocked`
- `upgrade_cta_viewed`
- `upgrade_cta_clicked`
- `ai_quota_exhausted`
- `plan_status_changed`

### IA

- `explain_answer_used`
- `weekly_mentoring_used`
- `error_gap_analyzer_used`
- `parse_edital_used`

## Formulário de Feedback Semanal

### Bloco 1 — Valor

1. Qual recurso mais te ajudou esta semana?
2. Qual recurso pareceu menos útil?
3. Em qual parte do produto você sentiu mais clareza sobre o que estudar?

### Bloco 2 — Escada de Planos

4. O plano atual parece suficiente para o seu momento?
5. O que faria você assinar o `Pro`?
6. O que faria você assinar o `Premium`?

### Bloco 3 — Fricção

7. Em qual tela você encontrou mais atrito?
8. Algum bloqueio de plano pareceu injusto?
9. Alguma recomendação do motor pareceu errada ou estranha?

### Bloco 4 — Aberta

10. Se você pudesse melhorar uma coisa no AprovaMind agora, o que seria?

## Rotina Operacional Recomendada

### Toda semana

- revisar métricas de uso
- revisar métricas de bloqueio
- revisar cliques em upgrade
- consolidar feedback qualitativo

### A cada 2 semanas

- revisar quotas de IA
- revisar o que está no `free`
- revisar se o `pro` está forte o suficiente
- revisar se o `premium` continua parecendo completo

## Operação Manual no Beta

Enquanto não houver gateway real:

- o plano e status do usuário devem ser operados manualmente
- usar `apps/api` como fonte de verdade
- evitar alterar tier apenas via frontend legado
- usar o playbook em [beta-operations-checklist.md](./beta-operations-checklist.md)
- usar o roadmap de métricas em [beta-metrics-roadmap.md](./beta-metrics-roadmap.md)

Fluxos úteis:

- promover usuário `free -> pro`
- promover usuário `pro -> premium`
- simular `past_due`
- simular `expired`
- resetar usage

## Sinal Verde para Integrar Gateway

Só avançar para gateway real quando:

- a matriz de entitlements estiver estável
- os gates estiverem coerentes entre UI e backend
- a equipe souber exatamente o que entra em `free`, `pro` e `premium`
- as quotas estiverem razoavelmente calibradas
- o beta tiver mostrado quais recursos puxam upgrade de verdade
