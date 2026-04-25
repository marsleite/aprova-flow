# Checklist Operacional do Beta

## Objetivo

Garantir que o beta de `8 semanas` rode com consistência antes do gateway real,
usando a assinatura interna manual do AprovaMind.

Este checklist cobre:

- preparação do ambiente
- operação de testers
- cenários mínimos por plano
- rotina semanal de acompanhamento

## Pré-requisitos

Antes de iniciar a bateria com testers reais:

- `apps/web` e `apps/api` devem estar publicados e estáveis
- o `web` deve apontar para a `api` via `NEXT_PUBLIC_API_BASE_URL`
- a rota `GET /entitlements/me` deve responder com auth real
- o admin deve conseguir abrir `/settings`
- o card `Operacao de Testers` deve aparecer para admin
- o `Sandbox de Entitlements` deve estar em `Usuario real` antes de validar
  comportamento de tester real

## Operação Manual de Testers

Tela principal:

- `/settings`
- card: `Operacao de Testers`

Campos de operação:

- `UID do tester`
- `plan`
- `status`
- `usage`
- `resetUsage`

Estados que precisamos conseguir simular:

- `free + active`
- `pro + active`
- `premium + active`
- `pro + past_due`
- `premium + expired`

## Checklist de Preparação por Tester

Para cada tester novo:

1. Confirmar o `userId` correto.
2. Definir o plano inicial.
3. Definir o status inicial como `active`.
4. Resetar usage antes de começar a bateria.
5. Registrar em planilha:
   - nome
   - `userId`
   - concurso/objetivo
   - plano atual
   - data de início do teste

## Cenários Mínimos por Plano

### Free

Validar:

- acesso útil ao produto sem sensação de “demo vazia”
- leitura básica do motor
- questões e simulados básicos
- explicação por IA com degustação controlada
- bloqueio justo para features `Pro` e `Premium`

Telas mínimas:

- `/engine`
- `/caderno-erros`
- `/provas`
- `/planner`
- `/mentoring`

### Pro

Validar:

- motor completo single-plan
- simulados completos
- mentoria semanal
- explicação por IA com quota real de uso
- parse de edital disponível
- ausência correta de recursos `Premium`

Telas mínimas:

- `/engine`
- `/mentoring`
- `/provas`
- fluxo de parse de edital

### Premium

Validar:

- multi-edital
- plano adaptativo
- recovery plan
- pós-simulado inteligente
- gap analyzer
- experiência claramente superior ao `Pro`

Telas mínimas:

- `/planner`
- `/provas`
- `/caderno-erros`
- fluxos de IA premium
- criação de novo edital no topo do Planner

## Cenários de Status

### Past Due

Validar:

- bloqueio de features caras
- manutenção do essencial
- copy coerente com restrição temporária

### Expired

Validar:

- fallback para comportamento equivalente a `free`
- remoção de capacidades `pro/premium`
- ausência de vazamento entre UI e backend

## Checklist de Regressão Semanal

Toda semana, validar pelo menos:

1. `free-user` ainda vê valor no primeiro uso
2. `pro-user` continua sentindo produto principal
3. `premium-user` continua sentindo experiência completa
4. `past_due` restringe sem quebrar a conta
5. `expired` faz fallback corretamente
6. reset manual de usage funciona
7. `GET /entitlements/me` reflete o estado atual do tester
8. `login -> planner -> dashboard -> engine` continua navegável com usuário real
9. quando houver sandbox local ativo, login e Planner deixam isso explícito
10. `dashboard` e `engine` voltam ao Planner de forma honesta quando falta
    edital ativo

## Registro de Feedback

Para cada tester, registrar:

- recurso mais útil da semana
- recurso menos útil da semana
- bloqueio mais frustrante
- bloqueio mais justo
- feature que mais puxaria upgrade
- bugs percebidos

## Métricas Operacionais

Toda semana consolidar:

- `weekly_active_users`
- `feature_blocked`
- `upgrade_cta_clicked`
- `ai_quota_exhausted`
- `simulation_completed`
- `error_notebook_used`
- `parse_edital_used`

## Critérios para Encerrar o Beta sem Gateway

Só considerar a entrada do gateway real quando:

- a escada `free -> pro -> premium` estiver estável
- não houver divergência recorrente entre UI e backend
- a equipe souber operar `plan`, `status` e `usage` sem improviso
- as quotas mais caras estiverem calibradas
- o time tiver clareza de quais features realmente puxam upgrade
