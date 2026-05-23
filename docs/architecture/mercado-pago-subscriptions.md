# Mercado Pago Subscriptions Integration

Last reviewed: 2026-05-20

This document summarizes the official Mercado Pago documentation needed to implement and validate the AprovaMind Pro subscription flow.

## Official References

- API reference: https://www.mercadopago.com.br/developers/pt/reference
- Create subscription: https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/create-preapproval/post
- Get subscription: https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/get-preapproval/get
- Update subscription: https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/update-preapproval/put
- Get payment: https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro/get-payment/get
- Create refund: https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro/create-refund/post
- Webhooks: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks

## Credentials And Environment

The current backend flow uses server-side API calls and redirects the user to the Mercado Pago hosted checkout. The frontend does not need to handle card data.

Required for local checkout tests:

```env
MERCADO_PAGO_ACCESS_TOKEN=TEST-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Required for webhook validation:

```env
MERCADO_PAGO_WEBHOOK_SECRET=...
```

Notes:

- The Access Token is private and must only be used on the server.
- The Public Key shown in the Mercado Pago credentials screen is not required by the current hosted checkout/preapproval implementation.
- For real webhook tests, Mercado Pago must call a public URL. Localhost requires a tunnel such as ngrok or cloudflared.
- Test credentials should be rotated after being exposed in screenshots, shared channels, or logs.

## Base URL And Authentication

Base URL:

```text
https://api.mercadopago.com
```

Every request must include:

```http
Authorization: Bearer <MERCADO_PAGO_ACCESS_TOKEN>
Content-Type: application/json
```

The Mercado Pago documentation explicitly warns against exposing private credentials in client-side code or public repositories.

## Subscription Checkout

Use the Subscriptions API, not Checkout Pro preferences, for recurring Pro plans.

Create subscription:

```http
POST https://api.mercadopago.com/preapproval
```

Minimum fields for the AprovaMind flow:

```json
{
  "payer_email": "student@example.com",
  "back_url": "http://localhost:3000/checkout/success",
  "reason": "AprovaMind Pro - Mensal",
  "external_reference": "firebase-user-id",
  "auto_recurring": {
    "frequency": 1,
    "frequency_type": "months",
    "transaction_amount": 34.9,
    "currency_id": "BRL"
  },
  "status": "pending"
}
```

Expected response fields used by the app:

- `id`: Mercado Pago subscription/preapproval ID.
- `init_point`: hosted checkout URL.
- `sandbox_init_point`: sandbox hosted checkout URL, when available.

Implementation recommendation:

- Persist or return the Mercado Pago `id` as `checkoutId`.
- Redirect users to `sandbox_init_point || init_point`.
- Keep `external_reference` as the AprovaMind user ID so webhooks can reconcile payment state back to `user_stats/{userId}`.

## Subscription Lookup

Get subscription by ID:

```http
GET https://api.mercadopago.com/preapproval/{id}
```

Important response fields:

- `id`
- `external_reference`
- `status`
- `next_payment_date`
- `init_point`
- `auto_recurring`

Suggested local mapping:

| Mercado Pago status | Local status |
| --- | --- |
| `authorized` | `active` |
| `paused` | `past_due` |
| `cancelled` | `canceled` |
| other/unknown | `expired` |

## Subscription Cancellation

Update subscription:

```http
PUT https://api.mercadopago.com/preapproval/{id}
```

For cancellation:

```json
{
  "status": "cancelled"
}
```

Local behavior:

- If cancellation is inside the 7-day CDC reflection period, cancel the subscription, refund the latest payment, and downgrade the user immediately.
- If cancellation is outside the 7-day period, cancel future renewal and keep Pro access until `billingPeriodEnd`.

## Payments

Get payment by ID:

```http
GET https://api.mercadopago.com/v1/payments/{id}
```

Important fields for reconciliation:

- `id`
- `status`
- `transaction_amount`
- `external_reference`
- `preapproval_id`

For payment webhooks, use the payment ID from `data.id`, fetch the payment, then use `preapproval_id` to fetch the subscription.

## Refunds

Create refund:

```http
POST https://api.mercadopago.com/v1/payments/{id}/refunds
```

Required headers:

```http
Authorization: Bearer <MERCADO_PAGO_ACCESS_TOKEN>
Content-Type: application/json
X-Idempotency-Key: <uuid>
```

Full refund body:

```json
{}
```

Partial refund body:

```json
{
  "amount": 5
}
```

AprovaMind should use full refunds for the initial CDC implementation.

## Webhooks

Mercado Pago sends signed webhook notifications with:

- `x-signature`
- `x-request-id`

The `x-signature` header contains `ts` and `v1`, for example:

```text
ts=1704908010,v1=<hmac-sha256>
```

The official manifest format is:

```text
id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];
```

Validation steps:

1. Read `x-signature` and split by comma.
2. Extract `ts` and `v1`.
3. Read `x-request-id`.
4. Extract `data.id` from the notification request data.
5. Build the manifest with `id`, `request-id`, and `ts`.
6. Compute HMAC SHA-256 using `MERCADO_PAGO_WEBHOOK_SECRET`.
7. Compare the generated hex digest with `v1`.

Expected notification shape:

```json
{
  "id": 12345,
  "live_mode": true,
  "type": "payment",
  "date_created": "2015-03-25T10:04:58.396-04:00",
  "user_id": 44444,
  "api_version": "v1",
  "action": "payment.created",
  "data": {
    "id": "999999999"
  }
}
```

Security recommendation:

- Reject webhook requests when `MERCADO_PAGO_WEBHOOK_SECRET` is missing in non-local environments.
- Reject invalid signatures before any Firestore write.
- Store idempotency logs in `billing_event_logs/{eventId}`.

## Implementation Checklist

- Use `/preapproval` for create, get, and update subscription calls.
- Keep `/v1/payments/{id}` for payment lookup.
- Keep `/v1/payments/{id}/refunds` for refunds.
- Return a frontend-compatible checkout payload, preferably `{ checkoutId, initPoint }`, and make the UI redirect to `initPoint`.
- Remove hardcoded admin credentials from billing infrastructure.
- Ensure webhook signature validation follows the official `id;request-id;ts` manifest.
- Add `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, and `NEXT_PUBLIC_APP_URL` to environment documentation.
- Use a public webhook URL for sandbox end-to-end tests.
- Rotate exposed test credentials after test validation.

