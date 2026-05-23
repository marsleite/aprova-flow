# Feature Specification: Lançamento Comercial e Assinaturas (Mercado Pago)

**Feature Branch**: `006-billing-subscription`  
**Created**: 2026-05-20  
**Status**: Draft  
**Input**: User description: "Revisar planos Free e Pro para o lançamento comercial e integrar pagamento de assinaturas via Mercado Pago"

## Constitution Alignment *(mandatory)*

- **Architecture Impact**: `apps/web`, `apps/api`, `packages/domain`, `packages/application`, `packages/contracts`, `packages/infrastructure-billing` (novo pacote modular de faturamento)
- **Server-Side / AI / Entitlements Impact**: Sim. Impacta segredos do servidor (credenciais do Mercado Pago no `.env`), rotas da API Fastify (`/billing/checkout` e `/billing/webhook/mercadopago`), e controle central de entitlements que agora responderá em tempo real às alterações do Firestore originadas pelos webhooks.
- **Risk-Based Test Strategy**: Testes de unidade obrigatórios no `MercadoPagoBillingAdapter`, testes de integração cobrindo a rota de webhook com payloads simulados (sucesso, cancelamento e reembolso), e testes do mapeamento de entitlements. Validação manual do fluxo de checkout no Sandbox do Mercado Pago.
- **Documentation Impact**: Atualização de `docs/architecture/current-architecture.md` para descrever a arquitetura de faturamento e `README.md` com as novas variáveis de ambiente obrigatórias do Mercado Pago.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upgrade de Plano Free para Pro via Cartão de Crédito (Priority: P1)

Como estudante no plano Free, desejo assinar o plano Pro através de cartão de crédito (mensal ou anual) de forma segura, para ter acesso imediato a todas as funcionalidades avançadas de inteligência de execução e cotas expandidas de IA.

**Why this priority**: Funcionalidade principal de monetização e conversão de negócios. Essencial para o lançamento.

**Independent Test**: Um usuário logado no plano Free abre o modal de planos, seleciona "Assinar Pro (Mensal ou Anual)", é redirecionado para a tela de checkout seguro do Mercado Pago, realiza um pagamento fictício com cartão de teste e é redirecionado com sucesso de volta ao AprovaMind, tendo seu acesso Pro liberado instantaneamente.

**Acceptance Scenarios**:

1. **Given** que o usuário está autenticado e no plano Free, **When** ele clica no botão "Assinar Pro" selecionando o intervalo Mensal ou Anual, **Then** ele deve ser redirecionado para a URL segura de checkout do Mercado Pago pré-preenchida com seu email e vinculada ao seu `userId`.
2. **Given** que o usuário está na tela de sucesso pós-checkout `/checkout/success`, **When** a sincronização de privilégios roda, **Then** ele deve visualizar uma animação de sucesso premium e ter o dashboard completo liberado automaticamente.

---

### User Story 2 - Processamento de Webhooks e Sincronização em Tempo Real (Priority: P1)

Como sistema, desejo escutar notificações (webhooks) do Mercado Pago sobre eventos de assinatura e pagamento para sincronizar os privilégios do usuário no Firestore automaticamente, garantindo que renovações, cancelamentos ou estornos se reflitam imediatamente no acesso.

**Why this priority**: Evita fraude, garante consistência de estados e lida com o ciclo de vida da assinatura sem intervenção manual.

**Independent Test**: O envio de uma notificação HTTP simulada de `subscription.created` ou `payment.approved` para a rota `/billing/webhook/mercadopago` do backend Fastify deve atualizar os campos `planTier` para `pro` e `subscriptionStatus` para `active` do respectivo documento `user_stats/{userId}`.

**Acceptance Scenarios**:

1. **Given** um webhook válido de transação aprovada recebido na API, **When** a assinatura é confirmada, **Then** a API atualiza o Firestore marcando `planTier: "pro"`, `subscriptionStatus: "active"`, e define a data final de faturamento.
2. **Given** um webhook de estorno (`payment.refunded`) ou cancelamento (`subscription.canceled`), **When** processado pela API, **Then** o acesso do usuário deve retornar ao plano `free` de forma imediata (CDC 7 dias) ou agendada para o fim do ciclo.

---

### User Story 3 - Gestão de Assinatura, Cancelamento e CDC (Priority: P2)

Como usuário Pro, desejo visualizar os detalhes da minha assinatura ativa (próxima cobrança, valor, intervalo) e ter a opção de cancelamento simples diretamente pelas configurações da plataforma, respeitando o direito de arrependimento (CDC 7 dias) com reembolso automático.

**Why this priority**: Confiança do usuário, transparência e conformidade com o Código de Defesa do Consumidor (CDC) brasileiro.

