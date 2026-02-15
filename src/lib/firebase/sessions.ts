/**
 * Serviço de Sessões de Estudo - Firestore
 * 
 * Gerencia operações CRUD para sessões de estudo no Firestore.
 * Coleção: "sessions"
 * Schema: { userId, subject, subtopic, startTime, endTime, duration, date, createdAt }
 */

import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from './config';
import {
  StudySession,
  StudySummary,
  SubjectHours,
  DailyHours,
  StudyGoal,
  StudyConsistency,
  StudyPlan,
  SubjectWeight,
  PlanVsActual,
  StudyInsight,
  SessionFilters,
  DayActivity,
  WeeklyMentoring,
  WeeklyMentoringContent,
} from '@/types';
import { getDayName, getTodayISO } from '@/lib/utils';

const SESSIONS_COLLECTION = 'sessions';
const USER_STATS_COLLECTION = 'user_stats';
const WEEKLY_MENTORING_COLLECTION = 'weekly_mentoring';
const DEFAULT_WEEKLY_GOAL_HOURS = 10;

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Salva uma nova sessão de estudo no Firestore
 */
export async function saveSession(session: Omit<StudySession, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, SESSIONS_COLLECTION), {
    ...session,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

/**
 * Busca sessões de estudo de um usuário a partir de uma data.
 * Se planId for fornecido, filtra client-side por planId.
 */
export async function getSessionsFromDate(
  userId: string,
  fromDate: string,
  planId?: string
): Promise<StudySession[]> {
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where('userId', '==', userId),
    where('date', '>=', fromDate),
    orderBy('date', 'desc')
  );

  const snapshot = await getDocs(q);
  let sessions = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as StudySession[];

  // Filtra por planId client-side (evita index composto obrigatório)
  if (planId) {
    sessions = sessions.filter((s) => s.planId === planId);
  }

  return sessions;
}

/**
 * Calcula o resumo de horas de estudo (hoje, semana, mês)
 */
export async function getStudySummary(userId: string, planId?: string): Promise<StudySummary> {
  const now = new Date();
  
  // Data de início do mês atual (YYYY-MM-01)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  // Busca todas as sessões do mês
  const sessions = await getSessionsFromDate(userId, monthStart, planId);

  const today = now.toISOString().split('T')[0];
  
  // Calcula início da semana (segunda-feira)
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - mondayOffset);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  let totalToday = 0;
  let totalWeek = 0;
  let totalMonth = 0;

  for (const session of sessions) {
    totalMonth += session.duration;
    
    if (session.date >= weekStartStr) {
      totalWeek += session.duration;
    }
    
    if (session.date === today) {
      totalToday += session.duration;
    }
  }

  return { totalToday, totalWeek, totalMonth };
}

/**
 * Calcula horas por matéria para o gráfico de radar
 */
export async function getHoursBySubject(userId: string, planId?: string): Promise<SubjectHours[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const sessions = await getSessionsFromDate(userId, monthStart, planId);

  // Agrupa duração por matéria
  const subjectMap = new Map<string, number>();
  
  for (const session of sessions) {
    const current = subjectMap.get(session.subject) || 0;
    subjectMap.set(session.subject, current + session.duration);
  }

  // Converte para array de horas
  return Array.from(subjectMap.entries()).map(([subject, seconds]) => ({
    subject,
    hours: Math.round((seconds / 3600) * 100) / 100, // 2 casas decimais
  }));
}

/**
 * Retorna horas estudadas por dia na semana atual (Seg–Dom)
 */
export async function getWeeklyHours(userId: string, planId?: string): Promise<DailyHours[]> {
  const now = new Date();
  const today = getTodayISO();

  // Calcula segunda-feira da semana atual
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);

  const weekStartStr = monday.toISOString().split('T')[0];
  const sessions = await getSessionsFromDate(userId, weekStartStr, planId);

  // Mapa de data → duração total
  const dayMap = new Map<string, number>();
  for (const session of sessions) {
    const current = dayMap.get(session.date) || 0;
    dayMap.set(session.date, current + session.duration);
  }

  // Gera os 7 dias da semana
  const result: DailyHours[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const seconds = dayMap.get(dateStr) || 0;

    result.push({
      day: getDayName(d),
      date: dateStr,
      hours: Math.round((seconds / 3600) * 100) / 100,
      isToday: dateStr === today,
    });
  }

  return result;
}

/**
 * Retorna as sessões mais recentes de um usuário
 */
