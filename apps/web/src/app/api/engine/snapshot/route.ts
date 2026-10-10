import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server/apiGuard';
import { GetPlanEngineSnapshot } from '@aprovamind/application/use-cases/engine/GetPlanEngineSnapshot';
import { LegacyEngineDataSource } from '@aprovamind/infrastructure-firebase/LegacyEngineDataSource';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getServerTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if ('response' in auth) {
    return auth.response;
  }

  const body = (await request.json().catch(() => ({}))) as {
    planId?: string | null;
    maxRecommendations?: number;
  };

  const planId =
    typeof body.planId === 'string'
      ? body.planId.trim() || null
      : body.planId === null
        ? null
        : undefined;

  const maxRecommendations =
    typeof body.maxRecommendations === 'number' && Number.isInteger(body.maxRecommendations)
      ? Math.max(1, Math.min(5, body.maxRecommendations))
      : 3;

  if (planId === null) {
    return NextResponse.json(
      {
        found: false,
        reason: 'no_active_plan',
        message: 'Selecione um edital ativo no Planner para usar o Engine.',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const useCase = new GetPlanEngineSnapshot(
      new LegacyEngineDataSource(auth.idToken)
    );

    const result = await useCase.execute({
      userId: auth.uid,
      today: getServerTodayIso(),
      planId,
      maxRecommendations,
    });

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[engine/snapshot] execution error:', error);
    return NextResponse.json(
      {
        error: 'engine_error',
        message: 'Erro ao carregar o snapshot do motor.',
      },
      { status: 500 }
    );
  }
}
