import { NextRequest, NextResponse } from 'next/server';
import { setFirestoreDocumentWithUserToken } from '@/lib/server/firestoreRest';

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
    const isRevoked = [
      'PURCHASE_CANCELED',
      'PURCHASE_REFUNDED',
      'SUBSCRIPTION_CANCELED',
      'PURCHASE_CHARGEBACK',
    ].includes(event);

    const planTier = isApproved ? 'pro' : isRevoked ? 'free' : null;
    const subscriptionStatus = isApproved ? 'active' : isRevoked ? 'canceled' : null;

    // 1. Update Firestore if planTier changed and user ID is identifiable
    if (planTier && sck) {
      const adminToken = await getAdminIdToken();
      if (adminToken) {
        // If sck is likely a Firebase UID (alphanumeric, > 20 chars, no '+' prefix)
        const isUid = typeof sck === 'string' && sck.length >= 20 && !sck.startsWith('+');
        if (isUid) {
          const updateResult = await setFirestoreDocumentWithUserToken({
            collection: 'user_stats',
            documentId: sck,
            data: {
              planTier,
              subscriptionStatus,
              planCode: planTier,
              billingProvider: 'hotmart',
              billingInterval:
                subscription.plan?.name?.toLowerCase().includes('anual')
                  ? 'annually'
                  : 'monthly',
              hotmartBuyerEmail: buyerEmail || null,
              hotmartBuyerPhone: buyerPhone || null,
              subscriptionUpdatedAt: new Date().toISOString(),
            },
            idToken: adminToken,
          });

          console.log(`[Hotmart Webhook] Updated Firestore user_stats for UID ${sck}:`, updateResult);
        }
      }
    }

    // 2. Notify WhatsApp Bot (aprova-mind)
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