## LLM Implementation Guide: Subscriptions API

Use this section as the direct implementation guide for the Mercado Pago Subscriptions API.

### Create Subscription

A subscription is the union between a plan and a customer. The main characteristic of this contract is that it has a configured payment method and is the basis for creating invoices. You can also create a subscription without a plan.

```http
POST /preapproval
```

#### Request Parameters

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `preapproval_plan_id` | string | No | Unique subscription plan identifier. If a subscription is created with a plan, Mercado Pago uses the recurring settings from the plan and updates subscriptions when the plan changes. |
| `reason` | string | Required when no plan | Short description shown during checkout and notifications. |
| `external_reference` | string | Required when no plan | Free text reference to sync Mercado Pago entities with local entities. For AprovaMind, use the Firebase user ID. |
| `payer_email` | string | Usually required | Email linked to the subscriber. For subscriptions without an associated plan, Mercado Pago validates that the checkout email matches the payer email. |
| `card_token_id` | string | No | Token generated by Checkout Transparente card tokenization. Not required for the current hosted checkout redirect flow. |
| `auto_recurring` | object | Required when no plan | Recurrence configuration. |
| `back_url` | string | Required when no plan | URL used to redirect customers back to the app after checkout. |
| `status` | string | No | Use `pending` for hosted checkout without an initial payment method, or `authorized` when a payment method is already configured. |

#### `auto_recurring`

| Field | Type | Notes |
| --- | --- | --- |
| `frequency` | number | Frequency value. Together with `frequency_type`, defines the invoice cycle. |
| `frequency_type` | string | `days` or `months`. AprovaMind should use `months`. |
| `start_date` | string | Date from which the subscription will be active. It only works together with `end_date`. |
| `end_date` | string | Date until which the subscription will be active and invoices stop. |
| `transaction_amount` | number | Amount charged on each invoice. |
| `currency_id` | string | Currency ID. AprovaMind Brazil should use `BRL`. |

#### Status Values

| Status | Meaning |
| --- | --- |
| `pending` | Subscription without a payment method. |
| `authorized` | Subscription with a payment method. |

#### Create Request Example

```bash
curl -X POST \
  'https://api.mercadopago.com/preapproval' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -d '{
    "preapproval_plan_id": "2c938084726fca480172750000000000",
    "reason": "Yoga classes",
    "external_reference": "YG-1234",
    "payer_email": "test@testuser.com",
    "card_token_id": "e3ed6f098462036dd2cbabe314b9de2a",
    "auto_recurring": {
      "frequency": 1,
      "frequency_type": "months",
      "start_date": "2020-06-02T13:07:14.260Z",
      "end_date": "2022-07-20T15:59:52.581Z",
      "transaction_amount": 10,
      "currency_id": "BRL"
    },
    "back_url": "https://www.mercadopago.com.ar",
    "status": "authorized"
  }'
```

#### AprovaMind Create Request Shape

For the current no-plan hosted checkout flow:

