# Flow Checkpoints: Core Journey

## `login`

- `checkpoint_id`: `FLOW-LOGIN-01`
- `core_action`: autenticar e entrar na area autenticada sem dead-end
- `expected_state`: login conclui a entrada e informa claramente quando um
  sandbox local de entitlement esta ativo
- `blocking_conditions`:
  - usuario nao entende que o navegador esta em sandbox local
  - auth valida, mas a tela seguinte herda gating opaco

## `planner`

- `checkpoint_id`: `FLOW-PLANNER-01`
- `core_action`: criar o primeiro edital ou entender honestamente o limite do
  plano atual
- `expected_state`: CTA principal abre criacao quando possivel ou explica o
  upgrade necessario; edicao do edital nao dispara warning de renderizacao
- `blocking_conditions`:
  - botao primario aparenta estar quebrado
  - warning visivel no `PlanManager`
  - sandbox local altera tier sem aviso

## `dashboard`

- `checkpoint_id`: `FLOW-DASHBOARD-01`
- `core_action`: abrir a leitura da semana do edital ativo
- `expected_state`: com plano ativo, a semana carrega; sem contexto, a tela
  interrompe o fluxo com empty state que devolve ao Planner
- `blocking_conditions`:
  - tela tenta renderizar sem edital ativo
  - estado vazio nao explica o proximo passo

## `engine`

- `checkpoint_id`: `FLOW-ENGINE-01`
- `core_action`: abrir a execucao do dia com contexto real do edital ativo
- `expected_state`: com plano ativo, a etapa `Hoje` continua; sem contexto, a
  tela devolve ao Planner com CTA claro
- `blocking_conditions`:
  - usuario entra no Engine sem edital ativo e nao entende o que falta
  - contrato da API aceita payload invalido e desloca a quebra para runtime
