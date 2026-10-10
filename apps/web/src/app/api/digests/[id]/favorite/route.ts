import { NextRequest } from 'next/server';
import { proxyRequestToBackendApi } from '@/lib/server/backendApi';

/**
 * Alterna status de favorito de um resumo diário.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyRequestToBackendApi({
    request,
    targetPath: `/api/digests/${id}/favorite`,
  });
}
