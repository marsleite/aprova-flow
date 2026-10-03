import { NextRequest, NextResponse } from 'next/server';

const BOT_API_URL =
  process.env.APROVAMIND_API_URL ||
  process.env.NEXT_PUBLIC_APROVAMIND_API_URL ||
  'http://localhost:8000';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BOT_API_URL}/api/auth/token-info/${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ valid: false, phone_masked: null }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error verifying WhatsApp magic link token:', error);
    return NextResponse.json(
      { valid: false, error: 'Internal server error validating token' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, firebase_uid, email } = body;

    if (!token || !firebase_uid) {
      return NextResponse.json(
        { error: 'token and firebase_uid are required' },
        { status: 400 }
      );
    }

    let planTier = 'free';
    try {
      const { getUserEntitlements } = await import('@/lib/firebase/entitlements');
      const entitlements = await getUserEntitlements(firebase_uid, email);
      planTier = entitlements.planTier;
    } catch {
      // fallback to free
    }

    const response = await fetch(`${BOT_API_URL}/api/auth/redeem-phone-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, firebase_uid, email, plan_tier: planTier }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json(
        { error: err || 'Falha ao vincular conta' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error redeeming WhatsApp magic link token:', error);
    return NextResponse.json(
      { error: 'Internal server error redeeming token' },
      { status: 500 }
    );
  }
}
