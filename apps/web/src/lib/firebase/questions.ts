/**
 * Serviço de Questões — Firestore
 *
 * Gerencia registro manual de acertos/erros por matéria.
 * Coleção: "questions_stats"
 * Schema: { userId, planId, subject, totalQuestions, correctAnswers, accuracy, date, createdAt }
 *
 * Módulo de provas/simulados/caderno-erros DEPRECADO em abril/2026.
 * Mantidas apenas as funções que alimentam o motor de decisão.
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from './config';
import { QuestionSession, SubjectAccuracy } from '@/types';

const QUESTIONS_STATS_COLLECTION = 'questions_stats';

export type AccuracyPeriod = 'month' | 'last3months' | 'all';

export interface AccuracyAnalytics {
  month: SubjectAccuracy[];
  previousMonth: SubjectAccuracy[];
  last3months: SubjectAccuracy[];
  all: SubjectAccuracy[];
}

function normalizeSubject(subject: string): string {
  return subject.trim().replace(/\s+/g, ' ');
}

function subjectKey(subject: string): string {
  return normalizeSubject(subject).toLowerCase();
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function aggregateAccuracyBySubject(sessions: QuestionSession[]): SubjectAccuracy[] {
  const map = new Map<string, { label: string; total: number; correct: number; sessions: number }>();

  for (const s of sessions) {
    const total = Number(s.totalQuestions) || 0;
    const correct = Number(s.correctAnswers) || 0;
    if (!s.subject || total <= 0) continue;

    const normalized = normalizeSubject(s.subject);
    const key = subjectKey(normalized);
    const entry = map.get(key) || { label: normalized, total: 0, correct: 0, sessions: 0 };
    entry.total += total;
    entry.correct += Math.min(correct, total);
    entry.sessions += 1;
    map.set(key, entry);
  }

  return Array.from(map.values())
    .map((data) => ({
      subject: data.label,
      totalQuestions: data.total,
      correctAnswers: data.correct,
      accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      sessions: data.sessions,
    }))
    .sort((a, b) => b.totalQuestions - a.totalQuestions);
}

export async function saveQuestionSession(
  session: Omit<QuestionSession, 'id' | 'createdAt' | 'accuracy'>
): Promise<string> {
  const subject = normalizeSubject(session.subject);
  const accuracy =
    session.totalQuestions > 0
      ? Math.round((session.correctAnswers / session.totalQuestions) * 100)
      : 0;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(session)) {
    if (value !== undefined) sanitized[key] = value;
  }

  const docRef = await addDoc(collection(db, QUESTIONS_STATS_COLLECTION), {
    ...sanitized,
    subject,
    accuracy,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

export async function getQuestionSessionsFromDate(
  userId: string,
  fromDate: string,
  planId?: string,
  toDate?: string
): Promise<QuestionSession[]> {
  const q = query(collection(db, QUESTIONS_STATS_COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  let sessions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as QuestionSession[];

  sessions = sessions.filter(
    (s) => typeof s.date === 'string' && s.date >= fromDate && (!toDate || s.date <= toDate)
  );

  if (planId) {
    sessions = sessions.filter((s) => s.planId === planId || !s.planId);
  }

  sessions.sort((a, b) => (a.date < b.date ? 1 : -1));
  return sessions;
}

export async function getAccuracyAnalytics(
  userId: string,
  planId?: string
): Promise<AccuracyAnalytics> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const last3MonthsStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  const recentSessions = await getQuestionSessionsFromDate(userId, toISODate(last3MonthsStart), planId);
  const monthStartISO = toISODate(monthStart);
  const previousMonthStartISO = toISODate(previousMonthStart);
  const previousMonthEndISO = toISODate(previousMonthEnd);

  const monthSessions = recentSessions.filter((s) => s.date >= monthStartISO);
  const previousMonthSessions = recentSessions.filter(
    (s) => s.date >= previousMonthStartISO && s.date <= previousMonthEndISO
  );
  const allSessions = await getQuestionSessionsFromDate(userId, '1900-01-01', planId);

  return {
    month: aggregateAccuracyBySubject(monthSessions),
    previousMonth: aggregateAccuracyBySubject(previousMonthSessions),
    last3months: aggregateAccuracyBySubject(recentSessions),
    all: aggregateAccuracyBySubject(allSessions),
  };
}

export function getSubjectDeltaMap(
  current: SubjectAccuracy[],
  previous: SubjectAccuracy[]
): Record<string, number> {
  const previousMap = new Map(previous.map((item) => [subjectKey(item.subject), item.accuracy]));
  const delta: Record<string, number> = {};
  for (const item of current) {
    const key = subjectKey(item.subject);
    const prev = previousMap.get(key);
    if (typeof prev === 'number') {
      delta[item.subject] = item.accuracy - prev;
    }
  }
  return delta;
}
