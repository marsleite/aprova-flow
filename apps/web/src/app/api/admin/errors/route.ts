import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/server/apiGuard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface SystemErrorItem {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'fatal';
  source: 'client' | 'server' | 'container';
  message: string;
  stack?: string;
  url: string;
  userEmail?: string;
  resolved: boolean;
}

// Armazena erros recentes em memória
const inMemoryErrorLogs: SystemErrorItem[] = [
  {
    id: 'err_resolved_01',
    timestamp: 'Hoje, às 10:15',
    level: 'error',
    source: 'client',
    message: 'TypeError: Cannot read properties of undefined (reading length) at BetaSignalsCard.tsx:372',
    stack: 'TypeError: Cannot read properties of undefined (reading length)\n    at BetaSignalsCard (BetaSignalsCard.tsx:372)\n    at SettingsPage (settings/page.tsx:550)',
    url: 'https://aprovamind.com.br/settings',
    userEmail: 'graceandradeleite@gmail.com',
    resolved: true,
  },
  {
    id: 'err_resolved_02',
    timestamp: 'Hoje, às 09:40',
    level: 'warning',
    source: 'server',
    message: 'Failed to find Server Action x. This request might be from an older deployment.',
    url: 'https://aprovamind.com.br/settings',
    userEmail: 'anonymous',
    resolved: true,
  },
];

export async function GET(request: NextRequest) {
  const guard = await requireAdminUser(request);
  if ('response' in guard) return guard.response;

  return NextResponse.json({
    errors: inMemoryErrorLogs,
    total: inMemoryErrorLogs.length,
    unresolvedCount: inMemoryErrorLogs.filter((e) => !e.resolved).length,
  });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdminUser(request);
  if ('response' in guard) return guard.response;

  try {
    const { action, errorId } = await request.json();
    if (action === 'resolve' && errorId) {
      const err = inMemoryErrorLogs.find((e) => e.id === errorId);
      if (err) err.resolved = true;
      return NextResponse.json({ success: true });
    }

    if (action === 'clear_resolved') {
      const activeOnly = inMemoryErrorLogs.filter((e) => !e.resolved);
      inMemoryErrorLogs.length = 0;
      inMemoryErrorLogs.push(...activeOnly);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Falha ao processar' }, { status: 500 });
  }
}
