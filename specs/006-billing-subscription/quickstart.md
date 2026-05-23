# Phase 1 Quickstart: Lançamento Comercial e Assinaturas (Mercado Pago)

Este guia descreve como iniciar, executar e validar manualmente as funcionalidades de faturamento recorrente e gestão de assinaturas via Mercado Pago.

---

## 1. Configuração do Ambiente de Desenvolvimento

### Variáveis de Ambiente Necessárias (`.env` em `apps/api`)

Configure as chaves do Sandbox do Mercado Pago no seu arquivo de variáveis de ambiente:

```env
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxxx... # Access token do Sandbox do vendedor PF
MERCADO_PAGO_WEBHOOK_SECRET=xxxx...        # Token/Secret gerado nas configurações de webhook do Mercado Pago
NEXT_PUBLIC_APP_URL=http://localhost:3000   # URL do frontend
```

### Inicialização do Ambiente

Execute as dependências do monorepo e inicie os servidores locais de frontend e backend:

```bash
npm run dev
```

---

## 2. Cenários de Verificação Manual (UAT)

### Cenário A: Upgrade do Plano Free para Pro (Fluxo de Checkout Completo)

1. Faça login no sistema com um usuário de teste recém-criado (Plano Free ativo por padrão).
2. Clique nas configurações de perfil ou no indicador de cotas para abrir o modal de planos (`AccountPlanModal`).
3. Selecione a opção **"Assinar Pro (Mensal ou Anual)"** e clique no botão de upgrade.
4. Confirme que você é redirecionado em menos de **2 segundos** para a URL segura de checkout do Sandbox do Mercado Pago.
5. Insira os dados de um cartão de crédito de teste do Mercado Pago (Sandbox) e conclua a transação fictícia.
6. Após a conclusão, verifique se você é redirecionado de volta ao AprovaMind para a página `/checkout/success`.
7. Certifique-se de que a página `/checkout/success` exibe uma animação fluida de sucesso e um botão para retornar ao Dashboard.

### Cenário B: Processamento de Webhooks e Sincronização do Firestore

1. Com o servidor local ativo, simule o envio de uma notificação de webhook válida de `payment.approved` ou `subscription.created`.
2. Verifique os logs de execução da Fastify API para confirmar o processamento do evento.
3. No painel ou no banco de dados Firestore, valide que o documento do usuário em `user_stats/{userId}` foi atualizado com:
   - `planTier: 'pro'`
   - `subscriptionStatus: 'active'`
   - `subscriptionId: '<PREAPPROVAL_ID>'`
   - `billingPeriodEnd: '<DATA_FIM_DO_CICLO>'`
4. Acesse o Dashboard no frontend e confirme que as funcionalidades do plano Pro (cotas expandidas, inteligência avançada) estão desbloqueadas instantaneamente.

### Cenário C: Proteção contra Assinaturas Falsificadas (Segurança)

1. Envie uma requisição POST manual para `/api/billing/webhook/mercadopago` simulando um payload de ativação de assinatura, mas **sem** o cabeçalho `x-signature` ou contendo um hash inválido.
2. Certifique-se de que a API Fastify rejeita a requisição imediatamente com código de erro HTTP **401 Unauthorized** ou **403 Forbidden**.
3. Verifique o banco de dados e confirme que **nenhuma** alteração de privilégios ou log de faturamento foi efetuado.

### Cenário D: Direito de Arrependimento de 7 Dias (CDC)

1. Selecione um usuário Pro de teste cuja assinatura tenha sido iniciada em até 7 dias (`subscriptionStartedAt` menor ou igual a 7 dias atrás).
2. Acesse a aba `/settings` > Faturamento no frontend e clique em **"Cancelar Assinatura"**.
3. Confirme o cancelamento.
4. Verifique que o sistema:
   - Realizou a chamada de estorno (`POST /v1/payments/{payment_id}/refunds`) no Mercado Pago Sandbox.
   - Atualizou o Firestore imediatamente, rebaixando `planTier` para `'free'` e marcando `subscriptionStatus` como `'expired'`.
5. Confirme no frontend que o acesso Pro foi imediatamente suspenso.

### Cenário E: Cancelamento Tradicional (Após 7 Dias)

1. Modifique a data `subscriptionStartedAt` de um usuário Pro de teste no Firestore para um período superior a 7 dias atrás (ex: 10 dias).
2. Acesse `/settings` > Faturamento e solicite o cancelamento da assinatura.
3. Confirme o cancelamento.
4. Verifique que o sistema:
   - Cancelou a recorrência futura no painel do Mercado Pago Sandbox.
   - No Firestore, atualizou apenas o `subscriptionStatus` para `'canceled'`, mas **manteve** o `planTier` como `'pro'`.
5. Confirme que o usuário continua conseguindo usar as ferramentas Pro normalmente.
6. Avance manualmente o relógio do sistema/banco de dados para ultrapassar a data de `billingPeriodEnd`.
7. Faça uma nova requisição à inteligência de execução e confirme que o sistema efetuou o downgrade silencioso (cotas bloqueadas e retorno ao plano Free).
