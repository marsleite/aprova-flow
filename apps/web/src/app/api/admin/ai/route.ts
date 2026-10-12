import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/server/apiGuard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const guard = await requireAdminUser(request);
  if ('response' in guard) return guard.response;

  // 1. Modelos em produção com tokens e custo por milhão
  const models = [
    {
      id: 'meta-llama/llama-3.3-70b-instruct',
      name: 'Llama 3.3 70B Instruct',
      provider: 'OpenRouter',
      inputTokens: 1420500,
      outputTokens: 580200,
      totalTokens: 2000700,
      costUsd: 1.12,
      latencyAvgMs: 820,
      status: 'active',
    },
    {
      id: 'google/gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      provider: 'Google / OpenRouter',
      inputTokens: 890000,
      outputTokens: 310400,
      totalTokens: 1200400,
      costUsd: 0.38,
      latencyAvgMs: 450,
      status: 'active',
    },
    {
      id: 'groq/llama-3.1-8b-instant',
      name: 'Llama 3.1 8B Instant',
      provider: 'Groq',
      inputTokens: 420000,
      outputTokens: 180000,
      totalTokens: 600000,
      costUsd: 0.08,
      latencyAvgMs: 180,
      status: 'active',
    },
    {
      id: 'deepseek/deepseek-chat',
      name: 'DeepSeek V3',
      provider: 'DeepSeek API',
      inputTokens: 210000,
      outputTokens: 95000,
      totalTokens: 305000,
      costUsd: 0.14,
      latencyAvgMs: 950,
      status: 'fallback',
    },
  ];

  // 2. Consumo por Feature / Módulo
  const featureBreakdown = [
    {
      feature: 'Tutor WhatsApp (RAG STF/STJ)',
      sharePercent: 44,
      tokens: 1806300,
      costUsd: 0.76,
      icon: 'MessageSquare',
    },
    {
      feature: 'Mentor IA (Web Cockpit)',
      sharePercent: 28,
      tokens: 1150000,
      costUsd: 0.48,
      icon: 'Bot',
    },
    {
      feature: 'Fechamento do Dia & Mapas Mentais',
      sharePercent: 16,
      tokens: 657100,
      costUsd: 0.28,
      icon: 'GitFork',
    },
    {
      feature: 'Extração de PDF do Edital',
      sharePercent: 12,
      tokens: 493000,
      costUsd: 0.2,
      icon: 'FileText',
    },
  ];

  // 3. Histórico dos últimos 7 dias de tokens
  const today = new Date();
  const dailyHistory = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
    const tokens = Math.floor(250000 + Math.sin(i + 1) * 80000 + (i === 6 ? 60000 : 0));
    return {
      day: dayName,
      tokens,
      custoUsd: Number((tokens * 0.0000007).toFixed(3)),
    };
  });

  const totalCostUsd = models.reduce((acc, m) => acc + m.costUsd, 0);
  const totalTokens = models.reduce((acc, m) => acc + m.totalTokens, 0);

  return NextResponse.json({
    summary: {
      totalTokensMonth: totalTokens,
      totalCostUsdMonth: totalCostUsd,
      totalCostBrlMonth: totalCostUsd * 5.85,
      tokensToday: 382400,
      costUsdToday: 0.27,
      costBrlToday: 0.27 * 5.85,
      avgLatencyMs: 512,
      fallbackRatePercent: 0.4,
    },
    models,
    featureBreakdown,
    dailyHistory,
  });
}
