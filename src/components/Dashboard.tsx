/**
 * Dashboard Principal — Multi-Edital
 * 
 * Suporta múltiplos planos de estudo (editais).
 * O PlanSelector no Header filtra todo o dashboard por planId.
 * "Todos os Planos" = visão agregada sem filtro.
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  getStudySummary,
  getHoursBySubject,
  getWeeklyHours,
  getRecentSessions,
  getStudyConsistency,
  setWeeklyGoal,
  setStudyPlan,
  getPlanVsActual,
  generateInsights,
  getFilteredSessions,
} from '@/lib/firebase/sessions';
import { getAccuracyAnalytics, getSubjectDeltaMap, AccuracyAnalytics } from '@/lib/firebase/questions';
import {
  createStudyPlan,
  getActivePlan,
  setActivePlan,
  migrateToMultiPlan,
  updateStudyPlan,
  deduplicateDefaultPlans,
} from '@/lib/firebase/plans';
import { getTodayISO } from '@/lib/utils';
import {
  StudySummary,
  SubjectHours,
  DailyHours,
  StudySession,
  StudyConsistency,
  SubjectWeight,
  PlanVsActual,
  StudyInsight,
  SubjectAccuracy,
  StudyPlanEdital,
} from '@/types';
import Header from './Header';
import SummaryCards from './SummaryCards';
import StudyTimer from './StudyTimer';
import SubjectRadarChart from './SubjectRadarChart';
import WeeklyBarChart from './WeeklyBarChart';
import RecentSessions from './RecentSessions';
import GoalAndStreakCard from './GoalAndStreakCard';
import StudyPlanCard from './StudyPlanCard';
import InsightsPanel from './InsightsPanel';
import SessionHistory from './SessionHistory';
import ActivityHeatmap from './ActivityHeatmap';
import DailySummaryCard from './DailySummaryCard';
import GeminiCoachCard from './GeminiCoachCard';
import MentorCard from './MentorCard';
import WeeklyMentoringCard from './WeeklyMentoringCard';
import QuestionTrackerCard from './QuestionTrackerCard';
import AccuracyChart from './AccuracyChart';
import DailyAiPlannerCard from './DailyAiPlannerCard';
import AiUsageSummaryCard from './AiUsageSummaryCard';
import ChatPanel from './ChatPanel';
import PostSessionToast from './PostSessionToast';
import PlanManager from '@/components/PlanManager';
import BenchmarkCard from './BenchmarkCard';
import Calendar from './Calendar';
import ScheduleModal from './ScheduleModal';
import { TrendingUp, MessageCircle, BookOpen, LayoutGrid, ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { isAdminIdentity } from '@/lib/admin';
import { useEntitlements } from '@/hooks/useEntitlements';
import { canCreateMorePlans, isUnlimited } from '@/lib/entitlements';
import { getDashboardLayoutPrefs, saveDashboardLayoutPrefs } from '@/lib/firebase/dashboard';

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.08, ease: 'easeOut' as const },
  }),
};

type DashboardSectionId =
  | 'daily-summary'
  | 'summary-cards'
  | 'study-timer'
  | 'subject-radar'
  | 'question-tracker'
  | 'accuracy-chart'
  | 'provas-simulados'
  | 'ai-daily-planner'
  | 'ai-telemetry'
  | 'weekly-bar'
  | 'recent-sessions'
  | 'activity-heatmap'
  | 'goal-streak'
  | 'study-plan'
  | 'insights'
  | 'gemini-coach'
  | 'mentor'
  | 'benchmark'
  | 'weekly-mentoring'
  | 'session-history'
  | 'calendar';

type DashboardSectionSize = 'full' | 'half';

const DASHBOARD_DEFAULT_ORDER: DashboardSectionId[] = [
  'daily-summary',
  'summary-cards',
  'study-timer',
  'subject-radar',
  'question-tracker',
  'accuracy-chart',
  'provas-simulados',
  'weekly-bar',
  'recent-sessions',
  'activity-heatmap',
  'goal-streak',
  'study-plan',
  'session-history',
  'calendar',
  'ai-daily-planner',
  'insights',
  'gemini-coach',
  'mentor',
  'benchmark',
  'weekly-mentoring',
  'ai-telemetry',
];

const DASHBOARD_SECTION_META: Record<
  DashboardSectionId,
  {
    label: string;
    description: string;
    defaultSize: DashboardSectionSize;
    allowedSizes: DashboardSectionSize[];
  }
> = {
  'daily-summary': {
    label: 'Resumo de Hoje',
    description: 'Síntese do dia com foco principal e pendências.',
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  'summary-cards': {
    label: 'Visão Geral',
    description: 'Totais de hoje, semana e mês.',
    defaultSize: 'full',
    allowedSizes: ['half', 'full'],
  },
  'study-timer': {
    label: 'Cronômetro',
    description: 'Controle principal de sessão de estudo.',
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  'subject-radar': {
    label: 'Radar de Matérias',
    description: 'Distribuição mensal por matéria.',
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  'question-tracker': {
    label: 'Registro de Questões',
    description: 'Registro manual de questões resolvidas.',
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  'accuracy-chart': {
    label: 'Taxa de Acerto',
    description: 'Evolução de desempenho por matéria.',
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  'provas-simulados': {
    label: 'Provas & Simulados',
    description: 'Atalho para prática e simulados.',
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  'ai-daily-planner': {
    label: 'Plano Diário IA',
    description: 'Plano sugerido para o dia.',
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  'ai-telemetry': {
    label: 'Telemetria IA',
    description: 'Painel técnico de consumo (admin).',
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  'weekly-bar': {
    label: 'Evolução Semanal',
    description: 'Horas estudadas por dia na semana.',
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  'recent-sessions': {
    label: 'Sessões Recentes',
    description: 'Últimas sessões registradas.',
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  'activity-heatmap': {
    label: 'Heatmap',
    description: 'Mapa anual de consistência e intensidade de estudo.',
    defaultSize: 'full',
    allowedSizes: ['half', 'full'],
  },
  'goal-streak': {
    label: 'Meta & Consistência',
    description: 'Meta semanal, progresso e streak.',
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  'study-plan': {
    label: 'Plano de Estudo',
    description: 'Planejado vs real por matéria.',
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  insights: {
    label: 'Insights',
    description: 'Alertas e pontos de atenção automáticos.',
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  'gemini-coach': {
    label: 'Coach IA',
    description: 'Resumo e ação sugerida para o momento.',
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  mentor: {
    label: 'Mentor AprovaMind',
    description: 'Mentoria contextual personalizada.',
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  benchmark: {
    label: 'Benchmark',
    description: 'Comparação de ritmo com base anônima.',
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  'weekly-mentoring': {
    label: 'Mentoria Semanal IA',
    description: 'Análise semanal consolidada com plano de melhoria.',
    defaultSize: 'half',
    allowedSizes: ['half', 'full'],
  },
  'session-history': {
    label: 'Histórico Completo',
    description: 'Filtro, edição e inclusão manual de sessões.',
    defaultSize: 'full',
    allowedSizes: ['half', 'full'],
  },
  calendar: {
    label: 'Calendário',
    description: 'Agenda de estudos e eventos.',
    defaultSize: 'full',
    allowedSizes: ['half', 'full'],
  },
};

interface DashboardLayoutState {
  order: DashboardSectionId[];
  hidden: DashboardSectionId[];
  sizes: Partial<Record<DashboardSectionId, DashboardSectionSize>>;
}

function sanitizeDashboardLayout(
  order: string[] | DashboardSectionId[] | undefined,
  hidden: string[] | DashboardSectionId[] | undefined,
  sizes: Record<string, string> | Record<DashboardSectionId, DashboardSectionSize> | undefined,
  availableSections: DashboardSectionId[]
): DashboardLayoutState {
  const availableSet = new Set(availableSections);

  const dedupedOrder: DashboardSectionId[] = [];
  for (const item of order || []) {
    const id = item as DashboardSectionId;
    if (!availableSet.has(id) || dedupedOrder.includes(id)) continue;
    dedupedOrder.push(id);
  }

  for (const id of availableSections) {
    if (!dedupedOrder.includes(id)) {
      dedupedOrder.push(id);
    }
  }

  const dedupedHidden: DashboardSectionId[] = [];
  for (const item of hidden || []) {
    const id = item as DashboardSectionId;
    if (!availableSet.has(id) || dedupedHidden.includes(id)) continue;
    dedupedHidden.push(id);
  }

  if (dedupedHidden.length >= dedupedOrder.length && dedupedOrder.length > 0) {
    dedupedHidden.pop();
  }

  const normalizedSizes: Partial<Record<DashboardSectionId, DashboardSectionSize>> = {};
  for (const id of dedupedOrder) {
    const allowedSizes = DASHBOARD_SECTION_META[id].allowedSizes;
    const defaultSize = DASHBOARD_SECTION_META[id].defaultSize;
    const raw = sizes?.[id];
    const normalized: DashboardSectionSize =
      raw === 'half' || raw === 'full' ? raw : defaultSize;

    normalizedSizes[id] = allowedSizes.includes(normalized) ? normalized : defaultSize;
  }

  return {
    order: dedupedOrder,
    hidden: dedupedHidden,
    sizes: normalizedSizes,
  };
}

export default function Dashboard() {
  const { user } = useAuthContext();

  // ---- Planos (multi-edital) ----
  const [plans, setPlans] = useState<StudyPlanEdital[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [planManagerOpen, setPlanManagerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<StudyPlanEdital | null>(null);
  const migrated = useRef(false);

  // ---- Dados do Dashboard ----
  const [summary, setSummary] = useState<StudySummary>({
    totalToday: 0,
    totalWeek: 0,
    totalMonth: 0,
  });
  const [subjectData, setSubjectData] = useState<SubjectHours[]>([]);
  const [weeklyData, setWeeklyData] = useState<DailyHours[]>([]);
  const [recentData, setRecentData] = useState<StudySession[]>([]);
  const [consistency, setConsistency] = useState<StudyConsistency | null>(null);
  const [planVsActual, setPlanVsActual] = useState<PlanVsActual[]>([]);
  const [planWeights, setPlanWeights] = useState<SubjectWeight[]>([]);
  const [insights, setInsights] = useState<StudyInsight[]>([]);
  const [todaySessions, setTodaySessions] = useState<StudySession[]>([]);
  const [accuracyData, setAccuracyData] = useState<SubjectAccuracy[]>([]);
  const [accuracyAnalytics, setAccuracyAnalytics] = useState<AccuracyAnalytics | null>(null);
  const [accuracyDelta, setAccuracyDelta] = useState<Record<string, number>>({});
  const [sessionsRefreshKey, setSessionsRefreshKey] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [lastSavedSession, setLastSavedSession] = useState<{ subject: string; duration: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingSessionPlan, setCreatingSessionPlan] = useState(false);
  const [planLimitNotice, setPlanLimitNotice] = useState<string | null>(null);
  const [sectionOrder, setSectionOrder] = useState<DashboardSectionId[]>(DASHBOARD_DEFAULT_ORDER);
  const [hiddenSections, setHiddenSections] = useState<DashboardSectionId[]>([]);
  const [sectionSizes, setSectionSizes] = useState<Partial<Record<DashboardSectionId, DashboardSectionSize>>>({});
  const [layoutEditorOpen, setLayoutEditorOpen] = useState(false);
  const [layoutDraft, setLayoutDraft] = useState<DashboardLayoutState | null>(null);
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const [draggingSectionId, setDraggingSectionId] = useState<DashboardSectionId | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<DashboardSectionId | null>(null);
  
  // ---- Estados do Calendário ----
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // ---- Plano ativo resolvido (para queries) ----
  const filterPlanId = activePlanId || undefined;
  const activePlanObj = plans.find((p) => p.id === activePlanId) || null;
  const { planTier, capabilities } = useEntitlements(user?.uid, user?.email);
  const canCreatePlan = canCreateMorePlans(planTier, plans.length);
  const canViewAiTelemetry = isAdminIdentity({
    uid: user?.uid,
    email: user?.email,
  });
  const availableSections = useMemo(
    () =>
      DASHBOARD_DEFAULT_ORDER.filter(
        (sectionId) => canViewAiTelemetry || sectionId !== 'ai-telemetry'
      ),
    [canViewAiTelemetry]
  );

  // ---- Migração + load de planos ----
  const loadPlans = useCallback(async () => {
    if (!user) return;
    try {
      // Migração idempotente (cria plano "Geral" se necessário)
      if (!migrated.current) {
        await migrateToMultiPlan(user.uid);
        migrated.current = true;
      }

      // Carrega planos e limpa duplicatas (se houver)
      const allPlans = await deduplicateDefaultPlans(user.uid);
      let active = await getActivePlan(user.uid);

      // Se o plano ativo foi removido na dedup, aponta pro default
      if (active && !allPlans.find((p) => p.id === active)) {
        const defaultPlan = allPlans.find((p) => p.isDefault);
        active = defaultPlan?.id || '';
        await setActivePlan(user.uid, active);
      }

      setPlans(allPlans);
      setActivePlanId(active || null);
    } catch (err) {
      console.warn('Erro ao carregar planos:', err);
    }
  }, [user]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // ---- Fetch de dados (com filtro por planId) ----
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      // Busca dados essenciais primeiro
      const [summaryRes, subjectsRes, weeklyRes, recentRes] = await Promise.all([
        getStudySummary(user.uid, filterPlanId),
        getHoursBySubject(user.uid, filterPlanId),
        getWeeklyHours(user.uid, filterPlanId),
        getRecentSessions(user.uid, 5, filterPlanId),
      ]);
      setSummary(summaryRes);
      setSubjectData(subjectsRes);
      setWeeklyData(weeklyRes);
      setRecentData(recentRes);

      // Questões — fetch separado e resiliente
      try {
        const analytics = await getAccuracyAnalytics(user.uid, filterPlanId);
        setAccuracyAnalytics(analytics);
        setAccuracyData(analytics.month);
        setAccuracyDelta(getSubjectDeltaMap(analytics.month, analytics.previousMonth));
      } catch (err) {
        console.warn('Erro ao carregar dados de questões:', err);
        setAccuracyAnalytics(null);
        setAccuracyData([]);
        setAccuracyDelta({});
      }

      // Sessões de hoje para o resumo diário
      const today = getTodayISO();
      const todayRes = await getFilteredSessions(user.uid, {
        dateFrom: today,
        dateTo: today,
        planId: filterPlanId,
      });
      setTodaySessions(todayRes);

      // Busca dados que dependem de user_stats / plano ativo
      try {
        // Se tem plano ativo, usa pesos e goal do plano
        const planGoalHours = activePlanObj?.weeklyGoalHours;
        const planSubjects = activePlanObj?.subjects;

        const [consistencyRes, pvaRes] = await Promise.all([
          getStudyConsistency(user.uid, filterPlanId, planGoalHours),
          getPlanVsActual(user.uid, filterPlanId, planSubjects),
        ]);
        setConsistency(consistencyRes);
        setPlanWeights(planSubjects || []);
        setPlanVsActual(pvaRes);

        // Gera insights
        const insightsRes = await generateInsights(user.uid, consistencyRes, pvaRes);
        setInsights(insightsRes);
      } catch (err) {
        console.warn('Erro ao carregar dados avançados:', err);
        const weeklyTotalSeconds = weeklyRes.reduce(
          (acc, d) => acc + Math.round(d.hours * 3600), 0
        );
        const defaultGoalHours = activePlanObj?.weeklyGoalHours || 10;
        setConsistency({
          currentStreak: 0,
          bestStreak: 0,
          daysStudiedThisWeek: weeklyRes.filter((d) => d.hours > 0).length,
          weeklyGoalHours: defaultGoalHours,
          weeklyTotalSeconds,
          weeklyProgressPercent: Math.min(100, Math.round((weeklyTotalSeconds / (defaultGoalHours * 3600)) * 100)),
          remainingSeconds: Math.max(0, defaultGoalHours * 3600 - weeklyTotalSeconds),
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }, [user, filterPlanId, activePlanObj]);

  useEffect(() => {
    if (plans.length > 0 || migrated.current) {
      fetchData();
    }
  }, [fetchData, plans.length]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const loadLayout = async () => {
      try {
        const saved = await getDashboardLayoutPrefs(user.uid);
        if (cancelled) return;

        const sanitized = sanitizeDashboardLayout(
          saved?.order || availableSections,
          saved?.hidden || [],
          saved?.sizes || {},
          availableSections
        );

        setSectionOrder(sanitized.order);
        setHiddenSections(sanitized.hidden);
        setSectionSizes(sanitized.sizes);
      } catch (error) {
        console.warn('Erro ao carregar layout da dashboard:', error);
        const fallback = sanitizeDashboardLayout(DASHBOARD_DEFAULT_ORDER, [], {}, availableSections);
        setSectionOrder(fallback.order);
        setHiddenSections(fallback.hidden);
        setSectionSizes(fallback.sizes);
      } finally {
        if (!cancelled) {
          setLayoutLoaded(true);
        }
      }
    };

    void loadLayout();

    return () => {
      cancelled = true;
    };
  }, [user, availableSections]);

  const currentLayout = useMemo(
    () => sanitizeDashboardLayout(sectionOrder, hiddenSections, sectionSizes, availableSections),
    [sectionOrder, hiddenSections, sectionSizes, availableSections]
  );

  const editingLayout = useMemo(() => {
    if (!layoutEditorOpen || !layoutDraft) return currentLayout;
    return sanitizeDashboardLayout(
      layoutDraft.order,
      layoutDraft.hidden,
      layoutDraft.sizes,
      availableSections
    );
  }, [layoutEditorOpen, layoutDraft, currentLayout, availableSections]);

  const getSectionOrderStyle = useCallback(
    (sectionId: DashboardSectionId) => {
      const index = editingLayout.order.indexOf(sectionId);
      return {
        order: index >= 0 ? index : editingLayout.order.length,
      };
    },
    [editingLayout.order]
  );

  const isSectionHidden = useCallback(
    (sectionId: DashboardSectionId) => editingLayout.hidden.includes(sectionId),
    [editingLayout.hidden]
  );

  const getSectionSize = useCallback(
    (sectionId: DashboardSectionId): DashboardSectionSize => {
      return editingLayout.sizes[sectionId] || DASHBOARD_SECTION_META[sectionId].defaultSize;
    },
    [editingLayout.sizes]
  );

  const reorderDraftSections = useCallback((sourceId: DashboardSectionId, targetId: DashboardSectionId) => {
    setLayoutDraft((prev) => {
      if (!prev || sourceId === targetId) return prev;
      const nextOrder = [...prev.order];
      const sourceIndex = nextOrder.indexOf(sourceId);
      const targetIndex = nextOrder.indexOf(targetId);

      if (sourceIndex < 0 || targetIndex < 0) {
        return prev;
      }

      nextOrder.splice(sourceIndex, 1);
      const adjustedTarget = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
      nextOrder.splice(adjustedTarget, 0, sourceId);
      return { ...prev, order: nextOrder };
    });
  }, []);

  const getSectionClassName = useCallback(
    (sectionId: DashboardSectionId, baseClassName: string) => {
      const hidden = isSectionHidden(sectionId);
      const sectionSize = getSectionSize(sectionId);
      const isDragging = draggingSectionId === sectionId;
      const isDropTarget = dragOverSectionId === sectionId;
      const isEditableVisible = layoutEditorOpen && !hidden;
      const spanClass = sectionSize === 'half' ? ' lg:col-span-1' : ' lg:col-span-2';

      return `${hidden ? 'hidden ' : ''}${baseClassName}${spanClass}${
        isEditableVisible ? ' cursor-move' : ''
      }${isDragging ? ' opacity-70' : ''}${
        isDropTarget ? ' ring-2 ring-violet-500/60 ring-offset-2 ring-offset-gray-950 rounded-2xl' : ''
      }`;
    },
    [isSectionHidden, getSectionSize, draggingSectionId, dragOverSectionId, layoutEditorOpen]
  );

  const getSectionDragProps = useCallback(
    (sectionId: DashboardSectionId) => {
      const hidden = isSectionHidden(sectionId);
      if (!layoutEditorOpen || hidden) {
        return {};
      }

      return {
        draggable: true,
        onDragStartCapture: (event: React.DragEvent<HTMLDivElement>) => {
          setDraggingSectionId(sectionId);
          setDragOverSectionId(null);
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', sectionId);
        },
        onDragOverCapture: (event: React.DragEvent<HTMLDivElement>) => {
          if (!draggingSectionId || draggingSectionId === sectionId) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setDragOverSectionId(sectionId);
        },
        onDropCapture: (event: React.DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          const sourceFromTransfer = event.dataTransfer.getData('text/plain') as DashboardSectionId;
          const sourceId = sourceFromTransfer || draggingSectionId;
          if (!sourceId || sourceId === sectionId) {
            setDragOverSectionId(null);
            return;
          }
          reorderDraftSections(sourceId, sectionId);
          setDragOverSectionId(null);
        },
        onDragEndCapture: () => {
          setDraggingSectionId(null);
          setDragOverSectionId(null);
        },
      };
    },
    [isSectionHidden, layoutEditorOpen, draggingSectionId, reorderDraftSections]
  );

  const openLayoutEditor = () => {
    setLayoutError(null);
    setDraggingSectionId(null);
    setDragOverSectionId(null);
    setLayoutDraft({
      order: [...currentLayout.order],
      hidden: [...currentLayout.hidden],
      sizes: { ...currentLayout.sizes },
    });
    setLayoutEditorOpen(true);
  };

  const closeLayoutEditor = () => {
    setLayoutError(null);
    setLayoutEditorOpen(false);
    setLayoutDraft(null);
    setDraggingSectionId(null);
    setDragOverSectionId(null);
  };

  const moveDraftSection = (sectionId: DashboardSectionId, direction: 'up' | 'down') => {
    setLayoutDraft((prev) => {
      if (!prev) return prev;
      const nextOrder = [...prev.order];
      const index = nextOrder.indexOf(sectionId);
      if (index < 0) return prev;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= nextOrder.length) return prev;

      [nextOrder[index], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[index]];
      return { ...prev, order: nextOrder };
    });
  };

  const toggleDraftSectionVisibility = (sectionId: DashboardSectionId) => {
    setLayoutDraft((prev) => {
      if (!prev) return prev;
      const isHidden = prev.hidden.includes(sectionId);

      if (!isHidden) {
        const visibleCount = prev.order.length - prev.hidden.length;
        if (visibleCount <= 1) {
          return prev;
        }
        return { ...prev, hidden: [...prev.hidden, sectionId] };
      }

      return {
        ...prev,
        hidden: prev.hidden.filter((id) => id !== sectionId),
      };
    });
  };

  const toggleDraftSectionSize = (sectionId: DashboardSectionId) => {
    setLayoutDraft((prev) => {
      if (!prev) return prev;
      const allowed = DASHBOARD_SECTION_META[sectionId].allowedSizes;
      if (allowed.length <= 1) return prev;

      const currentSize = prev.sizes[sectionId] || DASHBOARD_SECTION_META[sectionId].defaultSize;
      const currentIndex = allowed.indexOf(currentSize);
      const nextSize = allowed[(currentIndex + 1) % allowed.length];

      return {
        ...prev,
        sizes: {
          ...prev.sizes,
          [sectionId]: nextSize,
        },
      };
    });
  };

  const resetDraftLayout = () => {
    setLayoutDraft({
      order: [...availableSections],
      hidden: [],
      sizes: sanitizeDashboardLayout(availableSections, [], {}, availableSections).sizes,
    });
    setLayoutError(null);
  };

  const saveLayout = async () => {
    if (!user || !layoutDraft) return;

    const nextLayout = sanitizeDashboardLayout(
      layoutDraft.order,
      layoutDraft.hidden,
      layoutDraft.sizes,
      availableSections
    );

    setLayoutSaving(true);
    setLayoutError(null);

    try {
      await saveDashboardLayoutPrefs(user.uid, {
        order: nextLayout.order,
        hidden: nextLayout.hidden,
        sizes: nextLayout.sizes,
      });
      setSectionOrder(nextLayout.order);
      setHiddenSections(nextLayout.hidden);
      setSectionSizes(nextLayout.sizes);
      closeLayoutEditor();
    } catch (error) {
      console.error('Erro ao salvar layout da dashboard:', error);
      setLayoutError('Não foi possível salvar agora. Tente novamente.');
    } finally {
      setLayoutSaving(false);
    }
  };

  // ---- Handlers ----
  const handleSelectPlan = async (planId: string | null) => {
    if (!user) return;
    setActivePlanId(planId);
    setLoading(true);
    await setActivePlan(user.uid, planId);
  };

  const handleSessionSaved = async (session: { subject: string; duration: number }) => {
    setLastSavedSession(session);
    await fetchData();
    setSessionsRefreshKey((prev) => prev + 1);
    
    // Atualiza benchmark do usuário
    if (user && consistency?.weeklyGoalHours && consistency.weeklyTotalSeconds) {
      try {
        const { saveUserBenchmark } = await import('@/lib/firebase/benchmarks');
        await saveUserBenchmark(
          user.uid,
          consistency.weeklyGoalHours,
          consistency.weeklyTotalSeconds / 3600
        );
      } catch (error) {
        console.warn('Error updating benchmark:', error);
      }
    }
  };

  const handleSaveGoal = async (hours: number) => {
    if (!user) return;
    // Se tem plano ativo, salva no plano; senão, salva global
    if (activePlanObj?.id) {
      await updateStudyPlan(activePlanObj.id, { weeklyGoalHours: hours });
      await loadPlans();
    } else {
      await setWeeklyGoal(user.uid, hours);
    }
    await fetchData();
  };

  const handleSavePlan = async (subjects: SubjectWeight[]) => {
    if (!user) return;
    // Se tem plano ativo, salva no plano; senão, salva global
    if (activePlanObj?.id) {
      await updateStudyPlan(activePlanObj.id, { subjects });
      await loadPlans();
    } else {
      await setStudyPlan(user.uid, subjects);
    }
    await fetchData();
  };

  const handlePlanManagerClose = () => {
    setPlanManagerOpen(false);
    setEditingPlan(null);
    loadPlans().then(() => fetchData());
  };

  const handleCreateSessionPlan = async () => {
    if (!user || creatingSessionPlan) return;
    if (!canCreatePlan) {
      setPlanLimitNotice('Seu plano atual atingiu o limite de sessões/editais. Faça upgrade para criar mais.');
      return;
    }
    setCreatingSessionPlan(true);
    try {
      const baseName = 'Sessão Livre';
      const existing = plans
        .map((p) => p.name)
        .filter((name) => name === baseName || name.startsWith(`${baseName} `));
      const name = existing.length === 0 ? baseName : `${baseName} ${existing.length + 1}`;

      const planId = await createStudyPlan(user.uid, {
        name,
        subjects: [],
        weeklyGoalHours: 10,
        color: '#06b6d4',
        isDefault: false,
      });

      await setActivePlan(user.uid, planId);
      await loadPlans();
      setActivePlanId(planId);
      setLoading(true);
      await fetchData();
    } catch (err) {
      console.error('Erro ao criar sessão livre:', err);
    } finally {
      setCreatingSessionPlan(false);
    }
  };

  if (!user) return null;

  const handleSessionsChanged = async () => {
    await fetchData();
    setSessionsRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Header
        plans={plans}
        activePlanId={activePlanId}
        onSelectPlan={handleSelectPlan}
        onCreatePlan={() => {
          if (!canCreatePlan) {
            setPlanLimitNotice('Seu plano atual atingiu o limite de sessões/editais. Faça upgrade para continuar.');
            return;
          }
          setEditingPlan(null);
          setPlanManagerOpen(true);
        }}
        onEditPlan={(plan) => {
          setEditingPlan(plan);
          setPlanManagerOpen(true);
        }}
        onDeletePlan={(planId: string) => {
          // Atualiza lista local após exclusão
          setPlans((prev) => prev.filter((p) => p.id !== planId));
          // Se o plano ativo foi deletado, reseta para "Todos"
          if (activePlanId === planId) {
            setActivePlanId(null);
          }
        }}
      />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Saudação */}
        <motion.div
          custom={0}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Olá, {user.displayName?.split(' ')[0] || 'Estudante'} 👋
          </h2>
          <p className="mt-1 text-gray-400">
            {activePlanObj
              ? <>Focando em <span className="font-medium text-white" style={{ color: activePlanObj.color }}>{activePlanObj.name}</span></>
              : 'Acompanhe seu progresso e mantenha a consistência nos estudos.'}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Plano atual: <span className="uppercase text-gray-300">{planTier}</span>
            {!isUnlimited(capabilities.maxStudyPlans) && (
              <>
                {' '}· Editais: <span className="text-gray-300">{plans.length}/{capabilities.maxStudyPlans}</span>
              </>
            )}
          </p>
          {planLimitNotice && (
            <div className="mt-3 inline-flex items-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
              {planLimitNotice}
            </div>
          )}
        </motion.div>

        <motion.div
          custom={0.5}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mb-6 flex items-center justify-between gap-3"
        >
          <p className="text-xs text-gray-500">
            {layoutLoaded
              ? 'Ajuste os blocos conforme seu fluxo de estudo.'
              : 'Carregando preferências de layout...'}
          </p>
          <button
            onClick={openLayoutEditor}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-gray-900/60 px-3 py-2 text-xs text-gray-300 transition hover:border-violet-500/40 hover:text-violet-200"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Personalizar painel
          </button>
        </motion.div>

        {layoutEditorOpen && layoutDraft && (
          <motion.div
            custom={0.6}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            className="mb-6 rounded-2xl border border-white/10 bg-gray-900/70 p-4 shadow-xl"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white">Editar Dashboard</h3>
                <p className="text-xs text-gray-500">Mostre/oculte e reorganize os blocos.</p>
                <p className="text-xs text-violet-300/90">Dica: arraste os blocos na área principal enquanto este modo estiver aberto.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={resetDraftLayout}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-300 transition hover:border-white/20 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Padrão
                </button>
                <button
                  onClick={closeLayoutEditor}
                  disabled={layoutSaving}
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-300 transition hover:border-white/20 hover:text-white disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveLayout}
                  disabled={layoutSaving}
                  className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-violet-500 disabled:opacity-60"
                >
                  {layoutSaving ? 'Salvando...' : 'Salvar layout'}
                </button>
              </div>
            </div>

            {layoutError && (
              <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {layoutError}
              </div>
            )}

            <div className="space-y-2">
              {editingLayout.order.map((sectionId, index) => {
                const hidden = editingLayout.hidden.includes(sectionId);
                const sectionSize = editingLayout.sizes[sectionId] || DASHBOARD_SECTION_META[sectionId].defaultSize;
                const canResize = DASHBOARD_SECTION_META[sectionId].allowedSizes.length > 1;
                const canMoveUp = index > 0;
                const canMoveDown = index < editingLayout.order.length - 1;

                return (
                  <div
                    key={sectionId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{DASHBOARD_SECTION_META[sectionId].label}</p>
                      <p className="truncate text-xs text-gray-500">{DASHBOARD_SECTION_META[sectionId].description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveDraftSection(sectionId, 'up')}
                        disabled={!canMoveUp || layoutSaving}
                        className="rounded-md border border-white/10 p-1 text-gray-300 transition hover:border-white/20 hover:text-white disabled:opacity-40"
                        title="Mover para cima"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveDraftSection(sectionId, 'down')}
                        disabled={!canMoveDown || layoutSaving}
                        className="rounded-md border border-white/10 p-1 text-gray-300 transition hover:border-white/20 hover:text-white disabled:opacity-40"
                        title="Mover para baixo"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => toggleDraftSectionVisibility(sectionId)}
                        disabled={layoutSaving}
                        className={`rounded-md border p-1 transition ${
                          hidden
                            ? 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                            : 'border-violet-500/50 text-violet-200 hover:bg-violet-500/10'
                        }`}
                        title={hidden ? 'Mostrar bloco' : 'Ocultar bloco'}
                      >
                        {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => toggleDraftSectionSize(sectionId)}
                        disabled={!canResize || layoutSaving}
                        className={`min-w-[40px] rounded-md border px-1.5 py-1 text-[10px] transition ${
                          canResize
                            ? 'border-white/10 text-gray-200 hover:border-white/20 hover:text-white'
                            : 'border-white/5 text-gray-500 opacity-60'
                        }`}
                        title={canResize ? 'Alternar tamanho do bloco' : 'Tamanho fixo para este bloco'}
                      >
                        {sectionSize === 'half' ? '1/2' : '1/1'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        <div className={`grid items-start gap-6 lg:grid-cols-2 ${layoutEditorOpen ? 'rounded-2xl border border-dashed border-violet-500/30 p-2 sm:p-3' : ''}`}>
          <motion.div
            custom={1}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            {...getSectionDragProps('daily-summary')}
            style={getSectionOrderStyle('daily-summary')}
            className={getSectionClassName('daily-summary', '')}
          >
            <DailySummaryCard
              todaySessions={todaySessions}
              totalTodaySeconds={summary.totalToday}
              planVsActual={planVsActual}
              loading={loading}
            />
          </motion.div>

          <motion.div
            custom={2}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            {...getSectionDragProps('summary-cards')}
            style={getSectionOrderStyle('summary-cards')}
            className={getSectionClassName('summary-cards', '')}
          >
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-violet-400" />
              <h3 className="text-lg font-semibold text-white">Visão Geral</h3>
            </div>
            <SummaryCards summary={summary} loading={loading} />
          </motion.div>

          <motion.div
            custom={3}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            {...getSectionDragProps('study-timer')}
            style={getSectionOrderStyle('study-timer')}
            className={getSectionClassName('study-timer', '')}
          >
            <StudyTimer
              key={activePlanId || 'all-plans'}
              userId={user.uid}
              plans={plans}
              activePlanId={activePlanId}
              onSessionSaved={handleSessionSaved}
              onCreateSession={handleCreateSessionPlan}
              onCreateEdital={() => {
                if (!canCreatePlan) {
                  setPlanLimitNotice('Seu plano atual atingiu o limite de sessões/editais. Faça upgrade para continuar.');
                  return;
                }
                setEditingPlan(null);
                setPlanManagerOpen(true);
              }}
              creatingSession={creatingSessionPlan}
            />
          </motion.div>

          <motion.div
            custom={4}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            {...getSectionDragProps('subject-radar')}
            style={getSectionOrderStyle('subject-radar')}
            className={getSectionClassName('subject-radar', '')}
          >
            <SubjectRadarChart data={subjectData} loading={loading} />
          </motion.div>

          <motion.div
            custom={5}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            {...getSectionDragProps('question-tracker')}
            style={getSectionOrderStyle('question-tracker')}
            className={getSectionClassName('question-tracker', '')}
          >
            <QuestionTrackerCard
              userId={user.uid}
              planId={activePlanId || undefined}
              planSubjects={activePlanObj?.subjects}
              lastSessionSubject={lastSavedSession?.subject ?? (recentData[0]?.subject || null)}
              onSaved={fetchData}
            />
          </motion.div>

          <motion.div
            custom={6}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            {...getSectionDragProps('accuracy-chart')}
            style={getSectionOrderStyle('accuracy-chart')}
            className={getSectionClassName('accuracy-chart', '')}
          >
            <AccuracyChart
              data={accuracyData}
              analytics={accuracyAnalytics}
              deltaBySubject={accuracyDelta}
              loading={loading}
            />
          </motion.div>

          <motion.div
            custom={7}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            {...getSectionDragProps('provas-simulados')}
            style={getSectionOrderStyle('provas-simulados')}
            className={getSectionClassName('provas-simulados', '')}
          >
            <Link href="/provas">
              <div className="group relative overflow-hidden rounded-2xl border border-gray-700 bg-gradient-to-br from-violet-900/20 to-blue-900/20 p-6 transition-all hover:border-violet-500 hover:shadow-lg hover:shadow-violet-500/20">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <BookOpen className="h-6 w-6 text-violet-400" />
                      <h3 className="text-xl font-semibold text-white">Provas & Simulados</h3>
                    </div>
                    <p className="mb-4 text-sm text-gray-400">
                      Pratique com provas oficiais, crie simulados personalizados e teste seus conhecimentos
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
                        Provas Oficiais
                      </span>
                      <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                        Simulados
                      </span>
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                        Treino Rápido
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 opacity-50 transition-opacity group-hover:opacity-100">
                    <TrendingUp className="h-8 w-8 text-violet-400" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div
            custom={8}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            {...getSectionDragProps('weekly-bar')}
            style={getSectionOrderStyle('weekly-bar')}
            className={getSectionClassName('weekly-bar', '')}
          >
            <WeeklyBarChart data={weeklyData} loading={loading} />
          </motion.div>

          <motion.div
            custom={9}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            {...getSectionDragProps('recent-sessions')}
            style={getSectionOrderStyle('recent-sessions')}
            className={getSectionClassName('recent-sessions', '')}
          >
            <RecentSessions sessions={recentData} loading={loading} />
          </motion.div>

          <motion.div
            custom={10}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            {...getSectionDragProps('activity-heatmap')}
            style={getSectionOrderStyle('activity-heatmap')}
            className={getSectionClassName('activity-heatmap', '')}
          >
            <ActivityHeatmap
              userId={user.uid}
              planId={filterPlanId}
              refreshKey={sessionsRefreshKey}
            />
          </motion.div>

          <motion.div
            custom={11}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            {...getSectionDragProps('goal-streak')}
            style={getSectionOrderStyle('goal-streak')}
            className={getSectionClassName('goal-streak', '')}
          >
            <GoalAndStreakCard
              data={consistency}
              loading={loading}
              onSaveGoal={handleSaveGoal}
            />
          </motion.div>

          <motion.div
            custom={12}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            {...getSectionDragProps('study-plan')}
            style={getSectionOrderStyle('study-plan')}
            className={getSectionClassName('study-plan', '')}
          >
            <StudyPlanCard
              planVsActual={planVsActual}
              currentWeights={planWeights}
              loading={loading}
              onSavePlan={handleSavePlan}
            />
          </motion.div>

          <motion.div
            custom={13}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            {...getSectionDragProps('session-history')}
            style={getSectionOrderStyle('session-history')}
            className={getSectionClassName('session-history', '')}
          >
            <SessionHistory
              userId={user.uid}
              planId={filterPlanId}
              onSessionsChanged={handleSessionsChanged}
            />
          </motion.div>

          <motion.div
            custom={14}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            {...getSectionDragProps('calendar')}
            style={getSectionOrderStyle('calendar')}
            className={getSectionClassName('calendar', '')}
          >
            {capabilities.canUseCalendar ? (
              <Calendar
                userId={user.uid}
                planId={filterPlanId}
                onDateClick={(date) => {
                  setSelectedDate(date);
                  setScheduleModalOpen(true);
                }}
                onEventClick={(event) => {
                  console.log('Event clicked:', event);
                }}
                loading={loading}
              />
            ) : (
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-6">
                <h3 className="text-lg font-semibold text-white">Calendário avançado</h3>
                <p className="mt-2 text-sm text-blue-100/90">
                  Disponível nos planos Pro e Premium para organizar sessões com agenda mensal.
                </p>
              </div>
            )}
          </motion.div>

          <motion.div
            custom={15}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            {...getSectionDragProps('ai-daily-planner')}
            style={getSectionOrderStyle('ai-daily-planner')}
            className={getSectionClassName('ai-daily-planner', '')}
          >
            <DailyAiPlannerCard
              userId={user.uid}
              userName={user.displayName?.split(' ')[0] || 'Estudante'}
              activePlanName={activePlanObj?.name || null}
              consistency={consistency}
              subjectHours={subjectData}
              planVsActual={planVsActual}
              accuracyData={accuracyData}
              totalTodaySeconds={summary.totalToday}
            />
          </motion.div>

          <motion.div
            custom={16}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            {...getSectionDragProps('insights')}
            style={getSectionOrderStyle('insights')}
            className={getSectionClassName('insights', '')}
          >
            <InsightsPanel insights={insights} loading={loading} />
          </motion.div>

          <motion.div
            custom={17}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            {...getSectionDragProps('gemini-coach')}
            style={getSectionOrderStyle('gemini-coach')}
            className={getSectionClassName('gemini-coach', '')}
          >
            <GeminiCoachCard
              consistency={consistency}
              subjectHours={subjectData}
              planVsActual={planVsActual}
              totalTodaySeconds={summary.totalToday}
              onOpenChat={() => setChatOpen(true)}
              loading={loading}
            />
          </motion.div>

          <motion.div
            custom={18}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            {...getSectionDragProps('mentor')}
            style={getSectionOrderStyle('mentor')}
            className={getSectionClassName('mentor', '')}
          >
            <MentorCard
              userName={user.displayName?.split(' ')[0] || 'Estudante'}
              consistency={consistency}
              subjectHours={subjectData}
              planVsActual={planVsActual}
              totalTodaySeconds={summary.totalToday}
              todayDominantSubject={
                todaySessions.length > 0
                  ? [...todaySessions].sort((a, b) => b.duration - a.duration)[0].subject
                  : null
              }
              weeklyData={weeklyData}
              recentSessions={recentData}
              accuracyData={accuracyData}
              activePlanName={activePlanObj?.name || null}
              loading={loading}
            />
          </motion.div>

          <motion.div
            custom={19}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            {...getSectionDragProps('benchmark')}
            style={getSectionOrderStyle('benchmark')}
            className={getSectionClassName('benchmark', '')}
          >
            <BenchmarkCard
              weeklyGoalHours={consistency?.weeklyGoalHours || 0}
              weeklyHours={consistency?.weeklyTotalSeconds ? consistency.weeklyTotalSeconds / 3600 : 0}
              userId={user.uid}
              loading={loading}
            />
          </motion.div>

          <motion.div
            custom={20}
            variants={sectionVariants}
            initial="hidden"
            animate="show"
            {...getSectionDragProps('weekly-mentoring')}
            style={getSectionOrderStyle('weekly-mentoring')}
            className={getSectionClassName('weekly-mentoring', '')}
          >
            <WeeklyMentoringCard
              userId={user.uid}
              planId={filterPlanId}
              userName={user.displayName?.split(' ')[0] || 'Estudante'}
              consistency={consistency}
              subjectHours={subjectData}
              planVsActual={planVsActual}
              weeklyData={weeklyData}
              recentSessions={recentData}
              accuracyData={accuracyData}
              activePlanName={activePlanObj?.name || null}
              loading={loading}
            />
          </motion.div>

          {canViewAiTelemetry && (
            <motion.div
              custom={21}
              variants={sectionVariants}
              initial="hidden"
              animate="show"
              {...getSectionDragProps('ai-telemetry')}
              style={getSectionOrderStyle('ai-telemetry')}
              className={getSectionClassName('ai-telemetry', '')}
            >
              <AiUsageSummaryCard userId={user.uid} />
            </motion.div>
          )}
        </div>
      </main>

      {/* Botão flutuante do Chat */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 200 }}
        onClick={() => setChatOpen(true)}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 shadow-xl shadow-violet-500/25 transition-all hover:shadow-violet-500/40 hover:brightness-110 sm:bottom-6 sm:right-6"
        title="Conversar com o Coach IA"
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </motion.button>

      {/* Toast pós-sessão */}
      <PostSessionToast
        session={lastSavedSession}
        context={consistency ? {
          userName: user.displayName?.split(' ')[0] || 'Estudante',
          weeklyProgressPercent: consistency.weeklyProgressPercent,
          currentStreak: consistency.currentStreak,
          weeklyGoalHours: consistency.weeklyGoalHours,
          weeklyTotalHours: consistency.weeklyTotalSeconds / 3600,
        } : null}
        onDismiss={() => setLastSavedSession(null)}
      />

      {/* Painel de Chat */}
      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        userName={user.displayName?.split(' ')[0] || 'Estudante'}
        consistency={consistency}
        subjectHours={subjectData}
        planVsActual={planVsActual}
        todaySessions={todaySessions}
        totalTodaySeconds={summary.totalToday}
        weeklyData={weeklyData}
        recentSessions={recentData}
      />

      {/* PlanManager (modal CRUD de editais) */}
      <PlanManager
        isOpen={planManagerOpen}
        userId={user.uid}
        editPlan={editingPlan}
        onClose={handlePlanManagerClose}
      />

      {/* ScheduleModal (agendar sessões) */}
      <ScheduleModal
        isOpen={scheduleModalOpen && capabilities.canUseCalendar}
        onClose={() => {
          setScheduleModalOpen(false);
          setSelectedDate(null);
        }}
        selectedDate={selectedDate || undefined}
        userId={user.uid}
        planId={filterPlanId}
        subjects={activePlanObj?.subjects?.map(s => s.subject) || []}
      />
    </div>
  );
}
