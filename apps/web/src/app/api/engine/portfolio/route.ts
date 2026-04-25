import { NextRequest } from 'next/server';
import { proxyRequestToBackendApi } from '@/lib/server/backendApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    return proxyRequestToBackendApi({
        request,
        targetPath: '/engine/portfolio',
    });
}
