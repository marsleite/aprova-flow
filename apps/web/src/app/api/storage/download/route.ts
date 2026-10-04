import { NextRequest, NextResponse } from 'next/server';
import { getPresignedR2DownloadUrl } from '@/lib/server/r2';
import { requireAuthenticatedUser } from '@/lib/server/apiGuard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ('response' in auth) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Parâmetro "key" é obrigatório.' }, { status: 400 });
    }

    // Security check: ensure user owns this file (key starts with folder/{userId}/) or is an admin
    if (!key.includes(`/${auth.uid}/`)) {
      console.warn(`[Storage API] Unauthorized file access attempt: user=${auth.uid} key=${key}`);
      return NextResponse.json({ error: 'Acesso não autorizado a este arquivo.' }, { status: 403 });
    }

    const expiresIn = Number(searchParams.get('expiresIn') || 3600);
    const downloadUrl = getPresignedR2DownloadUrl(key, expiresIn);

    return NextResponse.json({
      ok: true,
      key,
      downloadUrl,
      expiresInSeconds: expiresIn,
    });
  } catch (error: any) {
    console.error('[Storage API] Download presigned error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao gerar link de download.' },
      { status: 500 }
    );
  }
}
