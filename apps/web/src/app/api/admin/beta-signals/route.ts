import { NextRequest } from 'next/server';
import { proxyRequestToBackendApi } from '@/lib/server/backendApi';

export async function GET(request: NextRequest) {
  return proxyRequestToBackendApi({
    request,
    targetPath: '/billing/admin/beta-signals',
  });
}
