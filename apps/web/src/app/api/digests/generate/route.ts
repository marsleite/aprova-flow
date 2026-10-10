import { NextRequest } from 'next/server';
import { proxyRequestToBackendApi } from '@/lib/server/backendApi';

/**
 * Dispara a geração sob demanda do "Fechamento do Dia" para a data especificada.
 */
export async function POST(request: NextRequest) {
  return proxyRequestToBackendApi({
    request,
    targetPath: '/api/digests/generate',
  });
}
