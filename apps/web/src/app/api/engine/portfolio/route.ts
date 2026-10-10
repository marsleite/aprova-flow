import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server/apiGuard';
import { GetPortfolioSnapshot } from '@aprovamind/application/use-cases/engine/GetPortfolioSnapshot';
import { LegacyEngineDataSource } from '@aprovamind/infrastructure-firebase/LegacyEngineDataSource';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getServerTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request);
  if ('response' in auth) {
    return auth.response;
  }

  const rawBudget = request.nextUrl.searchParams.get('globalWeeklyBudget');
  const globalWeeklyBudget =
    typeof rawBudget === 'string' && rawBudget.trim().length > 0
      ? Number(rawBudget)
      : 30;

  if (!Number.isInteger(globalWeeklyBudget) || globalWeeklyBudget <= 0) {
    return NextResponse.json(
      {
        error: 'bad_request',
        message: 'Query "globalWeeklyBudget" deve ser um inteiro maior que zero.',
      },
      { status: 400 }
    );
  }

  try {
    const useCase = new GetPortfolioSnapshot(
      new LegacyEngineDataSource(auth.idToken)
    );

    const result = await useCase.execute({
      userId: auth.uid,
      today: getServerTodayIso(),
      globalWeeklyBudget,
    });

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[engine/portfolio] execution error:', error);
    return NextResponse.json(
      {
        error: 'engine_error',
        message: 'Erro ao carregar o portfólio multi-edital.',
      },
      { status: 500 }
    );
  }
}
