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
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { StudySession, StudySummary, SubjectHours, DailyHours } from '@/types';
import { getDayName, getTodayISO } from '@/lib/utils';

const SESSIONS_COLLECTION = 'sessions';

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
 * Busca sessões de estudo de um usuário a partir de uma data
 */
export async function getSessionsFromDate(
  userId: string,
  fromDate: string
): Promise<StudySession[]> {
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where('userId', '==', userId),
    where('date', '>=', fromDate),
    orderBy('date', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as StudySession[];
}

/**
 * Calcula o resumo de horas de estudo (hoje, semana, mês)
 */
export async function getStudySummary(userId: string): Promise<StudySummary> {
  const now = new Date();
  
  // Data de início do mês atual (YYYY-MM-01)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  // Busca todas as sessões do mês
  const sessions = await getSessionsFromDate(userId, monthStart);

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
export async function getHoursBySubject(userId: string): Promise<SubjectHours[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const sessions = await getSessionsFromDate(userId, monthStart);

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
export async function getWeeklyHours(userId: string): Promise<DailyHours[]> {
  const now = new Date();
  const today = getTodayISO();

  // Calcula segunda-feira da semana atual
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);

  const weekStartStr = monday.toISOString().split('T')[0];
  const sessions = await getSessionsFromDate(userId, weekStartStr);

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
  limit: number = 5
): Promise<StudySession[]> {
  const now = new Date();
  // Busca sessões do último mês para garantir que temos suficientes
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const sessions = await getSessionsFromDate(userId, monthStart);

  // Ordena por startTime decrescente e limita
  return sessions
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .slice(0, limit);
}
