import { NextRequest, NextResponse } from 'next/server';
import { GetPlanEngineSnapshot } from '@aprovamind/application/use-cases/engine/GetPlanEngineSnapshot';
import { LegacyEngineDataSource } from '@/infrastructure/legacy/LegacyEngineDataSource';
import { requireAuthenticatedUser } from '@/lib/server/apiGuard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PlanEngineSnapshotRequest {
  planId?: string | null;
  maxRecommendations?: number;
}

function getServerTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    if ('response' in auth) return auth.response;

    const rawBody = (await request.json().catch(() => ({}))) as PlanEngineSnapshotRequest;
    const planId =
      typeof rawBody.planId === 'string'
        ? rawBody.planId.trim() || null
        : rawBody.planId === null
          ? null
          : undefined;
    const today = getServerTodayIso();
    const maxRecommendations = rawBody.maxRecommendations ?? 3;

    if (
      typeof maxRecommendations !== 'number' ||
      !Number.isInteger(maxRecommendations) ||
      maxRecommendations < 1 ||
      maxRecommendations > 5
    ) {
      return NextResponse.json(
        { error: 'Campo "maxRecommendations" deve ser um inteiro entre 1 e 5.' },
        { status: 400 }
      );
    }

    const useCase = new GetPlanEngineSnapshot(
      new LegacyEngineDataSource(auth.idToken)
    );

    const result = await useCase.execute({
      userId: auth.uid,
      today,
      planId,
      maxRecommendations,
    });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Erro ao gerar engine snapshot:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar o snapshot do motor.' },
      { status: 500 }
    );
  }
}
