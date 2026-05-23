# Tasks: Lançamento Comercial e Assinaturas (Mercado Pago)

**Input**: Design documents from `/specs/006-billing-subscription/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/schema.md, quickstart.md

**Tests**: Testes automatizados robustos cobrindo o adapter do Mercado Pago, use cases de checkout/webhook/cancelamento, políticas de entitlements no domínio, e as rotas Fastify. Validações manuais guiadas no Sandbox para UI/UX e transições de pagamento.

**Organization**: As tarefas estão agrupadas por histórias de usuário para permitir implementação e testes independentes de cada entrega.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência mútua)
- **[Story]**: História de usuário associada (ex: US1, US2, US3)
- Caminhos completos de arquivos especificados em cada tarefa.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Criação do novo módulo compartilhado `packages/infrastructure-billing` e preparação do monorepo.

- [ ] T001 Criar package.json e tsconfig.json para o novo pacote npm `packages/infrastructure-billing/package.json` e `packages/infrastructure-billing/tsconfig.json`
- [ ] T002 Criar ponto de entrada principal em `packages/infrastructure-billing/src/index.ts` exportando classes e interfaces de faturamento
- [ ] T003 [P] Registrar o pacote `@aprovamind/infrastructure-billing` no root `package.json` workspaces do monorepo e rodar a instalação de dependências

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Estrutura central do domínio, porta da aplicação, regras do Firestore e documentação que bloqueiam o fluxo.

**⚠️ CRITICAL**: Nenhuma tarefa de histórias de usuário pode começar até que esta fase esteja completa.

- [ ] T004 [P] Criar enums e types de faturamento (`PlanCode`, `SubscriptionStatus`, `AccessState`) em `packages/domain/src/billing/types.ts`
- [ ] T005 [P] Atualizar as políticas de entitlements para cotas Pro vs Free em `packages/domain/src/billing/entitlement-policy.ts` e `packages/domain/src/billing/resolve-user-entitlements.ts`
- [ ] T006 Criar porta abstrata `BillingAdapter` em `packages/application/src/ports/BillingAdapter.ts` definindo as assinaturas de checkout, webhook e cancelamento/estorno
- [ ] T007 [P] Atualizar as regras de segurança `firestore.rules` bloqueando escritas de faturamento no Firestore por parte do browser cliente
- [ ] T008 [P] Atualizar documentação arquitetural no `README.md` e `docs/architecture/current-architecture.md` detalhando segredos do MP e faturamento modular

**Checkpoint**: Fundação pronta - as histórias de usuário podem ser desenvolvidas em paralelo.

---

## Phase 3: User Story 1 - Upgrade de Plano Free para Pro (Priority: P1) 🎯 MVP

**Goal**: Permitir assinatura Pro via checkout seguro em Cartão de Crédito e redirecionamento de sucesso.

**Independent Test**: Usuário clica em upgrade, é redirecionado à página do MP Sandbox em <2 segundos, conclui e aterrissa em `/checkout/success`.

### Tests for User Story 1

- [ ] T009 [P] [US1] Adicionar testes unitários para a geração de preferência de pagamento no use case em `packages/application/tests/CreateCheckoutSession.test.ts`
- [ ] T010 [P] [US1] Adicionar testes de endpoint Fastify para a rota de checkout em `apps/api/tests/modules/billing/checkout.test.ts`

### Implementation for User Story 1

- [ ] T011 [P] [US1] Criar DTOs de checkout e resposta em `packages/contracts/src/billing/Checkout.ts`
- [ ] T012 [P] [US1] Implementar caso de uso `CreateCheckoutSession` em `packages/application/src/use-cases/billing/CreateCheckoutSession.ts`
- [ ] T013 [US1] Criar implementação concreta do adapter do Mercado Pago `/v1/preapproval` em `packages/infrastructure-billing/src/mercadopago/MercadoPagoBillingAdapter.ts`
- [ ] T014 [US1] Criar rotas do módulo de faturamento Fastify e mapear endpoint `POST /billing/checkout` em `apps/api/src/modules/billing/routes.ts` e registrar no `server.ts`
- [ ] T015 [P] [US1] Criar tela de sucesso pós-checkout premium com animações fluidas em `apps/web/src/app/(app)/checkout/success/page.tsx`
- [ ] T016 [US1] Modificar `AccountPlanModal.tsx` em `apps/web/src/components/AccountPlanModal.tsx` para acionar a API e realizar redirecionamento seguro com spinners de feedback

**Checkpoint**: Upgrade de plano Pro funcional de ponta a ponta em Sandbox com redirecionamento de sucesso.

---

## Phase 4: User Story 2 - Processamento de Webhooks e Sincronização (Priority: P1)

**Goal**: Processar notificações assíncronas do Mercado Pago com segurança de assinaturas SHA-256 e atualizar privilégios no Firestore com proteção de idempotência.

**Independent Test**: POST simulado na rota de webhook atualiza Firestore em <3 segundos e registra log no banco. Requests não-assinados são rejeitados.

### Tests for User Story 2

- [ ] T017 [P] [US2] Adicionar testes de validação de assinatura criptográfica SHA-256 em `packages/infrastructure-billing/tests/mercadopago/signature.test.ts`
- [ ] T018 [P] [US2] Adicionar testes de integração cobrindo conciliação, idempotência e atualização do Firestore no use case `HandleBillingWebhook.test.ts` em `packages/application/tests/HandleBillingWebhook.test.ts`

### Implementation for User Story 2

- [ ] T019 [P] [US2] Implementar decodificação e verificação de assinatura SHA-256 do Mercado Pago em `packages/infrastructure-billing/src/mercadopago/MercadoPagoBillingAdapter.ts`
- [ ] T020 [P] [US2] Implementar caso de uso `HandleBillingWebhook` em `packages/application/src/use-cases/billing/HandleBillingWebhook.ts`
- [ ] T021 [US2] Mapear rota de webhook público `POST /billing/webhook/mercadopago` com validação SHA-256 e gravação de logs em `apps/api/src/modules/billing/routes.ts`

**Checkpoint**: Sincronização em tempo real e conciliação de faturamento operando de forma 100% segura contra fraudes e dupla execução.

---

## Phase 5: User Story 3 - Gestão de Assinatura, Cancelamento e CDC (Priority: P2)

**Goal**: Exibir dados de plano ativo no settings e suportar cancelamento auto-serviço com estorno automático (CDC <7 dias) ou agendamento para fim de ciclo (>7 dias).

**Independent Test**: Cancelar assinatura em até 7 dias dispara estorno no MP Sandbox e downgrade imediato. Cancelar após 7 dias agenda expiração no Firestore.

### Tests for User Story 3

- [ ] T022 [P] [US3] Adicionar testes unitários para cálculo do prazo do CDC e lógica de estorno no use case em `packages/application/tests/CancelSubscription.test.ts`
- [ ] T023 [P] [US3] Adicionar testes de endpoint Fastify para a rota de cancelamento em `apps/api/tests/modules/billing/cancel.test.ts`

### Implementation for User Story 3

- [ ] T024 [P] [US3] Implementar chamada da API de reembolso do Mercado Pago `/v1/payments/{payment_id}/refunds` e cancelamento de preapproval no adapter `packages/infrastructure-billing/src/mercadopago/MercadoPagoBillingAdapter.ts`
- [ ] T025 [US3] Implementar caso de uso `CancelSubscription` em `packages/application/src/use-cases/billing/CancelSubscription.ts` contendo lógica do CDC
- [ ] T026 [US3] Mapear rota de cancelamento seguro `POST /billing/cancel` em `apps/api/src/modules/billing/routes.ts`
- [ ] T027 [US3] Atualizar a aba de faturamento em `apps/web/src/app/(app)/settings/page.tsx` para apresentar plano ativo, vencimento do ciclo, e botão de cancelamento dinâmico

**Checkpoint**: Painel de configurações finalizado com auto-serviço transparente em conformidade com o Código de Defesa do Consumidor.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Garantia de qualidade final, refatoração de concorrência de cotas e testes integrados de regressão.

- [ ] T028 Rodar testes completos e linting em todo o monorepo (`npm test && npm run lint`) e corrigir eventuais erros de concorrência ou TypeScript
- [ ] T029 [P] Confirmar segredos do sandbox e variáveis de produção em logs administrativos locais e no README.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências - inicia imediatamente.
- **Foundational (Phase 2)**: Depende da Fase 1 - BLOQUEIA todas as histórias de usuário.
- **User Stories (Phase 3+)**: Dependem da Fase 2.
  - US1 e US2 podem prosseguir de forma concorrente em paralelo.
  - US3 depende do modelo de dados e adapter mapeado em US1 e US2.
- **Polish (Phase 6)**: Depende da conclusão de todas as histórias de usuário.

### Parallel Opportunities

- Todas as tarefas marcadas com `[P]` podem ser executadas concorrentemente com outras da mesma fase, por não alterarem arquivos correlacionados ou compartilharem dependências em aberto.
- Uma vez finalizado a fundação, a implementação da UI (`AccountPlanModal` e `/success`) e a criação das rotas de webhook podem ser divididas em paralelo.

---

## Implementation Strategy

### MVP First (User Story 1 & 2 Only)

1. Finalizar Setup (Phase 1) + Fundação (Phase 2).
2. Completar US1 (Checkout e Upgrade) + US2 (Webhooks de Confirmação).
3. **VALIDAR**: Simular uma compra em Sandbox do Mercado Pago e certificar a liberação Pro instantânea no Firestore e UI.
4. Avançar para a gestão de cancelamentos e CDC (US3).
