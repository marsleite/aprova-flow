'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Brain, ChevronRight, RefreshCw, Target } from 'lucide-react';
import { Badge, Button, Card, Skeleton } from '@/components';
import type { PlanEngineSnapshotV1 } from '@aprovamind/contracts/engine/PlanEngineSnapshot';
import { auth } from '@/lib/firebase/config';

interface PlanEngineSnapshotCardProps {
  planId?: string | null;
}

type EngineSnapshotApiResponse =
  | {
    found: true;
    snapshot: PlanEngineSnapshotV1;
  }
  | {
    found: false;
    reason: 'no_active_plan' | 'plan_not_found';
  };

function formatStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    healthy: 'Saudável',
    mature: 'Madura',
    warning: 'Em atenção',
    critical: 'Crítica',
    neglected: 'Negligenciada',
    inefficient: 'Ineficiente',
    blind_spot: 'Zona cega',
    no_data: 'Sem base',
  };

  return labels[status] ?? status.replace(/_/g, ' ');
}

function formatRecommendationLabel(type: string): string {
  const labels: Record<string, string> = {
    rescue: 'Resgate',
    rebalance: 'Reequilíbrio',
    deepen: 'Aprofundar',
    maintain: 'Manter',
    celebrate: 'Manutenção leve',
    rest: 'Alívio',
    exam_push: 'Reta final',
    diagnostic: 'Diagnóstico',
  };

  return labels[type] ?? type.replace(/_/g, ' ');
}

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'outline' {
  if (status === 'healthy' || status === 'mature') return 'success';
  if (status === 'warning' || status === 'blind_spot') return 'warning';
  if (status === 'critical' || status === 'neglected' || status === 'inefficient') {
    return 'error';
  }
  return 'outline';
}

function priorityBandLabel(band: number): string {
  if (band === 1) return 'Crítica';
  if (band === 2) return 'Alta';
  if (band === 3) return 'Média';
  if (band === 4) return 'Baixa';
  return 'Opcional';
}

function formatOverallMetric(subject: PlanEngineSnapshotV1['subjects'][number]): string {
  if (subject.status === 'no_data') {
    return 'Sem base';
  }

  return String(subject.metrics.overallScore);
}

function formatRecencyMetric(subject: PlanEngineSnapshotV1['subjects'][number]): string {
  if (subject.status === 'no_data') {
    return 'Sem histórico';
  }

  return String(subject.metrics.recencyScore);
}

function formatPerformanceMetric(subject: PlanEngineSnapshotV1['subjects'][number]): string {
  if (subject.status === 'no_data' || subject.metrics.performanceScore === null) {
    return 'Sem base';
  }

  return `${subject.metrics.performanceScore}%`;
}

function emptyStateCopy(reason: 'no_active_plan' | 'plan_not_found') {
  if (reason === 'plan_not_found') {
    return {
      title: 'Plano ativo não encontrado',
      description:
        'O contexto ativo não pôde ser resolvido no servidor. Revise o edital selecionado antes de usar o novo núcleo.',
    };
  }

  return {
    title: 'Nenhum edital ativo',
    description:
      'O snapshot do motor precisa de um plano ativo para calcular prioridade e recomendações do dia.',
  };
}

