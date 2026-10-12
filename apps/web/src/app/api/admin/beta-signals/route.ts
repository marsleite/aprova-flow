import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { BetaSignalsSummary } from '@/lib/firebase/betaSignals';
import { proxyRequestToBackendApi } from '@/lib/server/backendApi';

function readWindowDays(request: NextRequest): number {
  const raw = request.nextUrl.searchParams.get('windowDays');
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 7;
  return Math.min(30, Math.floor(parsed));
}

function buildFallbackSummary(windowDays: number): BetaSignalsSummary {
  return {
    windowDays,
    dataWarnings: ['API dedicada indisponível; exibindo resumo vazio temporário.'],
    activeUsers: 0,
    productEventUsers: 0,
    aiUsers: 0,
    featureBlocked: 0,
    upgradeViews: 0,
    upgradeClicks: 0,
    upgradeCtrPercent: 0,
    aiQuotaExhausted: 0,
    simulationCompleted: 0,
    testerSubscriptionUpdated: 0,
    planStatusChanged: 0,
    aiEvents: 0,
    aiCostUsd: 0,
    upgradeByRecommendedPlan: [],
    topBlockedFeatures: [],
    topUpgradeSurfaces: [],
    topQuotaTasks: [],
    topPlanTransitions: [],
    topAiTasks: [],
    aiFallbacks: 0,
    aiBudgetBlocks: 0,
    aiFailures: 0,
    aiFallbackRatePercent: 0,
    aiFailureRatePercent: 0,
    topAiProviders: [],
  };
}

export async function GET(request: NextRequest) {
  const windowDays = readWindowDays(request);
  const response = await proxyRequestToBackendApi({
    request,
    targetPath: '/billing/admin/beta-signals',
  });

  if (response.ok) {
    try {
      const data = (await response.json()) as Partial<BetaSignalsSummary>;
      const fallback = buildFallbackSummary(windowDays);
      const merged: BetaSignalsSummary = {
        ...fallback,
        ...data,
        windowDays,
        upgradeByRecommendedPlan: Array.isArray(data.upgradeByRecommendedPlan) ? data.upgradeByRecommendedPlan : [],
        topBlockedFeatures: Array.isArray(data.topBlockedFeatures) ? data.topBlockedFeatures : [],
        topUpgradeSurfaces: Array.isArray(data.topUpgradeSurfaces) ? data.topUpgradeSurfaces : [],
        topQuotaTasks: Array.isArray(data.topQuotaTasks) ? data.topQuotaTasks : [],
        topPlanTransitions: Array.isArray(data.topPlanTransitions) ? data.topPlanTransitions : [],
        topAiTasks: Array.isArray(data.topAiTasks) ? data.topAiTasks : [],
        topAiProviders: Array.isArray(data.topAiProviders) ? data.topAiProviders : [],
      };
      return NextResponse.json(merged, {
        status: 200,
        headers: {
          'cache-control': 'no-store',
        },
      });
    } catch {
      return NextResponse.json(buildFallbackSummary(windowDays), {
        status: 200,
        headers: {
          'cache-control': 'no-store',
        },
      });
    }
  }

  if (response.status === 401 || response.status === 403) {
    return response;
  }

  return NextResponse.json(buildFallbackSummary(windowDays), {
    status: 200,
    headers: {
      'cache-control': 'no-store',
    },
  });
}
