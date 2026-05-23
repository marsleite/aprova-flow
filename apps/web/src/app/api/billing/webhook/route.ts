import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { MercadoPagoBillingAdapter } from '@aprovamind/infrastructure-billing';
import { HandleBillingWebhook, type FirestoreAdminWriter } from '@aprovamind/application';
import {
  setFirestoreDocumentWithUserToken,
  getFirestoreDocumentWithUserToken,
} from '@aprovamind/infrastructure-firebase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── Admin session (programmatic login via Firebase Identity Toolkit) ──
async function getAdminIdToken(): Promise<string> {
  const email = 'marsleite@gmail.com';
  const password = process.env.SEED_ADMIN_PASSWORD || '';
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) throw new Error('Firebase API key is not configured');

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Admin login failed: ${res.status} - ${text}`);
  }

  const data = await res.json();
  if (!data.idToken) throw new Error('No idToken returned from admin login');
  return data.idToken;
}

// ── Firestore writer that uses admin token ──
class FirestoreWriter implements FirestoreAdminWriter {
  constructor(private readonly idToken: string) {}

  async setDocument(
    collection: string,
    documentId: string,
    data: Record<string, unknown>
  ): Promise<{ ok: boolean; error?: string }> {
    return setFirestoreDocumentWithUserToken({ collection, documentId, data, idToken: this.idToken });
  }

  async getDocument(
    collection: string,
    documentId: string
  ): Promise<{ ok: boolean; exists?: boolean; data?: Record<string, unknown> }> {
    return getFirestoreDocumentWithUserToken({ collection, documentId, idToken: this.idToken });
  }
}

// ── Webhook signature verification ──
function verifySignature(
  signature: string,
  requestId: string,
  rawBody: string,
  secret: string
): boolean {
  if (!secret) return false;

  const tsMatch = signature.match(/ts=(\d+)/);
  const v1Match = signature.match(/v1=([a-f0-9]+)/i);
  if (!tsMatch || !v1Match) return false;

  const ts = tsMatch[1];
  const v1 = v1Match[1];

  let dataId = '';
  try {
    const body = JSON.parse(rawBody);
    dataId = (body.data?.id ?? body.id ?? '').toString().toLowerCase();
  } catch {
    return false;
  }

  if (!dataId) return false;

  // Candidate 1
  const hmac1 = crypto
    .createHmac('sha256', secret)
    .update(`id:${dataId};request-timestamp:${ts};`)
    .digest('hex');
  if (hmac1 === v1) return true;

  // Candidate 2
  const hmac2 = crypto
    .createHmac('sha256', secret)
    .update(`id:${dataId};request-id:${requestId};ts:${ts};`)
    .digest('hex');
  return hmac2 === v1;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();

  // ── Signature check ──
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || '';
  if (secret) {
    const signature = request.headers.get('x-signature') || '';
    const requestId = request.headers.get('x-request-id') || '';
    const valid = verifySignature(signature, requestId, rawBody, secret);
    if (!valid) {
      return NextResponse.json(
        { error: 'invalid_signature', message: 'Assinatura digital do webhook inválida ou ausente.' },
        { status: 400 }
      );
    }
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const requestId = request.headers.get('x-request-id') || '';
  const eventId = ((body.id ?? requestId) as string | number).toString();
  const rawTopic = ((body.topic ?? body.type) as string | undefined) ?? '';
  const topic = rawTopic.includes('payment')
    ? 'payment'
    : rawTopic.includes('preapproval')
    ? 'preapproval'
    : rawTopic;

  const resourceData = body.data as Record<string, unknown> | undefined;
  const resourceStr = body.resource as string | undefined;
  const resourceId = (
    resourceData?.id ??
    resourceStr?.split('/').pop() ??
    ''
  ).toString();

  if (!eventId || !topic || !resourceId) {
    console.warn('[webhook] Parâmetros incompletos', { eventId, topic, resourceId });
    return NextResponse.json({ status: 'ignored', reason: 'incomplete_parameters' });
  }

  try {
    const idToken = await getAdminIdToken();
    const writer = new FirestoreWriter(idToken);
    const adapter = new MercadoPagoBillingAdapter();
    const useCase = new HandleBillingWebhook(adapter, writer);

    const result = await useCase.execute({ eventId, topic, resourceId });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno ao processar webhook.';
    console.error('[webhook] Erro:', message);
    return NextResponse.json({ error: 'webhook_error', message }, { status: 500 });
  }
}
