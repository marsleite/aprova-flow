# Phase 1 Contracts: Lançamento Comercial e Assinaturas (Mercado Pago)

Este documento define as interfaces TypeScript e os contratos de payload de API para os fluxos de checkout e webhooks do Mercado Pago.

## 1. API: Geração de Sessão de Checkout

Exposta no endpoint `POST /billing/checkout`.

### Request Payload (`CheckoutSessionRequest`)

```typescript
export interface CheckoutSessionRequest {
  /**
   * O nível do plano solicitado. Sempre 'pro' para upgrades de monetização.
   */
  planTier: 'pro';
  
  /**
   * O intervalo de faturamento escolhido pelo usuário.
   * 'monthly' - R$ 34,90/mês
   * 'annually' - R$ 358,80/ano (equivalente a R$ 29,90/mês)
   */
  interval: 'monthly' | 'annually';
}
```

### Response Payload (`CheckoutSessionResponse`)

```typescript
export interface CheckoutSessionResponse {
  /**
   * O ID da sessão de preferência gerada no Mercado Pago.
   */
  checkoutId: string;
  
  /**
   * A URL de checkout seguro (init_point) fornecida pelo Mercado Pago para redirecionamento.
   */
  initPoint: string;
}
```

---

## 2. API: Webhook do Mercado Pago

Exposta no endpoint público `POST /billing/webhook/mercadopago`.

### Request Headers

A assinatura deve ser enviada pelo Mercado Pago para autenticação criptográfica:

```typescript
export interface WebhookHeaders {
  /**
   * O hash gerado com o algoritmo SHA-256 usando o webhook secret e o payload.
   */
  'x-signature': string;
  
  /**
   * O identificador exclusivo da chamada HTTP.
   */
  'x-request-id': string;
}
```

### Request Payload (`MercadoPagoWebhookEvent`)

Payload bruto recebido do Mercado Pago. O processamento assíncrono usará o ID de dados contido no payload para consultar a API oficial do Mercado Pago para obter o estado final do pagamento/assinatura (Pull pattern seguro).

```typescript
export interface MercadoPagoWebhookEvent {
  /**
   * Identificador do evento.
   */
  id: string | number;
  
  /**
   * Ação ocorrida (ex: 'created', 'updated', 'approved').
   */
  action: string;
  
  /**
   * Versão da API (ex: 'v1').
   */
  api_version: string;
  
  /**
   * Dados do objeto associado ao evento.
   */
  data: {
    /**
     * O ID do recurso modificado (ID do pagamento ou ID do preapproval).
     */
    id: string;
  };
  
  /**
   * Tipo de recurso notificado.
   * 'payment' - Eventos de transações (aprovação, estorno).
   * 'subscription_preapproval' - Eventos de planos recorrentes (criação, cancelamento, renovação).
   */
  type: 'payment' | 'subscription_preapproval' | string;
  
  /**
   * Data da criação do evento no formato ISO 8601.
   */
  date_created: string;
}
```

### Response Payload

Retornado imediatamente pelo backend após validação de integridade e assinatura para confirmar o recebimento seguro da notificação.

- **Status Code**: `200 OK` ou `204 No Content`
- **Body**: `{ success: true }` ou vazio
