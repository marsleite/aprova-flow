import { NextRequest } from 'next/server';
import { proxyRequestToBackendApi } from '@/lib/server/backendApi';

/**
 * Lista todos os resumos diários ("Fechamento do Dia") do estudante logado.
 */
export async function GET(request: NextRequest) {
  return proxyRequestToBackendApi({
    request,
    targetPath: '/api/digests',
  });
}
