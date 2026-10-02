import { NextRequest, NextResponse } from 'next/server';

const BOT_API_URL = process.env.APROVAMIND_API_URL || process.env.NEXT_PUBLIC_APROVAMIND_API_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firebase_uid, email, display_name } = body;

    if (!firebase_uid) {
      return NextResponse.json({ error: 'firebase_uid is required' }, { status: 400 });
    }

    const response = await fetch(`${BOT_API_URL}/api/auth/generate-link-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebase_uid, email, display_name }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err || 'Failed to generate code from Bot API' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating WhatsApp pairing code:', error);
    return NextResponse.json(
      { error: 'Internal server error connecting to WhatsApp Bot API' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'uid query param is required' }, { status: 400 });
    }

    const response = await fetch(`${BOT_API_URL}/api/auth/status/${uid}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ is_linked: false, phone: null });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching WhatsApp pairing status:', error);
    return NextResponse.json({ is_linked: false, phone: null });
  }
}
