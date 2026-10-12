import { NextRequest, NextResponse } from 'next/server';
import { setFirestoreDocumentWithUserToken } from '@/lib/server/firestoreRest';
import { resolveBackendApiBaseUrl } from '@/lib/server/backendApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXPECTED_HOTTOK =
  process.env.HOTMART_HOTTOK || 'FPQSTyF60MbpINRs92BGjVaE1iiwUe599014';

async function getAdminIdToken(): Promise<string | null> {
  const email = 'marsleite@gmail.com';
  const password = process.env.SEED_ADMIN_PASSWORD || '928010Mgr';
  const apiKey =
    process.env.FIREBASE_WEB_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    console.warn('[Hotmart Webhook] No Firebase Web API Key found for admin token generation');
    return null;
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    if (!res.ok) {
      console.error('[Hotmart Webhook] Admin login failed:', res.status);
      return null;
    }

    const data = await res.json();
    return data.idToken || null;
  } catch (err) {
    console.error('[Hotmart Webhook] Error obtaining admin token:', err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const headerHottok = request.headers.get('x-hotmart-hottok');
    const rawBody = await request.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    const incomingHottok = headerHottok || body.hottok;

    // Hotmart token authentication check
    if (incomingHottok && incomingHottok !== EXPECTED_HOTTOK) {
      console.warn('[Hotmart Webhook] Hottok mismatch:', incomingHottok);
      return NextResponse.json(
        { error: 'unauthorized', message: 'Hottok inválido.' },
        { status: 401 }
      );
    }

    const event = body.event || body.type || 'UNKNOWN';
    console.log(`[Hotmart Webhook] Received event: ${event}`, {
      id: body.id,
      event,
      creation_date: body.creation_date,
    });

    const data = body.data || {};
    const buyer = data.buyer || {};
    const purchase = data.purchase || {};
    const subscription = data.subscription || {};

    const buyerEmail = buyer.email;
    const buyerPhone = buyer.checkout_phone;
    const sck = purchase.sck; // Can be user UID or WhatsApp phone number

    const isApproved = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'].includes(event);
    const isRefunded = ['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK'].includes(event);
    const isSubscriptionCanceled = ['SUBSCRIPTION_CANCELED'].includes(event);
    const isExpired = ['SUBSCRIPTION_EXPIRED', 'PURCHASE_CANCELED'].includes(event);

    const isAnnual = Boolean(subscription.plan?.name?.toLowerCase().includes('anual'));
    const cycleDays = isAnnual ? 365 : 30;

    // Calcular data de expiração do ciclo pago (billingPeriodEnd)
    let billingPeriodEnd: string | null = null;
    if (subscription.date_next_charge) {
      try {
        const nextChargeMs =
          typeof subscription.date_next_charge === 'number'
            ? subscription.date_next_charge
            : Date.parse(subscription.date_next_charge);
        if (!isNaN(nextChargeMs)) {
          billingPeriodEnd = new Date(nextChargeMs).toISOString();
        }
      } catch {
        // fallback
      }
    }
    if (!billingPeriodEnd && isApproved) {
      billingPeriodEnd = new Date(Date.now() + cycleDays * 24 * 60 * 60 * 1000).toISOString();
    }

    let planTier: 'pro' | 'free' | null = null;
    let subscriptionStatus: string | null = null;

    if (isApproved) {
      planTier = 'pro';
      subscriptionStatus = 'active';
    } else if (isRefunded) {
      // Reembolso nos 7 dias do CDC ou chargeback: estorno efetuado, corta acesso imediatamente
      planTier = 'free';
      subscriptionStatus = 'refunded';
    } else if (isSubscriptionCanceled) {
      // Cancelamento de renovação programada: mantém status canceled mas preserva PRO durante o mês pago
      subscriptionStatus = 'canceled';
      // Permanece Pro até a conclusão dos 30 dias contratados
      planTier = 'pro';
    } else if (isExpired) {
      // Ciclo encerrou sem renovação
      planTier = 'free';
      subscriptionStatus = 'expired';
    }

    const adminToken = await getAdminIdToken();

    // 1. Audit trail: registra o evento no Firestore para histórico e rastreabilidade
    if (adminToken) {
      const logDocId = `hotmart_${body.id || Date.now()}`;
      setFirestoreDocumentWithUserToken({
        collection: 'billing_event_logs',
        documentId: logDocId,
        data: {
          event,
          buyerEmail: buyerEmail || null,
          buyerPhone: buyerPhone || null,
          sck: sck || null,
          planTier: planTier || null,
          subscriptionStatus: subscriptionStatus || null,
          billingPeriodEnd: billingPeriodEnd || null,
          provider: 'hotmart',
          transactionId: purchase.transaction || body.id || null,
          processedAt: new Date().toISOString(),
        },
        idToken: adminToken,
      }).catch((err) => {
        console.warn('[Hotmart Webhook] Warning recording audit log:', err);
      });
    }

    // 2. Atualiza o user_stats do aluno no Firestore se o UID estiver identificado
    if ((planTier || subscriptionStatus) && sck) {
      if (adminToken) {
        // Se sck for um UID válido do Firebase (alfanumérico, >= 20 chars)
        const isUid = typeof sck === 'string' && sck.length >= 20 && !sck.startsWith('+');
        if (isUid) {
          const updateData: Record<string, string | number | boolean | null | undefined> = {
            ...(planTier ? { planTier, planCode: planTier } : {}),
            ...(subscriptionStatus ? { subscriptionStatus } : {}),
            ...(billingPeriodEnd ? { billingPeriodEnd } : {}),
            billingProvider: 'hotmart',
            billingInterval: isAnnual ? 'annually' : 'monthly',
            hotmartBuyerEmail: buyerEmail || null,
            hotmartBuyerPhone: buyerPhone || null,
            subscriptionUpdatedAt: new Date().toISOString(),
          };

          if (isApproved) {
            updateData.subscriptionStartedAt = purchase.approved_date
              ? new Date(purchase.approved_date).toISOString()
              : new Date().toISOString();
          }
          if (isSubscriptionCanceled) {
            updateData.subscriptionCanceledAt = new Date().toISOString();
          }
          if (isRefunded) {
            updateData.refundedAt = new Date().toISOString();
          }

          const updateResult = await setFirestoreDocumentWithUserToken({
            collection: 'user_stats',
            documentId: sck,
            data: updateData,
            idToken: adminToken,
          });

          console.log(`[Hotmart Webhook] Updated Firestore user_stats for UID ${sck}:`, updateResult);
        }
      }
    }

    // 3. Sincroniza com o Core API em Go (/billing/webhook/hotmart) para atualizar cache de entitlements
    try {
      const coreBaseUrl = resolveBackendApiBaseUrl();
      if (coreBaseUrl) {
        fetch(`${coreBaseUrl}/billing/webhook/hotmart`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-hotmart-hottok': EXPECTED_HOTTOK,
          },
          body: rawBody,
        }).catch((coreErr) => {
          console.warn('[Hotmart Webhook] Could not forward to Go core API:', coreErr);
        });
      }
    } catch (coreDispatchErr) {
      console.warn('[Hotmart Webhook] Error preparing Go core dispatch:', coreDispatchErr);
    }

    // 4. Notifica o Companion Bot no WhatsApp (aprova-mind)
    const aprovamindUrl =
      process.env.APROVAMIND_API_URL ||
      process.env.NEXT_PUBLIC_APROVAMIND_API_URL ||
      'http://localhost:8000';
    const secretKey =
      process.env.INTERNAL_SERVICE_KEY || 'aprovamind-secret-service-key-2026';

    const targetPhone = buyerPhone || (typeof sck === 'string' && (sck.startsWith('+') || sck.length <= 15) ? sck : undefined);

    if (planTier && (targetPhone || sck)) {
      try {
        await fetch(`${aprovamindUrl.replace(/\/$/, '')}/api/auth/update-plan-tier`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-key': secretKey,
          },
          body: JSON.stringify({
            phone: targetPhone,
            firebase_uid: typeof sck === 'string' && sck.length >= 20 ? sck : undefined,
            plan_tier: planTier,
          }),
        });
        console.log(`[Hotmart Webhook] Notified aprova-mind companion: tier=${planTier}`);
      } catch (botErr) {
        console.warn('[Hotmart Webhook] Could not reach aprova-mind companion API:', botErr);
      }
    }

    return NextResponse.json({
      ok: true,
      event,
      status: 'processed',
      message: 'Hotmart webhook processed successfully',
    });
  } catch (error: any) {
    console.error('[Hotmart Webhook] Uncaught error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}
