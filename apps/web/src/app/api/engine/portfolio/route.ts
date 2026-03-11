import { NextRequest, NextResponse } from 'next/server';
import { GetPortfolioSnapshot } from '@aprovamind/application/use-cases/engine/GetPortfolioSnapshot';
import { LegacyEngineDataSource } from '@/infrastructure/legacy/LegacyEngineDataSource';
import { requireAuthenticatedUser } from '@/lib/server/apiGuard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getServerTodayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
    try {
        const auth = await requireAuthenticatedUser(request);
        if ('response' in auth) return auth.response;

        const url = new URL(request.url);
        const budgetParam = url.searchParams.get('globalWeeklyBudget');
        const globalWeeklyBudget = budgetParam ? parseInt(budgetParam, 10) : 30;

        if (isNaN(globalWeeklyBudget) || globalWeeklyBudget <= 0) {
            return NextResponse.json(
                { error: 'Parâmetro globalWeeklyBudget inválido.' },
                { status: 400 }
            );
        }

        const today = getServerTodayIso();

        const useCase = new GetPortfolioSnapshot(
            new LegacyEngineDataSource(auth.idToken)
        );

        const result = await useCase.execute({
            userId: auth.uid,
            today,
            globalWeeklyBudget,
        });

        return NextResponse.json(result, {
            headers: {
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Erro ao gerar portfolio snapshot:', error);
        return NextResponse.json(
            { error: 'Erro interno ao carregar o portfólio multi-edital.' },
            { status: 500 }
        );
    }
}
