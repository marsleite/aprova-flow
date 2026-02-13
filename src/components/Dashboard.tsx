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
} from '@/lib/firebase/sessions';
import { StudySummary, SubjectHours, DailyHours, StudySession } from '@/types';
import Header from './Header';
import SummaryCards from './SummaryCards';
import StudyTimer from './StudyTimer';
import SubjectRadarChart from './SubjectRadarChart';
import WeeklyBarChart from './WeeklyBarChart';
import RecentSessions from './RecentSessions';
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
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
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

        {/* Cards de Resumo */}
        <motion.div
          custom={1}
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
          custom={2}
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
          custom={3}
          variants={sectionVariants}
          initial="hidden"
          animate="show"
          className="grid gap-6 lg:grid-cols-2"
        >
          <WeeklyBarChart data={weeklyData} loading={loading} />
          <RecentSessions sessions={recentData} loading={loading} />
        </motion.div>
      </main>
    </div>
  );
}
