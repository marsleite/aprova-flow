'use client';

import { useEffect } from 'react';
import { AlertTriangle, Layers, RefreshCw, Activity, Target } from 'lucide-react';
import { Badge, Button, Card, Skeleton } from '@/components';
import { usePortfolioEngine } from '@/hooks/usePortfolioEngine';

interface PortfolioOverviewCardProps {
    // Configuração opcional do budget (pode vir de um setting global do user futuramente)
    globalWeeklyBudget?: number;
}

export default function PortfolioOverviewCard({ globalWeeklyBudget = 30 }: PortfolioOverviewCardProps) {
    const { portfolio, loading, error, fetchPortfolio } = usePortfolioEngine();

    useEffect(() => {
        void fetchPortfolio(globalWeeklyBudget);
    }, [fetchPortfolio, globalWeeklyBudget]);

    if (loading && !portfolio) {
        return (
            <Card padding="md" variant="default" className="relative overflow-hidden mb-6">
                <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </Card>
        );
    }

    // O card de Visão de Portfólio só será exibido se o estudante de fato tiver mais de 1 edital ativo.
    // Caso contrário, a visão "PlanEngineSnapshotCard" (plano único) já atende.
    if (!portfolio || portfolio.plans.length <= 1) {
        return null;
    }

    return (
        <Card padding="md" variant="default" className="relative overflow-hidden mb-8">
            <div className="absolute inset-x-0 top-0 h-px bg-am-brand-gradient opacity-60" />

            {/* Header */}
            <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <Badge variant="primary" className="bg-am-brand-primary/10 text-am-brand-primary border-am-brand-primary/20">
                            <Layers className="mr-1 h-3 w-3" />
                            Multi-Edital
                        </Badge>
                    </div>
                    <h3 className="font-brand text-am-body-lg font-bold text-am-text-primary tracking-tight">
                        Visão Global de Portfólio
                    </h3>
                    <p className="mt-1 text-am-caption text-am-text-secondary">
                        Alocação recomendada pelo Motor Estratégico considerando risco, urgência e dados reais.
                    </p>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shadow-am-sm"
                    onClick={() => void fetchPortfolio(globalWeeklyBudget)}
                    disabled={loading}
                >
                    <RefreshCw
                        className={`mr-1 h-3 w-3 ${loading ? 'animate-spin' : ''}`}
                    />
                    Recalcular
                </Button>
            </div>

            {error ? (
                <div className="mb-4 rounded-am-md border border-am-error/20 bg-am-error/5 p-4 text-am-error">
                    <div className="flex items-center gap-2 font-semibold text-sm mb-1">
                        <AlertTriangle className="h-4 w-4" /> Falha Crítica
                    </div>
                    <p className="text-sm opacity-90">{error}</p>
                </div>
            ) : (
                <div className="space-y-6">

                    {/* Alertas Críticos */}
                    {portfolio.alerts.length > 0 && (
                        <div className="flex flex-col gap-2">
                            {portfolio.alerts.map((alert, idx) => (
                                <div key={idx} className={`rounded-lg border px-4 py-3 text-sm flex gap-3 ${alert.severity === 'critical' ? 'bg-am-error/10 border-am-error/30 text-am-error' :
                                        alert.severity === 'warning' ? 'bg-am-warning/10 border-am-warning/30 text-am-warning' :
                                            'bg-am-info/10 border-am-info/30 text-am-info'
                                    }`}>
                                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-semibold block mb-0.5">
                                            {alert.type === 'dispersion' ? 'Dispersão de Foco' :
                                                alert.type === 'plan_at_risk' ? 'Plano em Risco' : 'Aviso do Motor'}
                                        </span>
                                        <span className="opacity-90 leading-relaxed">{alert.message}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Ranking Cards */}
                    <div className="space-y-3">
                        {portfolio.plans.map((plan, index) => (
                            <div key={plan.planId} className="rounded-xl border border-am-border-default bg-am-surface-elevated p-4 overflow-hidden relative group hover:border-am-border-strong transition-colors">
                                {/* Progress Background */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 bg-am-brand-primary/5 transition-all duration-1000 ease-out"
                                    style={{ width: `${plan.allocatedPercent}%` }}
                                />

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-am-surface-deep text-am-text-secondary text-[10px] font-bold">
                                                    #{index + 1}
                                                </span>
                                                <h4 className="font-semibold text-am-text-primary truncate">{plan.planName}</h4>
                                                {plan.phase === 'post_exam' && <Badge variant="outline" className="text-[10px]">Passou</Badge>}
                                                {plan.phase === 'final_push' && <Badge variant="warning" className="text-[10px]">Reta Final</Badge>}
                                            </div>
                                            <p className="text-xs text-am-text-tertiary flex items-center gap-1.5 mt-2">
                                                {plan.daysToExam !== null ? (plan.daysToExam > 0 ? `Prova em ${plan.daysToExam} dias` : 'Prova Hoje') : 'Sem data definida'}
                                                <span className="w-1 h-1 rounded-full bg-am-border-strong"></span>
                                                <strong className="text-am-text-secondary">{plan.allocatedHours}h</strong> alocadas na semana
                                            </p>
                                        </div>

                                        <div className="text-right shrink-0 ml-4">
                                            <p className="text-[10px] uppercase tracking-wider text-am-text-tertiary mb-0.5">Fatia Ideal</p>
                                            <p className="text-2xl font-medium tracking-tight text-am-brand-primary">
                                                {plan.allocatedPercent}<span className="text-sm text-am-text-tertiary ml-0.5">%</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Meta Indicators */}
                                    <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-am-border-subtle/50">
                                        <div>
                                            <span className="text-[10px] uppercase tracking-wider text-am-text-tertiary block mb-0.5">Score Composto</span>
                                            <span className="text-sm font-semibold text-am-text-primary">{plan.compositeScore}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase tracking-wider text-am-text-tertiary block mb-0.5">Risco de Edital</span>
                                            <span className={`text-sm font-semibold ${plan.riskScore > 60 ? 'text-am-error' : 'text-am-text-primary'}`}>
                                                {plan.riskScore}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase tracking-wider text-am-text-tertiary block mb-0.5">Urgência</span>
                                            <span className="text-sm font-semibold text-am-text-primary">{plan.urgencyScore}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center px-2">
                        <div className="flex items-center gap-2 text-am-text-secondary">
                            <Activity className="h-4 w-4" />
                            <span className="text-am-body-sm">
                                Índice de Dispersão: <strong className="text-am-text-primary">{portfolio.kpis.dispersionIndex}%</strong>
                            </span>
                        </div>
                        {portfolio.sharedSubjects.length > 0 && (
                            <div className="text-am-body-sm text-am-brand-primary flex items-center gap-1.5 font-medium">
                                <Target className="h-4 w-4" />
                                {portfolio.sharedSubjects.length} matérias compartilhadas ({portfolio.kpis.sharingEfficiencyPercent}% eficiênca)
                            </div>
                        )}
                    </div>

                </div>
            )}
        </Card>
    );
}