export async function getRecentSessions(
  userId: string,
  limit: number = 5,
  planId?: string
): Promise<StudySession[]> {
  const now = new Date();
  // Busca sessões do último mês para garantir que temos suficientes
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const sessions = await getSessionsFromDate(userId, monthStart, planId);

  // Ordena por startTime decrescente e limita
  return sessions
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .slice(0, limit);
}

/**
 * Retorna a meta semanal do usuário
 */
export async function getWeeklyGoal(userId: string): Promise<StudyGoal> {
  const ref = doc(db, USER_STATS_COLLECTION, userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return { weeklyGoalHours: DEFAULT_WEEKLY_GOAL_HOURS };
  }

  const data = snap.data() as Partial<StudyGoal>;
  return {
    weeklyGoalHours:
      typeof data.weeklyGoalHours === 'number'
        ? data.weeklyGoalHours
        : DEFAULT_WEEKLY_GOAL_HOURS,
    updatedAt: data.updatedAt,
  };
}

/**
 * Atualiza a meta semanal do usuário
 */
export async function setWeeklyGoal(
  userId: string,
  weeklyGoalHours: number
): Promise<void> {
  const normalized = Math.max(1, Math.min(80, Math.round(weeklyGoalHours)));
  const ref = doc(db, USER_STATS_COLLECTION, userId);
  await setDoc(
    ref,
    {
      weeklyGoalHours: normalized,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Calcula métricas de consistência:
 * - streak atual
 * - melhor streak histórico
 * - progresso da meta semanal
 */
export async function getStudyConsistency(userId: string, planId?: string, planGoalHours?: number): Promise<StudyConsistency> {
  const [goal, weeklyData] = await Promise.all([
    getWeeklyGoal(userId),
    getWeeklyHours(userId, planId),
  ]);

  // Usa goal do plano se fornecido, senão usa goal global
  const effectiveGoalHours = planGoalHours ?? goal.weeklyGoalHours;

  const weeklyTotalSeconds = weeklyData.reduce(
    (acc, day) => acc + Math.round(day.hours * 3600),
    0
  );
  const weeklyGoalSeconds = effectiveGoalHours * 3600;
  const weeklyProgressPercent = Math.min(
    100,
    Math.round((weeklyTotalSeconds / weeklyGoalSeconds) * 100)
  );
  const remainingSeconds = Math.max(0, weeklyGoalSeconds - weeklyTotalSeconds);
  const daysStudiedThisWeek = weeklyData.filter((d) => d.hours > 0).length;

  // Busca sessões do último ano para cálculo de streak
  const from = new Date();
  from.setFullYear(from.getFullYear() - 1);
  const fromDate = from.toISOString().split('T')[0];
  const sessions = await getSessionsFromDate(userId, fromDate, planId);

  const dateSet = new Set(sessions.map((s) => s.date));
  const sortedDates = Array.from(dateSet).sort();

  // Melhor streak histórico
  let bestStreak = 0;
  let runningBest = 0;
  let prevDate: Date | null = null;
  for (const dateStr of sortedDates) {
    const current = new Date(`${dateStr}T00:00:00`);
    if (!prevDate) {
      runningBest = 1;
    } else {
      const diffDays = Math.round(
        (current.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      runningBest = diffDays === 1 ? runningBest + 1 : 1;
    }
    bestStreak = Math.max(bestStreak, runningBest);
    prevDate = current;
  }

  // Streak atual: conta de hoje; se não houver hoje, começa de ontem
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let cursor: Date | null = null;
  if (dateSet.has(todayStr)) {
    cursor = new Date(`${todayStr}T00:00:00`);
  } else if (dateSet.has(yesterdayStr)) {
    cursor = new Date(`${yesterdayStr}T00:00:00`);
  }

  let currentStreak = 0;
  while (cursor) {
    const key = cursor.toISOString().split('T')[0];
    if (!dateSet.has(key)) break;
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    currentStreak,
    bestStreak,
    daysStudiedThisWeek,
    weeklyGoalHours: effectiveGoalHours,
    weeklyTotalSeconds,
    weeklyProgressPercent,
    remainingSeconds,
  };
}

// ==========================================================
// Plano de Estudo (pesos por matéria)
// ==========================================================

/**
 * Retorna o plano de estudo do usuário (pesos por matéria)
 */
export async function getStudyPlan(userId: string): Promise<StudyPlan> {
  const ref = doc(db, USER_STATS_COLLECTION, userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return { subjects: [] };

  const data = snap.data();
  return {
    subjects: Array.isArray(data.planSubjects) ? data.planSubjects : [],
    updatedAt: data.planUpdatedAt,
  };
}

/**
 * Salva o plano de estudo (pesos por matéria)
 */
export async function setStudyPlan(
  userId: string,
  subjects: SubjectWeight[]
): Promise<void> {
  const ref = doc(db, USER_STATS_COLLECTION, userId);
  await setDoc(
    ref,
    {
      planSubjects: subjects,
      planUpdatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Compara o plano (pesos) com o real (horas do mês).
 * Se planSubjects for fornecido, usa esses pesos em vez do user_stats.
 */
export async function getPlanVsActual(
  userId: string,
  planId?: string,
  planSubjects?: SubjectWeight[]
): Promise<PlanVsActual[]> {
  const [plan, subjectHours] = await Promise.all([
    planSubjects ? Promise.resolve({ subjects: planSubjects }) : getStudyPlan(userId),
    getHoursBySubject(userId, planId),
  ]);

  if (plan.subjects.length === 0) return [];

  const totalHours = subjectHours.reduce((acc, s) => acc + s.hours, 0);
  const hoursMap = new Map(subjectHours.map((s) => [s.subject, s.hours]));

  return plan.subjects.map((pw) => {
    const actualHours = hoursMap.get(pw.subject) || 0;
    const actualPercent = totalHours > 0
      ? Math.round((actualHours / totalHours) * 100)
      : 0;
    const deviation = actualPercent - pw.weight;
    const status: PlanVsActual['status'] =
      deviation < -10 ? 'neglected' : deviation > 15 ? 'over' : 'ok';

    return {
      subject: pw.subject,
      plannedPercent: pw.weight,
      actualPercent,
      actualHours,
      deviation,
      status,
    };
  });
}

// ==========================================================
// Insights Automáticos
// ==========================================================

/**
 * Gera insights acionáveis baseados nos dados de estudo
 */
export async function generateInsights(
  userId: string,
  consistency: StudyConsistency,
  planVsActual: PlanVsActual[]
): Promise<StudyInsight[]> {
  const insights: StudyInsight[] = [];

  // 1. Matéria mais negligenciada
  const neglected = planVsActual
    .filter((p) => p.status === 'neglected')
    .sort((a, b) => a.deviation - b.deviation);

  if (neglected.length > 0) {
    const worst = neglected[0];
    insights.push({
      type: 'neglected',
      title: 'Matéria negligenciada',
      message: `${worst.subject} está ${Math.abs(worst.deviation)}% abaixo do planejado. Considere focar nela hoje.`,
      icon: 'AlertTriangle',
      color: 'text-amber-400',
    });
  }

  // 2. Sugestão do dia
  if (neglected.length > 0) {
    insights.push({
      type: 'suggestion',
      title: 'Sugestão para hoje',
      message: `Estude ${neglected[0].subject} para equilibrar seu radar.`,
      icon: 'Lightbulb',
      color: 'text-violet-400',
    });
  } else if (planVsActual.length > 0) {
    const leastStudied = [...planVsActual].sort(
      (a, b) => a.actualHours - b.actualHours
    )[0];
    insights.push({
      type: 'suggestion',
      title: 'Sugestão para hoje',
      message: `${leastStudied.subject} é a matéria com menos horas. Que tal dedicar um tempo a ela?`,
      icon: 'Lightbulb',
      color: 'text-violet-400',
    });
  }

  // 3. Streak
  if (consistency.currentStreak >= 7) {
    insights.push({
      type: 'celebrate',
      title: 'Sequência incrível!',
      message: `${consistency.currentStreak} dias seguidos estudando. Você está construindo um hábito sólido!`,
      icon: 'Trophy',
      color: 'text-amber-400',
    });
  } else if (consistency.currentStreak >= 3) {
    insights.push({
      type: 'streak',
      title: 'Boa sequência!',
      message: `${consistency.currentStreak} dias seguidos. Continue assim para chegar a 7!`,
      icon: 'Flame',
      color: 'text-orange-400',
    });
  }

  // 4. Equilíbrio geral
  const balanced = planVsActual.filter((p) => p.status === 'ok').length;
  if (planVsActual.length > 0 && balanced === planVsActual.length) {
    insights.push({
      type: 'balance',
      title: 'Estudos equilibrados',
      message: 'Todas as matérias estão dentro do planejado. Excelente distribuição!',
      icon: 'CheckCircle',
      color: 'text-emerald-400',
    });
  }

  // 5. Meta semanal
  if (consistency.weeklyProgressPercent >= 100) {
    insights.push({
      type: 'celebrate',
      title: 'Meta semanal batida!',
      message: 'Você atingiu sua meta da semana. Parabéns pelo comprometimento!',
      icon: 'Star',
      color: 'text-yellow-400',
    });
  } else if (consistency.weeklyProgressPercent >= 70) {
    insights.push({
      type: 'streak',
      title: 'Quase lá!',
      message: `Faltam apenas ${Math.round(consistency.remainingSeconds / 60)} minutos para bater a meta semanal.`,
      icon: 'Target',
      color: 'text-cyan-400',
    });
  }

  return insights;
}

// ==========================================================
// Histórico com Filtros
// ==========================================================

/**
 * Busca sessões aplicando filtros opcionais (matéria, período, duração mínima)
 */
export async function getFilteredSessions(
  userId: string,
  filters: SessionFilters
): Promise<StudySession[]> {
  const fromDate = filters.dateFrom || '2020-01-01';
  const sessions = await getSessionsFromDate(userId, fromDate, filters.planId);

  return sessions.filter((s) => {
    if (filters.subject && s.subject !== filters.subject) return false;
    if (filters.dateTo && s.date > filters.dateTo) return false;
    if (filters.minDuration && s.duration < filters.minDuration) return false;
    return true;
  });
}

// ==========================================================
// Heatmap de Atividade
// ==========================================================

/**
 * Retorna atividade por dia para um mês inteiro (para o heatmap)
 */
export async function getMonthlyActivity(
  userId: string,
  year: number,
  month: number, // 0-indexed (0=Jan, 11=Dez)
  planId?: string
): Promise<DayActivity[]> {
  const monthStart = formatDateLocal(new Date(year, month, 1));
  const monthEnd = formatDateLocal(new Date(year, month + 1, 0));
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const sessions = await getSessionsFromDate(userId, monthStart, planId);
  // Filtra apenas sessões do mês pedido
  const filtered = sessions.filter((s) => s.date <= monthEnd);

  // Agrupa por dia
  const dayMap = new Map<string, { totalSeconds: number; count: number; subjects: Set<string> }>();
  for (const s of filtered) {
    const entry = dayMap.get(s.date) || { totalSeconds: 0, count: 0, subjects: new Set<string>() };
    entry.totalSeconds += s.duration;
    entry.count += 1;
    entry.subjects.add(s.subject);
    dayMap.set(s.date, entry);
  }

  // Calcula thresholds para os levels baseado no max do mês
  const maxSeconds = Math.max(...Array.from(dayMap.values()).map((d) => d.totalSeconds), 1);

  // Gera array com todos os dias do mês
  const result: DayActivity[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const entry = dayMap.get(date);

    let level: DayActivity['level'] = 0;
    if (entry) {
      const ratio = entry.totalSeconds / maxSeconds;
      if (ratio >= 0.75) level = 4;
      else if (ratio >= 0.5) level = 3;
      else if (ratio >= 0.25) level = 2;
      else level = 1;
    }

    result.push({
      date,
      totalSeconds: entry?.totalSeconds ?? 0,
      sessionCount: entry?.count ?? 0,
      subjects: entry ? Array.from(entry.subjects) : [],
      level,
    });
  }

  return result;
}

// ==========================================================
// Mentoria Semanal (cache Firestore)
// ==========================================================

/**
 * Retorna a segunda-feira da semana atual (YYYY-MM-DD)
 */
export function getCurrentWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  return formatDateLocal(monday);
}

/**
 * Busca a mentoria semanal da semana atual (se existir no cache)
 */
export async function getWeeklyMentoring(
  userId: string,
  planId?: string
): Promise<WeeklyMentoring | null> {
  const weekStart = getCurrentWeekStart();

  const q = query(
    collection(db, WEEKLY_MENTORING_COLLECTION),
    where('userId', '==', userId),
    where('weekStart', '==', weekStart),
    orderBy('generatedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  // Filtra por planId client-side
  const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as WeeklyMentoring));
  const match = planId
    ? docs.find((d) => d.planId === planId)
    : docs.find((d) => !d.planId) || docs[0];

  return match || null;
}

/**
 * Salva a mentoria semanal no Firestore
 */
export async function saveWeeklyMentoring(
  userId: string,
  content: WeeklyMentoringContent,
  planId?: string
): Promise<string> {
  const weekStart = getCurrentWeekStart();

  const docRef = await addDoc(collection(db, WEEKLY_MENTORING_COLLECTION), {
    userId,
    planId: planId || null,
    weekStart,
    generatedAt: new Date().toISOString(),
    content,
  });

  return docRef.id;
}
