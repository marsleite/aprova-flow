'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart2,
  Brain,
  MousePointerClick,
  RefreshCw,
  Users,
} from 'lucide-react';
import { auth } from '@/lib/firebase/config';
import { fetchAdminBetaSignals } from '@/lib/billing-admin-client';
import type { BetaSignalsSummary } from '@/lib/firebase/betaSignals';
import { Badge, Button, Card } from '@/components';

const WINDOW_OPTIONS = [7, 14, 30] as const;

function formatError(err: unknown): string {
  if (!(err instanceof Error)) {
    return 'Nao foi possivel carregar os sinais do beta.';
  }

  const [code, rawStatus, rawMessage] = err.message.split(':');
  const status = Number(rawStatus);
  const message = rawMessage?.trim();

  if (code === 'missing_id_token') {
    return 'Sua sessao expirou. Faca login novamente e tente de novo.';
  }

  if (status === 401) {
    return 'Sua sessao admin nao foi reconhecida. Faca login novamente e tente de novo.';
  }

  if (status === 403) {
    return 'Sua conta nao tem permissao para revisar os sinais do beta neste ambiente.';
  }

  return message || err.message || 'Nao foi possivel carregar os sinais do beta.';
}

function formatUsd(value: number): string {
  return `$${value.toFixed(4)}`;
}

function formatLadderLabel(plan: string): string {
  if (plan === 'pro') return 'Free -> Pro';
  if (plan === 'premium') return 'Pro -> Premium';
  return plan;
}

async function loadAdminBetaSummary(windowDays: number): Promise<BetaSignalsSummary> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) {
    throw new Error('missing_id_token');
  }

  return fetchAdminBetaSignals({
    idToken,
    windowDays,
  });
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-am-border-subtle bg-muted/50 px-3 py-4 text-am-body-sm text-muted-foreground">
      {text}
    </div>
  );
}

