/**
 * Dashboard Principal — Layout Upgrade
 * 
 * Grid sofisticado com animações staggered:
 * [Cards de Resumo - 3 colunas]
 * [Cronômetro] [Radar por Matéria]
 * [Barras Semanal] [Histórico Sessões]
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  getStudySummary,
  getHoursBySubject,
  getWeeklyHours,
  getRecentSessions,
  getStudyConsistency,
  setWeeklyGoal,
  getStudyPlan,
  setStudyPlan,
  getPlanVsActual,
  generateInsights,
  getFilteredSessions,
} from '@/lib/firebase/sessions';
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
import DailySummaryCard from './DailySummaryCard';
import { TrendingUp } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      // Busca dados essenciais primeiro
      const [summaryRes, subjectsRes, weeklyRes, recentRes] = await Promise.all([
        getStudySummary(user.uid),
        getHoursBySubject(user.uid),
        getWeeklyHours(user.uid),
        getRecentSessions(user.uid, 5),
      ]);
      setSummary(summaryRes);
      setSubjectData(subjectsRes);
      setWeeklyData(weeklyRes);
      setRecentData(recentRes);

      // Sessões de hoje para o resumo diário
      const today = getTodayISO();
      const todayRes = await getFilteredSessions(user.uid, { dateFrom: today, dateTo: today });
      setTodaySessions(todayRes);

      // Busca dados que dependem de user_stats (pode falhar se regras não atualizadas)
      try {
        const [consistencyRes, planRes, pvaRes] = await Promise.all([
          getStudyConsistency(user.uid),
          getStudyPlan(user.uid),
          getPlanVsActual(user.uid),
        ]);
        setConsistency(consistencyRes);
        setPlanWeights(planRes.subjects);
        setPlanVsActual(pvaRes);

        // Gera insights
        const insightsRes = await generateInsights(user.uid, consistencyRes, pvaRes);
        setInsights(insightsRes);
      } catch (err) {
        console.warn('Erro ao carregar dados avançados (atualize as regras do Firestore):', err);
        const weeklyTotalSeconds = weeklyRes.reduce(
          (acc, d) => acc + Math.round(d.hours * 3600), 0
        );
        const defaultGoalHours = 10;
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
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSessionSaved = () => {
    fetchData();
  };

  const handleSaveGoal = async (hours: number) => {
    if (!user) return;
    await setWeeklyGoal(user.uid, hours);
    await fetchData();
  };

  const handleSavePlan = async (subjects: SubjectWeight[]) => {
    if (!user) return;
    await setStudyPlan(user.uid, subjects);
    await fetchData();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

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
            Acompanhe seu progresso e mantenha a consistência nos estudos.
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
          <StudyTimer userId={user.uid} onSessionSaved={handleSessionSaved} />
          <SubjectRadarChart data={subjectData} loading={loading} />
        </motion.div>

        {/* Linha 2: Barras Semanal + Histórico */}
        <motion.div
          custom={4}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="grid gap-6 lg:grid-cols-2"
        >
          <WeeklyBarChart data={weeklyData} loading={loading} />
          <RecentSessions sessions={recentData} loading={loading} />
        </motion.div>

        {/* Linha 3: Meta + Plano de Estudo */}
        <motion.div
          custom={5}
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

        {/* Linha 4: Insights */}
        <motion.div
          custom={6}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mt-6"
        >
          <InsightsPanel insights={insights} loading={loading} />
        </motion.div>

        {/* Linha 5: Histórico Completo */}
        <motion.div
          custom={7}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="mt-6"
        >
          <SessionHistory userId={user.uid} />
        </motion.div>
      </main>
    </div>
  );
}