```json
{
  "reason": "AprovaMind Pro - Mensal",
  "external_reference": "<firebase-user-id>",
  "payer_email": "<user-email>",
  "auto_recurring": {
    "frequency": 1,
    "frequency_type": "months",
    "transaction_amount": 34.9,
    "currency_id": "BRL"
  },
  "back_url": "http://localhost:3000/checkout/success",
  "status": "pending"
}
```

#### Response Fields

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique subscription identifier. Store as local `subscriptionId` after webhook reconciliation. |
| `version` | number | Number of times the subscription was modified. |
| `application_id` | number | Application/integration ID. |
| `collector_id` | number | Seller user ID in Mercado Pago. |
| `preapproval_plan_id` | string | Unique plan identifier. |
| `reason` | string | Checkout/notification description. |
| `external_reference` | string | Local sync reference. |
| `back_url` | string | Successful return URL. |
| `init_point` | string | Checkout URL to add or modify the payment method. Redirect the user here. |
| `auto_recurring` | object | Recurrence configuration. |
| `payer_id` | number | Customer identifier created from the email. |
| `card_id` | number | Card identifier. |
| `payment_method_id` | string | Payment method configured. |
| `next_payment_date` | string | Next payment debit date. Use as `billingPeriodEnd` when appropriate. |
| `date_created` | string | Creation date. |
| `last_modified` | string | Last modification date. |
| `status` | string | Subscription status. |

#### Create Response Example

```json
{
  "id": "2c938084726fca480172750000000000",
  "version": 0,
  "application_id": 1234567812345678,
  "collector_id": 100200300,
  "preapproval_plan_id": "2c938084726fca480172750000000000",
  "reason": "Yoga classes.",
  "external_reference": 23546246234,
  "back_url": "https://www.mercadopago.com.ar",
  "init_point": "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=2c938084726fca480172750000000000",
  "auto_recurring": {
    "frequency": 1,
    "frequency_type": "months",
    "start_date": "2020-06-02T13:07:14.260Z",
    "end_date": "2022-07-20T15:59:52.581Z",
    "currency_id": "ARS",
    "transaction_amount": "24.50",
    "free_trial": {
      "frequency": 1,
      "frequency_type": "months"
    }
  },
  "payer_id": 123123123,
  "card_id": 123123123,
  "payment_method_id": "visa",
  "next_payment_date": "2022-01-01T11:12:25.892-04:00",
  "date_created": "2022-01-01T11:12:25.892-04:00",
  "last_modified": "2022-01-01T11:12:25.892-04:00",
  "status": "pending"
}
```

#### Create Errors

| Status | Error | Description |
| --- | --- | --- |
| 400 | 400 | Bad Request |
| 401 | 401 | Unauthorized |
| 403 | 403 | Forbidden |
| 500 | 500 | Error |

### Search Subscriptions

Search for subscriptions by using different parameters.

```http
GET /preapproval/search
```

#### Search Query Parameters

| Field | Type | Notes |
| --- | --- | --- |
| `q` | string | Free search field. |
| `payer_id` | number | Customer ID to find related subscriptions. |
| `payer_email` | string | Search by subscriber email. |
| `preapproval_plan_id` | string | Filter by subscription plan ID. |
| `transaction_amount` | number | Filter by subscription amount. |
| `semaphore` | string | Collection control status. |
| `status` | string | Filter by one or more statuses. |
| `sort` | string | Sorting in `field_name:sort_type` format. |
| `offset` | number | Offset of the first item to return. |
| `limit` | number | Maximum number of items to return. |

#### Search Response

```ts
interface MercadoPagoPreapprovalSearchResponse {
  paging?: {
    offset?: number;
    limit?: number;
    total?: number;
  };
  results?: MercadoPagoPreapproval[];
}
```

Each result follows the same subscription shape returned by create/get, plus optional `payer_first_name`, `payer_last_name`, `first_invoice_offset`, and `summarized`.

#### `summarized`

| Field | Type | Notes |
| --- | --- | --- |
| `quotas` | number | Number of payments expected. |
| `charged_quantity` | number | Total charged quotas. |
| `charged_amount` | number | Total collected amount. |
| `pending_charge_quantity` | number | Pending quotas to charge. |
| `pending_charge_amount` | number | Pending amount. |
| `last_charged_date` | string | Last charge date. |
| `last_charged_amount` | number | Last charged amount. |
| `semaphore` | string | `green`, `yellow`, `red`, or `blank`. |

#### Search Request Example

```bash
curl -X GET \
  'https://api.mercadopago.com/preapproval/search' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>'
```

#### Search Errors