export default function PlanEngineSnapshotCard({
  planId,
}: PlanEngineSnapshotCardProps) {
  const [snapshot, setSnapshot] = useState<PlanEngineSnapshotV1 | null>(null);
  const [reason, setReason] = useState<'no_active_plan' | 'plan_not_found' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSnapshot = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setError('Sessão expirada. Faça login novamente.');
        setSnapshot(null);
        setReason(null);
        return;
      }

      const response = await fetch('/api/engine/snapshot', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: planId ?? null,
          maxRecommendations: 3,
        }),
        cache: 'no-store',
      });

      const data = (await response.json().catch(() => null)) as
        | EngineSnapshotApiResponse
        | { error?: string }
        | null;

      if (!response.ok) {
        setError(data && 'error' in data && typeof data.error === 'string'
          ? data.error
          : 'Não foi possível carregar o núcleo do motor.');
        setSnapshot(null);
        setReason(null);
        return;
      }

      if (!data || !('found' in data)) {
        setError('Resposta inválida do snapshot do motor.');
        setSnapshot(null);
        setReason(null);
        return;
      }

      if (!data.found) {
        setSnapshot(null);
        setReason(data.reason);
        setError(null);
        return;
      }

      setSnapshot(data.snapshot);
      setReason(null);
      setError(null);
    } catch {
      setSnapshot(null);
      setReason(null);
      setError('Falha de rede ao carregar o snapshot do motor.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [planId]);

  useEffect(() => {
    void fetchSnapshot(false);
  }, [fetchSnapshot]);

  const topRecommendation = snapshot?.recommendations[0] ?? null;

  return (
    <Card padding="md" variant="default" className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-am-brand-gradient opacity-60" />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="ai">
              <Brain className="mr-1 h-3 w-3" />
              Motor V1
            </Badge>
            {snapshot?.engineVersion ? (
              <Badge variant="outline">{snapshot.engineVersion}</Badge>
            ) : null}
          </div>
          <h3 className="text-am-body-sm font-bold text-am-text-primary">
            Núcleo de Prioridade
          </h3>
          <p className="mt-1 text-am-caption text-am-text-secondary">
            Snapshot determinístico do plano ativo, isolado da UI legada.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => void fetchSnapshot(true)}
          disabled={loading || refreshing}
        >
          <RefreshCw
            className={`mr-1 h-3 w-3 ${refreshing ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <div className="rounded-am-md border border-am-error/20 bg-am-error/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-am-error">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-am-body-sm font-semibold">Falha ao carregar</span>
          </div>
          <p className="text-am-body-sm text-am-text-secondary">{error}</p>
        </div>
      ) : reason ? (
        <div className="rounded-am-md border border-am-border-default bg-am-surface-elevated p-4">
          <p className="text-am-body-sm font-semibold text-am-text-primary">
            {emptyStateCopy(reason).title}
          </p>
          <p className="mt-1 text-am-body-sm text-am-text-secondary">
            {emptyStateCopy(reason).description}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/planner">
              Ir para o Planner
              <ChevronRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      ) : snapshot ? (
        <div className="space-y-4">
          <div className="rounded-am-md border border-am-border-default bg-am-surface-elevated p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-am-caption uppercase tracking-wider text-am-text-tertiary">
                  Plano ativo
                </p>
                <p className="text-am-body-sm font-semibold text-am-text-primary">
                  {snapshot.plan.name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-am-caption uppercase tracking-wider text-am-text-tertiary">
                  Meta semanal
                </p>
                <p className="text-am-body-sm font-semibold text-am-text-primary">
                  {snapshot.plan.weeklyGoalHours}h
                </p>
              </div>
            </div>

            {topRecommendation ? (
              <div className="rounded-am-md border border-am-ai-border/40 bg-am-ai-subtle/50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="ai">Prioridade do dia</Badge>
                  <Badge variant="outline">
                    {formatRecommendationLabel(topRecommendation.type)}
                  </Badge>
                </div>
                <p className="text-am-body-sm font-semibold text-am-text-primary">
                  {topRecommendation.targetSubject}
                </p>
                <p className="mt-1 text-am-body-sm text-am-text-secondary">
                  {topRecommendation.reasons.join(' · ')}
                </p>
              </div>
            ) : (
              <div className="rounded-am-md border border-am-border-default bg-am-surface p-3">
                <p className="text-am-body-sm text-am-text-secondary">
                  O motor não gerou recomendações acionáveis para o plano atual.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {snapshot.subjects.slice(0, 4).map((subject) => (
              <Card
                key={subject.subject}
                variant="elevated" padding="none"
                className="p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-am-body-sm font-semibold text-am-text-primary">
                      {subject.subject}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(subject.status)}>
                        {formatStatusLabel(subject.status)}
                      </Badge>
                      <Badge variant="outline">
                        Faixa {priorityBandLabel(subject.priorityBand)}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-am-caption uppercase tracking-wider text-am-text-tertiary">
                      Pontuação
                    </p>
                    <p className="text-xl font-light tracking-tight text-am-text-primary">
                      {subject.priorityScore}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-am-caption text-am-text-secondary">
                  <div className="rounded-am-md bg-am-surface px-2 py-2 overflow-hidden min-w-0">
                    <p className="uppercase tracking-wider text-am-text-tertiary truncate">Saúde</p>
                    <p className="mt-1 text-am-body-sm font-semibold text-am-text-primary truncate">
                      {formatOverallMetric(subject)}
                    </p>
                  </div>
                  <div className="rounded-am-md bg-am-surface px-2 py-2 overflow-hidden min-w-0">
                    <p className="uppercase tracking-wider text-am-text-tertiary truncate">Recência</p>
                    <p className="mt-1 text-am-body-sm font-semibold text-am-text-primary truncate">
                      {formatRecencyMetric(subject)}
                    </p>
                  </div>
                  <div className="rounded-am-md bg-am-surface px-2 py-2 overflow-hidden min-w-0">
                    <p className="uppercase tracking-wider text-am-text-tertiary truncate">Questões</p>
                    <p className="mt-1 text-am-body-sm font-semibold text-am-text-primary truncate">
                      {formatPerformanceMetric(subject)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-am-md border border-am-border-default bg-am-surface-elevated px-4 py-3">
            <div className="flex items-center gap-2 text-am-text-secondary">
              <Target className="h-4 w-4" />
              <span className="text-am-body-sm">
                {snapshot.recommendations.length} recomendações no snapshot atual
              </span>
            </div>
            <Button asChild variant="outline" size="sm" className="h-8">
              <Link href="/planner">
                Ajustar plano
                <ChevronRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
