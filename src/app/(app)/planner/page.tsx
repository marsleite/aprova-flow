'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlanContext } from '@/contexts/PlanContext';
import {
  setActivePlan,
  deleteStudyPlan,
} from '@/lib/firebase/plans';
import { getStudySummary, getPlanVsActual, getStudyConsistency } from '@/lib/firebase/sessions';
import { StudyPlanEdital, PlanVsActual } from '@/types';
import PlanManager from '@/components/PlanManager';
import { useEntitlements } from '@/hooks/useEntitlements';
import { canCreateMorePlans } from '@/lib/entitlements';
import {
  CalendarDays,
  Plus,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Edit2,
  Trash2,
  MoreVertical,
  BarChart2,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import CalendarSyncSection from '@/components/CalendarSyncSection';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.05, ease: 'easeOut' as const } }),
};

interface PlanStats {
  planId: string;
  totalHoursMonth: number;
  accuracy: number | null;
  progress: number;
  planVsActual: PlanVsActual[];
  lastStudied: string | null;
  urgency: 'critical' | 'medium' | 'low';
}

const URGENCY_CONFIG = {
  critical: { label: 'CRÍTICO', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  medium: { label: 'MÉDIO', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  low: { label: 'BAIXO', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
};

export default function PlannerPage() {
  const { user } = useAuthContext();
  const { planTier, capabilities } = useEntitlements(user?.uid, user?.email);
  const { plans, activePlanId, onPlanChange } = usePlanContext();
  const [planStats, setPlanStats] = useState<PlanStats[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [planManagerOpen, setPlanManagerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<StudyPlanEdital | null>(null);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const canCreate = canCreateMorePlans(planTier, plans.length);
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || null;
  const selectedStats = planStats.find((s) => s.planId === selectedPlanId) || null;

  // When context plans change, auto-select active or first plan
  useEffect(() => {
    if (!selectedPlanId && plans.length > 0) {
      setSelectedPlanId(activePlanId || plans[0].id || null);
    }
  }, [plans, activePlanId, selectedPlanId]);

  const loadData = useCallback(async () => {
    if (!user || plans.length === 0) return;
    try {
      const statsArr: PlanStats[] = await Promise.all(
        plans.map(async (plan) => {
          try {
            const [summary, pva, cons] = await Promise.all([
              getStudySummary(user.uid, plan.id),
              getPlanVsActual(user.uid, plan.id, plan.subjects),
              getStudyConsistency(user.uid, plan.id),
            ]);
            const totalHours = summary.totalMonth / 3600;
            const neglectedCount = pva.filter((p) => p.status === 'neglected').length;
            const urgency: 'critical' | 'medium' | 'low' =
              cons.currentStreak === 0 && totalHours < 2 ? 'critical'
              : neglectedCount > 1 ? 'medium'
              : 'low';
            return {
              planId: plan.id || '',
              totalHoursMonth: totalHours,
              accuracy: null,
              progress: Math.min(100, Math.round((summary.totalMonth / (plan.weeklyGoalHours * 4 * 3600)) * 100)),
              planVsActual: pva,
              lastStudied: null,
              urgency,
            };
          } catch {
            return { planId: plan.id || '', totalHoursMonth: 0, accuracy: null, progress: 0, planVsActual: [], lastStudied: null, urgency: 'low' as const };
          }
        })
      );
      setPlanStats(statsArr);
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, [user, plans, selectedPlanId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSelectActive = async (planId: string) => {
    if (!user) return;
    await setActivePlan(user.uid, planId);
    onPlanChange(planId);
  };

  const handleDelete = async (planId: string) => {
    if (!user || !confirm('Excluir este edital? Esta ação é irreversível.')) return;
    await deleteStudyPlan(planId);
    setOpenMenuId(null);
    await loadData();
  };

  if (!user) return null;

  const totalHoursAll = planStats.reduce((a, b) => a + b.totalHoursMonth, 0);
  const avgProgress = planStats.length > 0
    ? Math.round(planStats.reduce((a, b) => a + b.progress, 0) / planStats.length)
    : 0;
  const criticalCount = planStats.filter((s) => s.urgency === 'critical').length;

  // Scatter data for selected plan
  const scatterData = selectedStats?.planVsActual.map((pva) => ({
    name: pva.subject,
    x: pva.actualHours,
    y: pva.plannedPercent,
    status: pva.status,
  })) || [];

  return (
    <div className="min-h-screen bg-[#080c14]">
      {/* Header */}
      <div className="border-b border-white/[0.05] bg-[#0b1120]/60 px-6 py-5 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">Strategic Exam Planner</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Multi-Edital Planner</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Gerencie múltiplos concursos com estratégia baseada em dados
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => canCreate ? (setEditingPlan(null), setPlanManagerOpen(true)) : null}
              disabled={!canCreate}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Adicionar Edital
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Summary stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Horas Totais (Mês)', value: loading ? '—' : `${totalHoursAll.toFixed(0)}h`, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Progresso Médio', value: loading ? '—' : `${avgProgress}%`, icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { label: 'Editais Ativos', value: loading ? '—' : `${plans.length}`, icon: BookOpen, color: 'text-teal-400', bg: 'bg-teal-500/10' },
            { label: 'Prazos Críticos', value: loading ? '—' : `${criticalCount}`, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }, i) => (
            <motion.div key={label} custom={i} variants={fadeUp} initial="hidden" animate="show"
              className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-5"
            >
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-4.5 w-4.5 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Plans table */}
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show"
            className="rounded-xl border border-white/[0.06] bg-[#0f1825] overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-white">Planos Estratégicos Ativos</h3>
              </div>
              <div className="flex gap-2">
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">Em Dia</span>
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">Atenção</span>
              </div>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-lg shimmer" />)}
              </div>
            ) : plans.length === 0 ? (
              <div className="py-12 text-center px-6">
                <CalendarDays className="mx-auto mb-3 h-8 w-8 text-slate-700" />
                <p className="text-sm font-medium text-slate-500">Nenhum edital configurado</p>
                <p className="mt-1 text-xs text-slate-600">Adicione seus concursos para começar a planejar estrategicamente</p>
                <button
                  onClick={() => canCreate ? (setEditingPlan(null), setPlanManagerOpen(true)) : null}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600/20 px-4 py-2 text-sm text-blue-300 hover:bg-blue-600/30 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Criar primeiro edital
                </button>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="grid grid-cols-[1fr_80px_100px_80px_80px] gap-4 border-b border-white/[0.04] px-5 py-2.5">
                  {['Edital / Concurso', 'Progresso', 'Última Sessão', 'Urgência', 'Precisão'].map((h) => (
                    <p key={h} className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{h}</p>
                  ))}
                </div>

                <div className="divide-y divide-white/[0.03]">
                  {plans.map((plan, i) => {
                    const stats = planStats.find((s) => s.planId === plan.id);
                    const urgency = stats?.urgency || 'low';
                    const uc = URGENCY_CONFIG[urgency];
                    const isSelected = plan.id === selectedPlanId;
                    const isActive = plan.id === activePlanId;

                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id || null)}
                        className={`grid grid-cols-[1fr_80px_100px_80px_80px] gap-4 cursor-pointer items-center px-5 py-4 transition-colors ${isSelected ? 'bg-blue-500/[0.06]' : 'hover:bg-white/[0.02]'}`}
                        style={isSelected ? { borderLeft: `2px solid ${plan.color}` } : {}}
                      >
                        {/* Name */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: plan.color, boxShadow: `0 0 6px ${plan.color}60` }} />
                            <p className="truncate text-sm font-semibold text-white">{plan.name}</p>
                            {isActive && (
                              <span className="flex-shrink-0 rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] text-blue-300">ATIVO</span>
                            )}
                          </div>
                          <p className="mt-0.5 pl-4 text-xs text-slate-600">
                            {plan.subjects.length > 0 ? `${plan.subjects.length} matérias` : 'Sem matérias'} · Meta {plan.weeklyGoalHours}h/sem
                          </p>
                        </div>

                        {/* Progress — circular indicator */}
                        <div className="flex items-center justify-center">
                          <div className="relative h-10 w-10">
                            <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                              <circle
                                cx="18" cy="18" r="15" fill="none"
                                stroke={plan.color}
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray={`${(stats?.progress || 0) * 0.9425} 94.25`}
                                className="transition-all duration-700"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                              {stats?.progress || 0}%
                            </span>
                          </div>
                        </div>

                        {/* Last studied */}
                        <p className="text-xs text-slate-500">
                          {stats?.totalHoursMonth ? `${stats.totalHoursMonth.toFixed(1)}h este mês` : 'Sem dados'}
                        </p>

                        {/* Urgency */}
                        <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-bold ${uc.bg} ${uc.text}`}>
                          {uc.label}
                        </span>

                        {/* Actions */}
                        <div className="relative flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSelectActive(plan.id || ''); }}
                            className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${isActive ? 'bg-blue-500/20 text-blue-300' : 'bg-white/[0.05] text-slate-500 hover:bg-white/[0.08] hover:text-slate-300'}`}
                          >
                            {isActive ? 'Ativo' : 'Usar'}
                          </button>
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === plan.id ? null : (plan.id || null)); }}
                              className="rounded-md p-1 text-slate-600 hover:bg-white/[0.06] hover:text-slate-400 transition-colors"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                            {openMenuId === plan.id && (
                              <div className="absolute right-0 top-6 z-50 w-36 overflow-hidden rounded-lg border border-white/[0.08] bg-[#111827] shadow-xl">
                                <button onClick={(e) => { e.stopPropagation(); setEditingPlan(plan); setPlanManagerOpen(true); setOpenMenuId(null); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.06] transition-colors">
                                  <Edit2 className="h-3 w-3" /> Editar
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(plan.id || ''); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                                  <Trash2 className="h-3 w-3" /> Excluir
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>

          {/* Right panel: selected plan details */}
          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show" className="space-y-4">
            {selectedPlan ? (
              <>
                {/* Plan header */}
                <div className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ background: selectedPlan.color, boxShadow: `0 0 8px ${selectedPlan.color}60` }} />
                      <p className="text-sm font-bold text-white">{selectedPlan.name}</p>
                    </div>
                    <span className="text-xs text-slate-600">SELECIONADO</span>
                  </div>

                  {/* Weight vs Time scatter */}
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    Peso Estratégico vs. Tempo
                  </p>
                  <div className="h-44">
                    {scatterData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="x" name="Horas" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} label={{ value: 'Horas →', position: 'insideBottom', offset: -5, fill: '#475569', fontSize: 9 }} />
                          <YAxis dataKey="y" name="Peso" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} label={{ value: 'Peso ↑', angle: -90, position: 'insideLeft', offset: 10, fill: '#475569', fontSize: 9 }} />
                          <Tooltip
                            contentStyle={{ background: '#0f1825', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '11px' }}
                            formatter={(val, name) => [`${val}${name === 'Peso' ? '%' : 'h'}`, name]}
                          />
                          <Scatter
                            data={scatterData}
                            fill={selectedPlan.color}
                            fillOpacity={0.8}
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-xs text-slate-600">Configure matérias para ver o gráfico</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Priority action items */}
                <div className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Itens de Ação Prioritários
                  </p>
                  {selectedStats && selectedStats.planVsActual.length > 0 ? (
                    <div className="space-y-2">
                      {selectedStats.planVsActual
                        .filter((pva) => pva.status !== 'ok')
                        .slice(0, 3)
                        .map((pva) => (
                          <div key={pva.subject}
                            className={`rounded-lg p-3 ${pva.status === 'neglected' ? 'border border-red-500/20 bg-red-500/[0.06]' : 'border border-emerald-500/20 bg-emerald-500/[0.06]'}`}
                          >
                            <div className="flex items-start gap-2">
                              {pva.status === 'neglected'
                                ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" />
                                : <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                              }
                              <div>
                                <p className={`text-xs font-semibold ${pva.status === 'neglected' ? 'text-red-300' : 'text-emerald-300'}`}>
                                  {pva.status === 'neglected' ? 'Abaixo do Planejado' : 'Dominada'}
                                </p>
                                <p className="text-xs text-slate-500">{pva.subject}</p>
                                <p className="mt-0.5 text-[10px] text-slate-600">
                                  {pva.status === 'neglected'
                                    ? `${Math.abs(pva.deviation).toFixed(0)}% abaixo. Redistribua tempo.`
                                    : `${pva.actualPercent.toFixed(0)}% de cobertura. Reduza intensidade.`}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      }
                      {selectedStats.planVsActual.filter((p) => p.status !== 'ok').length === 0 && (
                        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/[0.06] p-3">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <p className="text-xs text-emerald-300">Todas as matérias estão equilibradas!</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600">Configure as matérias para ver recomendações</p>
                  )}

                  <Link href="/analytics"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] py-2 text-xs text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-slate-200"
                  >
                    Abrir Análise Detalhada <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-white/[0.06]">
                <p className="text-sm text-slate-600">Selecione um edital para ver detalhes</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

        {/* ── Calendar Sync Section ── */}
        <div className="mt-6 px-6 pb-6">
          <CalendarSyncSection userId={user.uid} subjects={[...new Set(plans.flatMap((p) => p.subjects.map((s) => s.subject)))]} />
        </div>

      {/* PlanManager modal */}
      <PlanManager
        isOpen={planManagerOpen}
        userId={user.uid}
        editPlan={editingPlan}
        onClose={() => {
          setPlanManagerOpen(false);
          setEditingPlan(null);
          loadData();
        }}
      />
    </div>
  );
}