| Status | Error | Description |
| --- | --- | --- |
| 400 | 400 | Bad Request |
| 401 | 401 | Unauthorized |
| 500 | 500 | Error |

### Get Subscription

Obtains all information for a subscription from its ID.

```http
GET /preapproval/{id}
```

#### Path Parameters

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | Yes | Subscription identifier. |

#### Get Request Example

```bash
curl -X GET \
  'https://api.mercadopago.com/preapproval/{id}' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>'
```

#### Get Response

The response follows the subscription object shape from "Create Subscription". Important fields for AprovaMind:

| Field | Usage |
| --- | --- |
| `id` | Store as `subscriptionId`. |
| `external_reference` | Resolve local `userId`. |
| `status` | Map to local subscription status. |
| `next_payment_date` | Use as billing period end when present. |
| `payment_method_id` | Optional display/audit metadata. |
| `summarized.semaphore` | Optional collection health signal. |

#### Get Errors

| Status | Error | Description |
| --- | --- | --- |
| 400 | 400 | Bad Request |
| 403 | 403 | Forbidden |
| 404 | 404 | Not Found |
| 500 | 500 | Error |

### Update Subscription

Renews the data of a subscription. Indicate the preapproval ID and send the body with the information to update. You can update reason, amount, payment method, status, and other subscription data.

```http
PUT /preapproval/{id}
```

#### Update Path Parameters

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | Yes | Unique subscription identifier to modify. |

#### Update Body Parameters

| Field | Type | Notes |
| --- | --- | --- |
| `reason` | string | Short description shown during checkout and notifications. |
| `external_reference` | string | Local sync reference. |
| `back_url` | string | Successful return URL. |
| `auto_recurring` | object | Recurrence data. Supports `transaction_amount` and `currency_id` updates. |
| `card_token_id` | number | Card token/payment method identifier. |
| `card_token_id_secondary` | number | Secondary card token. |
| `payment_method_id_secondary` | string | Secondary payment method ID. |
| `status` | string | `pending`, `authorized`, `paused`, or `canceled`. |

#### Cancellation Body

```json
{
  "status": "canceled"
}
```

Mercado Pago uses `canceled` in the current API reference. If an older integration uses `cancelled`, normalize the local adapter to the spelling accepted by the current API.

#### Update Request Example

```bash
curl -X PUT \
  'https://api.mercadopago.com/preapproval/{id}' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -d '{
    "reason": "Yoga classes.",
    "external_reference": 23546246234,
    "back_url": "https://www.mercadopago.com.ar",
    "auto_recurring": {
      "transaction_amount": 10,
      "currency_id": "BRL"
    },
    "card_token_id": 123123123,
    "card_token_id_secondary": 123123123,
    "payment_method_id_secondary": "visa",
    "status": "pending"
  }'
```

#### Update Response

The response follows the subscription object shape from "Create Subscription", with optional secondary payment fields:

| Field | Type | Notes |
| --- | --- | --- |
| `card_id_secondary` | number | Secondary card identifier. |
| `payment_method_id_secondary` | string | Secondary payment method. |

#### Update Errors

| Status | Error | Description |
| --- | --- | --- |
| 400 | 400 | Bad Request |
| 401 | 401 | Unauthorized |
| 500 | 500 | Error |

### Export Subscriptions

Downloads a CSV file with all subscriptions matching the search request.

```http
GET /preapproval/export
```

#### Export Query Parameters

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `collector_id` | number | Yes | Collector ID requesting the subscriptions. |
| `preapproval_plan_id` | string | No | Filter by plan ID. |
| `status` | string | No | Filter by one or more statuses. |
| `sort` | string | No | Sorting in `field_name:sort_type` format. |

#### Export Request Example

```bash
curl -X GET \
  'https://api.mercadopago.com/preapproval/export' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>'
```

#### Export Response

This endpoint returns a CSV file and has no JSON response body.

#### Export Errors

| Status | Error | Description |
| --- | --- | --- |
| 401 | 401 | Unauthorized |
| 500 | 500 | Error |

### LLM Implementation Notes

- For hosted checkout, create subscriptions with `status: "pending"` and redirect users to `init_point`.
- Do not send `card_token_id` unless implementing Checkout Transparente card capture.
- For the current AprovaMind model, prefer subscriptions without a Mercado Pago plan and use `auto_recurring` directly for monthly/annual prices.
- Use `external_reference` as the stable local user ID.
- Treat `next_payment_date` as the strongest available billing period boundary.
- Map Mercado Pago `authorized` to local `active`.
- Map Mercado Pago `paused` to local `past_due`.
- Map Mercado Pago `canceled` to local `canceled`.
- Keep unknown statuses conservative, usually `expired` or restricted access.
- Always use server-side calls with the private Access Token.
