import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, getPresignedR2DownloadUrl } from '@/lib/server/r2';
import { requireAuthenticatedUser } from '@/lib/server/apiGuard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ('response' in auth) {
      return auth.response;
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'editais';

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const key = `${folder}/${auth.uid}/${timestamp}_${sanitizedName}`;

    const uploadRes = await uploadToR2({
      key,
      data: buffer,
      contentType: file.type || 'application/octet-stream',
    });

    if (!uploadRes.ok) {
      return NextResponse.json(
        { error: uploadRes.error || 'Falha ao salvar no Cloudflare R2' },
        { status: 500 }
      );
    }

    const presignedDownloadUrl = getPresignedR2DownloadUrl(key, 86400); // 24h validity

    return NextResponse.json({
      ok: true,
      key,
      fileName: file.name,
      sizeBytes: buffer.length,
      downloadUrl: presignedDownloadUrl,
    });
  } catch (error: any) {
    console.error('[Storage API] Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno no upload.' },
      { status: 500 }
    );
  }
}
