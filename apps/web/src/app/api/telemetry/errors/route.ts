import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.error('🚨 [ClientErrorBeacon]', {
      timestamp: new Date().toISOString(),
      url: payload.url,
      message: payload.message,
      stack: payload.stack?.substring(0, 500),
      userEmail: payload.userEmail,
    });
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }
}