export default function BetaSignalsCard() {
  const [summary, setSummary] = useState<BetaSignalsSummary | null>(null);
  const [windowDays, setWindowDays] = useState<(typeof WINDOW_OPTIONS)[number]>(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function handleRefresh() {
    setLoading(true);
    setError(null);

    try {
      const next = await loadAdminBetaSummary(windowDays);
      setSummary(next);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleWindowChange(nextWindowDays: (typeof WINDOW_OPTIONS)[number]) {
    setWindowDays(nextWindowDays);
    setLoading(true);
    setError(null);

    try {
      const next = await loadAdminBetaSummary(nextWindowDays);
      setSummary(next);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadOnMount() {
      setLoading(true);
      setError(null);

      try {
        const next = await loadAdminBetaSummary(7);
        if (!cancelled) {
          setSummary(next);
        }
      } catch (err) {
        if (!cancelled) {
          setError(formatError(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOnMount();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card padding="lg" variant="default" className="w-full">
      <div className="mb-5 flex items-start justify-between gap-3 border-b border-am-border-subtle pb-3">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" />
            <h2 className="font-sans text-am-body font-bold text-foreground tracking-wide">
              Painel Beta Semanal
            </h2>
            <Badge variant="outline">Admin</Badge>
          </div>
          <p className="text-am-body-sm text-muted-foreground">
            Consolida sinais de bloqueio, upgrade e uso de IA dos ultimos{' '}
            {summary?.windowDays ?? windowDays} dias para revisar o beta sem depender
            de leitura manual no Firestore.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {WINDOW_OPTIONS.map((option) => (
            <Button
              key={option}
              variant={option === windowDays ? 'primary' : 'outline'}
              size="sm"
              disabled={loading && option === windowDays}
              onClick={() => {
                if (option !== windowDays) {
                  void handleWindowChange(option);
                }
              }}
            >
              {option}d
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-am-body-sm text-amber-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-am-caption">Usuarios com sinal</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{loading ? '—' : summary?.activeUsers ?? 0}</p>
          <p className="mt-1 text-am-caption text-muted-foreground">
            {loading ? 'Carregando...' : `${summary?.productEventUsers ?? 0} em produto, ${summary?.aiUsers ?? 0} em IA`}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <MousePointerClick className="h-4 w-4" />
            <span className="text-am-caption">Upgrade CTA</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{loading ? '—' : `${summary?.upgradeCtrPercent ?? 0}%`}</p>
          <p className="mt-1 text-am-caption text-muted-foreground">
            {loading ? 'Carregando...' : `${summary?.upgradeClicks ?? 0} cliques / ${summary?.upgradeViews ?? 0} views`}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-am-caption">Bloqueios e quota</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{loading ? '—' : `${summary?.featureBlocked ?? 0}`}</p>
          <p className="mt-1 text-am-caption text-muted-foreground">
            {loading ? 'Carregando...' : `${summary?.aiQuotaExhausted ?? 0} estouros de quota`}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
            <Brain className="h-4 w-4" />
            <span className="text-am-caption">Uso de IA</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{loading ? '—' : `${summary?.aiEvents ?? 0}`}</p>
          <p className="mt-1 text-am-caption text-muted-foreground">
            {loading ? 'Carregando...' : `${formatUsd(summary?.aiCostUsd ?? 0)} nos ultimos 7 dias`}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-sans text-am-body font-bold text-foreground">Escada de upgrade</h3>
            {!loading && (
              <span className="text-am-caption text-muted-foreground">
                {summary?.upgradeClicks ?? 0} cliques totais
              </span>
            )}
          </div>
          {loading ? (
            <EmptyState text="Carregando escada de upgrade..." />
          ) : summary?.upgradeByRecommendedPlan.length ? (
            <div className="space-y-2">
              {summary.upgradeByRecommendedPlan.map((item) => (
                <div key={item.recommendedPlan} className="rounded-md border border-border bg-card px-3 py-3">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-am-body-sm text-foreground">
                      {formatLadderLabel(item.recommendedPlan)}
                    </span>
                    <Badge variant="outline">{item.ctrPercent}% CTR</Badge>
                  </div>
                  <p className="text-am-caption text-muted-foreground">
                    {item.blocked + item.quotaExhausted} sinais de pressao
                    {' · '}
                    {item.views} views
                    {' · '}
                    {item.clicks} cliques
                  </p>
                  <p className="mt-1 text-am-caption text-muted-foreground">
                    {item.blocked} bloqueios
                    {' · '}
                    {item.quotaExhausted} quotas
                    {' · '}
                    {item.uniqueUsers} usuarios
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Ainda nao ha sinais suficientes para ler a escada de upgrade." />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-sans text-am-body font-bold text-foreground">Top bloqueios</h3>
            {!loading && (
              <span className="text-am-caption text-muted-foreground">
                {summary?.featureBlocked ?? 0} eventos
              </span>
            )}
          </div>
          {loading ? (
            <EmptyState text="Carregando bloqueios..." />
          ) : summary?.topBlockedFeatures.length ? (
            <div className="space-y-2">
              {summary.topBlockedFeatures.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-3">
                  <span className="text-am-body-sm text-foreground">{item.label}</span>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Nenhum bloqueio registrado na janela atual." />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-sans text-am-body font-bold text-foreground">Superficies de upgrade</h3>
            {!loading && (
              <span className="text-am-caption text-muted-foreground">
                {summary?.upgradeClicks ?? 0} cliques
              </span>
            )}
          </div>
          {loading ? (
            <EmptyState text="Carregando superficies..." />
          ) : summary?.topUpgradeSurfaces.length ? (
            <div className="space-y-2">
              {summary.topUpgradeSurfaces.map((item) => (
                <div key={item.label} className="rounded-md border border-border bg-card px-3 py-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-am-body-sm text-foreground">{item.label}</span>
                    <Badge variant="outline">{item.ctrPercent}% CTR</Badge>
                  </div>
                  <p className="text-am-caption text-muted-foreground">
                    {item.clicks} cliques / {item.views} views
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Ainda nao ha views ou cliques de upgrade na janela atual." />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-sans text-am-body font-bold text-foreground">Pressao de quota</h3>
            {!loading && (
              <span className="text-am-caption text-muted-foreground">
                {summary?.aiQuotaExhausted ?? 0} estouros
              </span>
            )}
          </div>
          {loading ? (
            <EmptyState text="Carregando pressao de quota..." />
          ) : summary?.topQuotaTasks.length ? (
            <div className="space-y-2">
              {summary.topQuotaTasks.map((item) => (
                <div key={item.task} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-3">
                  <span className="text-am-body-sm text-foreground">{item.task}</span>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Nenhum estouro de quota registrado na janela atual." />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-sans text-am-body font-bold text-foreground">Mudancas de plano</h3>
            {!loading && (
              <span className="text-am-caption text-muted-foreground">
                {summary?.planStatusChanged ?? 0} eventos
              </span>
            )}
          </div>
          {loading ? (
            <EmptyState text="Carregando mudancas..." />
          ) : summary?.topPlanTransitions.length ? (
            <div className="space-y-2">
              {summary.topPlanTransitions.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-3">
                  <span className="text-am-body-sm text-foreground">{item.label}</span>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Nenhuma mudanca de plano registrada na janela atual." />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-sans text-am-body font-bold text-foreground">Tarefas de IA</h3>
            {!loading && (
              <span className="text-am-caption text-muted-foreground">
                {formatUsd(summary?.aiCostUsd ?? 0)}
              </span>
            )}
          </div>
          {loading ? (
            <EmptyState text="Carregando tarefas de IA..." />
          ) : summary?.topAiTasks.length ? (
            <div className="space-y-2">
              {summary.topAiTasks.map((item) => (
                <div key={item.task} className="rounded-md border border-border bg-card px-3 py-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-am-body-sm text-foreground">{item.task}</span>
                    <Badge variant="outline">{item.events}</Badge>
                  </div>
                  <p className="text-am-caption text-muted-foreground">
                    custo {formatUsd(item.costUsd)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Nenhum uso de IA encontrado na janela atual." />
          )}
        </div>
      </div>

      {!loading && summary && (
        <div className="mt-6 rounded-md border border-am-border-subtle bg-muted/40 px-3 py-3 text-am-body-sm text-muted-foreground">
          Painel baseado em `product_usage_events` e `ai_usage_events`. Simulados concluidos: {summary.simulationCompleted}. Operacoes de tester: {summary.testerSubscriptionUpdated}. Usuarios com sinal na janela: {summary.activeUsers}.
        </div>
      )}
    </Card>
  );
}