**Independent Test**: Um usuário Pro acessa a aba de configurações, visualiza os detalhes do seu plano, clica em "Cancelar Assinatura" e o sistema cancela a recorrência no Mercado Pago, alterando o status local para `canceled` (mantendo acesso até o fim do período) ou estornando automaticamente se estiver no prazo de 7 dias (CDC).

**Acceptance Scenarios**:

1. **Given** um usuário Pro na tela `/settings`, **When** ele entra na seção de faturamento, **Then** o sistema exibe o plano Pro ativo, o método de pagamento e a data de vencimento da próxima mensalidade/anuidade.
2. **Given** que um usuário solicita o cancelamento após o período de 7 dias, **When** ele confirma o cancelamento, **Then** a assinatura é programada para expirar ao final do ciclo corrente e ele mantém acesso Pro até lá.
3. **Given** que um usuário solicita cancelamento dentro do prazo de 7 dias (CDC), **When** a solicitação é processada, **Then** o sistema estorna o pagamento no Mercado Pago e remove o acesso Pro imediatamente, retornando o usuário ao Free.

---

### Edge Cases

- **Falha de Conexão no Checkout**: Se a API do Mercado Pago estiver fora do ar no momento em que o usuário tenta assinar, o sistema deve exibir uma mensagem amigável ("Serviço temporariamente indisponível. Tente novamente em alguns instantes") no modal de planos ao invés de quebrar a tela.
- **Assinatura Expirada com Uso Concorrente**: Se o webhook de expiração de assinatura chegar enquanto o usuário está estudando, a próxima chamada de IA (ex: `/api/chat`) deve falhar graciosamente com o erro estruturado `QUOTA_EXCEEDED` apontando a necessidade de upgrade.
- **Tentativa de Forjar Webhooks**: Requests enviados ao endpoint de webhook sem a assinatura criptográfica válida do Mercado Pago devem ser sumariamente descartados com erro HTTP 401/403, sem realizar nenhuma escrita no banco de dados.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST suportar dois intervalos de assinatura para o plano Pro: Mensal (R$ 34,90/mês) e Anual (equivalente a R$ 29,90/mês, cobrado anualmente).
- **FR-002**: O sistema MUST disponibilizar os botões de ação de upgrade no `AccountPlanModal` que iniciam o fluxo de assinatura dinâmico.
- **FR-003**: A API Fastify MUST expor o endpoint `POST /billing/checkout` que gera a sessão de checkout seguro do Mercado Pago.
- **FR-004**: A API Fastify MUST expor o endpoint de webhook público `POST /billing/webhook/mercadopago` para processar eventos de faturamento.
- **FR-005**: O sistema MUST utilizar uma interface modular `BillingAdapter` para permitir fácil substituição do Mercado Pago por Stripe/Asaas no futuro.
- **FR-006**: O sistema MUST tratar o cancelamento dentro do prazo de 7 dias (CDC) realizando o estorno automático e downgrade imediato.
- **FR-007**: As regras de segurança do Firestore (`firestore.rules`) MUST proibir expressamente que o cliente web escreva nos campos sensíveis de faturamento do documento `user_stats`.

### Key Entities *(include if feature involves data)*

- **UserStats**: Representa o perfil, estatísticas e entitlements do usuário.
  - Campos de Faturamento: `planTier` ('free' | 'pro'), `subscriptionStatus` ('active' | 'canceled' | 'expired' | 'trialing'), `billingPeriodEnd` (Timestamp), `entitlementUsage` (JSON de uso das cotas), `entitlementUsagePeriods` (JSON de períodos das cotas).
- **BillingEventLog**: Log de auditoria para fins contábeis e de segurança.
  - Atributos: `id` (ID do documento), `userId` (ID do usuário), `provider` ('mercadopago'), `eventType` (ex: 'subscription.created', 'payment.approved'), `payload` (JSON cru), `processedAt` (Timestamp).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuários Free devem conseguir iniciar a assinatura e ser redirecionados ao checkout do Mercado Pago em menos de 2 segundos.
- **SC-002**: A sincronização pós-pagamento via webhook deve atualizar o status do usuário no Firestore em até 3 segundos após a aprovação no gateway.
- **SC-003**: 100% das tentativas de escrita manual por parte do cliente em campos sensíveis de faturamento devem ser bloqueadas no Firestore.
- **SC-004**: 100% dos webhooks recebidos sem assinatura válida devem ser rejeitados e logados como tentativas de invasão.

## Assumptions

- O lançamento inicial utilizará credenciais de Pessoa Física (PF) do Mercado Pago.
- Cupons de desconto e promoções serão gerenciados diretamente no painel do Mercado Pago, não necessitando de modelagem de cupons no banco de dados local do AprovaMind.
- O checkout do Mercado Pago lidará com a validação completa de dados de cartão de crédito e segurança 3D Secure.

## Exceptions & Justifications

- **Nenhum**: Alinhamento estrito com os princípios de segurança, encapsulamento no servidor e testes automatizados da constituição do projeto.
