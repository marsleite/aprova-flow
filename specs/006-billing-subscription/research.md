# Research Findings: Lançamento Comercial e Assinaturas (Mercado Pago)

**Branch**: `006-billing-subscription` | **Date**: 2026-05-20 | **Spec**: [spec.md](file:///Users/marleite/workspace/pessoal/aprova-flow/specs/006-billing-subscription/spec.md)

Este documento consolida a pesquisa técnica, decisões de engenharia e padrões de integração adotados para a ativação comercial do AprovaMind com o Mercado Pago.

---

## 1. Modelo de Assinatura Recorrente no Mercado Pago

### Decisão
Utilizar a API de **Preapprovals (Assinaturas)** do Mercado Pago para controle de recorrência no Cartão de Crédito. O checkout gerará um plano de preapproval (`/v1/preapproval_plan`) no Mercado Pago ou criará uma assinatura preapproval direta vinculada ao usuário.

### Raciocínio
- **Automação Completa**: O Mercado Pago lida automaticamente com os ciclos de cobrança subsequentes, tentativas de cobrança em caso de falha no cartão e expiração de assinaturas.
- **Segurança e Fricção Mínima**: Reduz drasticamente a necessidade de armazenar informações de faturamento sensíveis locais ou processar cron jobs complexos de cobrança recorrente no backend do AprovaMind.
- **Redirecionamento Simplificado**: As assinaturas preapproval oferecem um `init_point` direto no checkout seguro que gerencia o fluxo em conformidade com o PCI-DSS e 3D Secure.

### Alternativas Consideradas
- *Pagamento Único Recorrente (Pix/Cartão Manual)*: O usuário teria que re-efetuar o pagamento manualmente a cada mês. Descartado para o plano Pro devido à alta fricção e taxa de churn associada, embora seja um excelente candidato para complementação futura.
- *Gerenciamento de Recorrência Local*: Agendar cobranças mensais via Cron no AprovaMind. Descartado porque exige lidar com armazenamento de tokens de cartões de crédito e regras estritas de segurança de dados (PCI compliance).

---

## 2. Gestão de Cupons de Desconto e Promoções

### Decisão
Gerenciar cupons de desconto, campanhas promocionais e ofertas especiais **diretamente no painel do Mercado Pago**.

### Raciocínio
- **Foco e Velocidade**: Evita a necessidade de codificar, testar e auditar um sistema complexo de validação de cupons (limite de uso, expiração, exclusividade por plano) no monorepo do AprovaMind.
- **Nativo do Gateway**: O Mercado Pago já possui mecanismos de cupom robustos e integrados diretamente nos formulários e sessões de checkout.

### Alternativas Consideradas
- *Tabela Firestore local `coupons`*: Criar um documento para cupons e validá-los no backend antes de criar a sessão de pagamento. Descartado porque adiciona complexidade e custos de manutenção sem agregar valor incremental relevante para o lançamento comercial inicial.

---

## 3. Conformidade com o CDC (7 Dias) e Reembolso Automático

### Decisão
Se a solicitação de cancelamento for feita em **até 7 dias** a partir da data de criação da assinatura ativa (data correspondente à cobrança mais recente):
1. Chamar a API de reembolso do Mercado Pago (`POST /v1/payments/{payment_id}/refunds`) para o último pagamento associado.
2. Atualizar o `preapproval` do Mercado Pago para `cancelled` (cancelando recorrências futuras).
3. Efetuar o **downgrade imediato** do usuário no Firestore (`planTier = 'free'`, `subscriptionStatus = 'expired'`).

Se o cancelamento for solicitado **após 7 dias**:
1. Atualizar o status da assinatura no Mercado Pago para `cancelled` para impedir renovações automáticas ao final do período vigente.
2. Definir o `subscriptionStatus` no Firestore como `canceled`. O usuário **mantém acesso Pro** até a data `billingPeriodEnd` correspondente ao fim do ciclo atual. O downgrade final para `planTier = 'free'` e `subscriptionStatus = 'expired'` ocorrerá no dia em que o ciclo expirar (validado pelo entitlements resolver).

### Raciocínio
- **Conformidade Legal**: Atendimento direto ao Artigo 49 do Código de Defesa do Consumidor (CDC) brasileiro (direito de arrependimento).
- **Auto-Serviço**: Evita que o usuário dependa de suporte humano para obter estorno dentro dos 7 dias, aumentando a confiança e reduzindo custos operacionais.

### Alternativas Consideradas
- *Cancelamento manual com reembolso pelo administrador*: O sistema simplesmente desativa a assinatura no Mercado Pago e o administrador precisa entrar manualmente na conta e estornar o Pix/Cartão. Descartado por ser propenso a falhas humanas e demorado.

---

## 4. Segurança e Validação de Webhooks

### Decisão
1. Expor a rota pública `POST /billing/webhook/mercadopago` na Fastify API.
2. Toda notificação MUST ser validada usando a assinatura criptográfica SHA-256 fornecida pelo Mercado Pago através dos cabeçalhos `x-signature` e `x-request-id` combinados com o `client_secret` ou token do webhook.
3. Processar apenas eventos relevantes: `preapproval` (criação/cancelamento/alteração de assinaturas) e `payment` (confirmação ou estorno de pagamentos avulsos).

### Raciocínio
- **Segurança Avançada**: Garante que nenhum usuário mal-intencionado consiga simular uma liberação de acesso fazendo requisições HTTP falsas para o endpoint de webhook.
- **Consistência de Estado**: O processamento de eventos do webhook do Mercado Pago atualiza os metadados no Firestore de forma assíncrona e confiável, sem depender do sucesso do redirecionamento do cliente (evitando falhas se o usuário fechar a janela antes do redirecionamento de sucesso).

### Alternativas Consideradas
- *Consultar API do Mercado Pago no Redirecionamento*: Atualizar o status do usuário apenas quando ele voltar para `/checkout/success` consultando o ID da sessão. Descartado porque se o usuário fechar o browser após pagar, ele continuaria no plano Free (perda de dados e experiência frustrante). Webhooks são o único padrão seguro da indústria para conciliação de faturamento.
