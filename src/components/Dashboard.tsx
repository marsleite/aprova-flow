/**
 * Dashboard Principal — Multi-Edital
 * 
 * Suporta múltiplos planos de estudo (editais).
 * O PlanSelector no Header filtra todo o dashboard por planId.
 * "Todos os Planos" = visão agregada sem filtro.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { getAccuracyBySubject } from '@/lib/firebase/questions';
import {
  getStudyPlans,
  getActivePlan,
  setActivePlan,
  migrateToMultiPlan,
  updateStudyPlan,
  deduplicateDefaultPlans,
} from '@/lib/firebase/plans';
import { getTodayISO } from '@/lib/utils';
import { CalendarEvent } from '@/lib/firebase/calendar';
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
import ChatPanel from './ChatPanel';
import PostSessionToast from './PostSessionToast';
import PlanManager from '@/components/PlanManager';
import BenchmarkCard from './BenchmarkCard';
import Calendar from './Calendar';
import ScheduleModal from './ScheduleModal';
import { TrendingUp, MessageCircle } from 'lucide-react';

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.08, ease: 'easeOut' as const },
  }),
};

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
  const [chatOpen, setChatOpen] = useState(false);
  const [lastSavedSession, setLastSavedSession] = useState<{ subject: string; duration: number } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ---- Estados do Calendário ----
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // ---- Plano ativo resolvido (para queries) ----
  const filterPlanId = activePlanId || undefined;
  const activePlanObj = plans.find((p) => p.id === activePlanId) || null;

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
      let allPlans = await deduplicateDefaultPlans(user.uid);
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
        const accuracyRes = await getAccuracyBySubject(user.uid, filterPlanId);
        setAccuracyData(accuracyRes);
      } catch (err) {
        console.warn('Erro ao carregar dados de questões:', err);
        setAccuracyData([]);
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-950">
      <Header
        plans={plans}
        activePlanId={activePlanId}
        onSelectPlan={handleSelectPlan}
        onCreatePlan={() => {
          setEditingPlan(null);
          setPlanManagerOpen(true);
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
        </motion.div>

        {/* Resumo Diário */}
        <motion.div
          custom={1}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mb-6"
        >
          <DailySummaryCard
            todaySessions={todaySessions}
            totalTodaySeconds={summary.totalToday}
            planVsActual={planVsActual}
            loading={loading}
          />
        </motion.div>

        {/* Cards de Resumo */}
        <motion.div
          custom={2}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mb-8"
        >
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-violet-400" />
            <h3 className="text-lg font-semibold text-white">Visão Geral</h3>
          </div>
          <SummaryCards summary={summary} loading={loading} />
        </motion.div>

        {/* Linha 1: Cronômetro + Radar */}
        <motion.div
          custom={3}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mb-6 grid gap-6 lg:grid-cols-2"
        >
          <StudyTimer
            userId={user.uid}
            plans={plans}
            activePlanId={activePlanId}
            onSessionSaved={handleSessionSaved}
          />
          <SubjectRadarChart data={subjectData} loading={loading} />
        </motion.div>

        {/* Linha 1.5: Questões + Taxa de Acerto */}
        <motion.div
          custom={4}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mb-6 grid gap-6 lg:grid-cols-2"
        >
          <QuestionTrackerCard
            userId={user.uid}
            planId={activePlanId || undefined}
            planSubjects={activePlanObj?.subjects}
            lastSessionSubject={lastSavedSession?.subject ?? (recentData[0]?.subject || null)}
            onSaved={fetchData}
          />
          <AccuracyChart data={accuracyData} loading={loading} />
        </motion.div>

        {/* Linha 2: Barras Semanal + Histórico */}
        <motion.div
          custom={5}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="grid gap-6 lg:grid-cols-2"
        >
          <WeeklyBarChart data={weeklyData} loading={loading} />
          <RecentSessions sessions={recentData} loading={loading} />
        </motion.div>

        {/* Linha 2.5: Heatmap de Atividade */}
        <motion.div
          custom={6}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mt-6"
        >
          <ActivityHeatmap userId={user.uid} planId={filterPlanId} />
        </motion.div>

        {/* Linha 3: Meta + Plano de Estudo */}
        <motion.div
          custom={7}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mt-6 grid gap-6 lg:grid-cols-2"
        >
          <GoalAndStreakCard
            data={consistency}
            loading={loading}
            onSaveGoal={handleSaveGoal}
          />
          <StudyPlanCard
            planVsActual={planVsActual}
            currentWeights={planWeights}
            loading={loading}
            onSavePlan={handleSavePlan}
          />
        </motion.div>

        {/* Linha 4: Insights + Coach IA */}
        <motion.div
          custom={8}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mt-6 grid gap-6 lg:grid-cols-2"
        >
          <InsightsPanel insights={insights} loading={loading} />
          <GeminiCoachCard
            consistency={consistency}
            subjectHours={subjectData}
            planVsActual={planVsActual}
            totalTodaySeconds={summary.totalToday}
            onOpenChat={() => setChatOpen(true)}
            loading={loading}
          />
        </motion.div>

        {/* Linha 4.5: Mentor AprovaMind */}
        <motion.div
          custom={9}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mt-6 grid gap-6 lg:grid-cols-2"
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
          <BenchmarkCard
            weeklyGoalHours={consistency?.weeklyGoalHours || 0}
            weeklyHours={consistency?.weeklyTotalSeconds ? consistency.weeklyTotalSeconds / 3600 : 0}
            userId={user.uid}
            loading={loading}
          />
        </motion.div>

        {/* Linha 4.6: Mentoria Semanal (IA, 1x/semana com cache) */}
        <motion.div
          custom={10}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mt-6"
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

        {/* Linha 5: Histórico Completo */}
        <motion.div
          custom={11}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mt-6"
        >
          <SessionHistory userId={user.uid} planId={filterPlanId} />
        </motion.div>

        {/* Linha 6: Calendário */}
        <motion.div
          custom={12}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mt-6"
        >
          <Calendar
            userId={user.uid}
            planId={filterPlanId}
            onDateClick={(date) => {
              setSelectedDate(date);
              setScheduleModalOpen(true);
            }}
            onEventClick={(event) => {
              // TODO: Implementar modal de edição/visualização de evento
              console.log('Event clicked:', event);
            }}
            loading={loading}
          />
        </motion.div>
      </main>

      {/* Botão flutuante do Chat */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 200 }}
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 shadow-xl shadow-violet-500/25 transition-all hover:shadow-violet-500/40 hover:brightness-110"
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
        isOpen={scheduleModalOpen}
        onClose={() => {
          setScheduleModalOpen(false);
          setSelectedDate(null);
        }}
        selectedDate={selectedDate || undefined}
        userId={user.uid}
        planId={filterPlanId}
        subjects={activePlanObj?.subjects?.map(s => s.subject) || []}
        onEventCreated={(event) => {
          setCalendarEvents(prev => [...prev, event]);
        }}
      />
    </div>
  );
}
