/**
 * Serviço de Questões — Firestore
 *
 * Gerencia registro de acertos/erros por matéria.
 * Coleção: "questions_stats"
 * Schema: { userId, subject, totalQuestions, correctAnswers, accuracy, date, createdAt }
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import {
  QuestionBankItem,
  ExamMetadata,
  QuestionAttempt,
  QuestionDifficulty,
  SimulatedConfig,
  QuestionSession,
  SubjectAccuracy,
} from '@/types';

const QUESTIONS_COLLECTION = 'questions_bank';
const EXAMS_COLLECTION = 'exams';
const ATTEMPTS_COLLECTION = 'question_attempts';
const SIMULATED_CONFIGS_COLLECTION = 'simulated_configs';
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

    const entry = map.get(key) || {
      label: normalized,
      total: 0,
      correct: 0,
      sessions: 0,
    };
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

export async function getQuestionById(id: string): Promise<QuestionBankItem | null> {
  const ref = doc(db, QUESTIONS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as QuestionBankItem) };
}

export async function listQuestionsByFilter(filters: {
  materias?: string[];
  bancas?: string[];
  dificuldades?: QuestionDifficulty[];
  tags?: string[];
}): Promise<QuestionBankItem[]> {
  const q = query(collection(db, QUESTIONS_COLLECTION));
  // Para simplificar, filtros serão aplicados pelo client (futuro: construir queries compostas)
  const snap = await getDocs(q);
  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as QuestionBankItem) }))
    .filter((item) => {
      if (filters.materias && filters.materias.length && !filters.materias.includes(item.materia)) {
        return false;
      }
      if (filters.bancas && filters.bancas.length && item.banca && !filters.bancas.includes(item.banca)) {
        return false;
      }
      if (
        filters.dificuldades &&
        filters.dificuldades.length &&
        item.difficulty &&
        !filters.dificuldades.includes(item.difficulty)
      ) {
        return false;
      }
      if (filters.tags && filters.tags.length) {
        const hasAll = filters.tags.every((tag) => item.tags?.includes(tag));
        if (!hasAll) return false;
      }
      return true;
    });
}

export async function getExamById(id: string): Promise<ExamMetadata | null> {
  const ref = doc(db, EXAMS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as ExamMetadata) };
}

export async function listExamsByPlan(planId?: string | null): Promise<ExamMetadata[]> {
  const q = planId
    ? query(collection(db, EXAMS_COLLECTION), where('planId', '==', planId))
    : collection(db, EXAMS_COLLECTION);
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as ExamMetadata) }));
}

export async function saveQuestionAttempt(attempt: QuestionAttempt): Promise<string> {
  const ref = await addDoc(collection(db, ATTEMPTS_COLLECTION), {
    ...attempt,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getRecentAttempts(userId: string, limitCount = 20): Promise<QuestionAttempt[]> {
  const q = query(
    collection(db, ATTEMPTS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as QuestionAttempt) }));
}

export async function saveSimulatedConfig(config: SimulatedConfig): Promise<string> {
  const ref = await addDoc(collection(db, SIMULATED_CONFIGS_COLLECTION), {
    ...config,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getSimulatedConfigs(userId: string): Promise<SimulatedConfig[]> {
  const q = query(collection(db, SIMULATED_CONFIGS_COLLECTION), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as SimulatedConfig) }));
}

/**
 * Salva uma sessão de questões no Firestore
 */
export async function saveQuestionSession(
  session: Omit<QuestionSession, 'id' | 'createdAt' | 'accuracy'>
): Promise<string> {
  const subject = normalizeSubject(session.subject);
  const accuracy =
    session.totalQuestions > 0
      ? Math.round((session.correctAnswers / session.totalQuestions) * 100)
      : 0;

  const docRef = await addDoc(collection(db, QUESTIONS_STATS_COLLECTION), {
    ...session,
    subject,
    accuracy,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

/**
 * Busca todas as sessões de questões de um usuário a partir de uma data.
 * Se planId for fornecido, filtra client-side.
 */
export async function getQuestionSessionsFromDate(
  userId: string,
  fromDate: string,
  planId?: string,
  toDate?: string
): Promise<QuestionSession[]> {
  const q = query(
    collection(db, QUESTIONS_STATS_COLLECTION),
    where('userId', '==', userId)
  );

  const snapshot = await getDocs(q);
  let sessions = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as QuestionSession[];

  sessions = sessions.filter(
    (s) => typeof s.date === 'string' && s.date >= fromDate && (!toDate || s.date <= toDate)
  );

  if (planId) {
    // Inclui sessões do plano ativo e sessões legadas sem planId (visão compatível).
    sessions = sessions.filter((s) => s.planId === planId || !s.planId);
  }

  sessions.sort((a, b) => (a.date < b.date ? 1 : -1));

  return sessions;
}

/**
 * Retorna a taxa de acerto agregada por matéria (mês atual)
 */
export async function getAccuracyBySubject(
  userId: string,
  planId?: string,
  period: AccuracyPeriod = 'month'
): Promise<SubjectAccuracy[]> {
  const analytics = await getAccuracyAnalytics(userId, planId);
  if (period === 'all') return analytics.all;
  if (period === 'last3months') return analytics.last3months;
  return analytics.month;
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
  const earliestNeeded = toISODate(last3MonthsStart);

  const recentSessions = await getQuestionSessionsFromDate(userId, earliestNeeded, planId);

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

/**
 * Carrega todas as questões de um exame na ordem correta
 */
export async function loadExamQuestions(examId: string): Promise<QuestionBankItem[]> {
  const exam = await getExamById(examId);
  if (!exam || !exam.questions || exam.questions.length === 0) {
    return [];
  }

  // Carrega questões em batch mantendo a ordem
  const questions: QuestionBankItem[] = [];
  for (const qId of exam.questions) {
    const q = await getQuestionById(qId);
    if (q) {
      questions.push(q);
    }
  }
  return questions;
}

/**
 * Busca questões aleatórias baseadas em filtros para simulados
 */
export async function getRandomQuestions(
  filters: {
    materias?: string[];
    bancas?: string[];
    dificuldades?: QuestionDifficulty[];
    tags?: string[];
  },
  count: number
): Promise<QuestionBankItem[]> {
  const allQuestions = await listQuestionsByFilter(filters);
  
  // Embaralha e pega N questões
  const shuffled = allQuestions.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Salva múltiplas tentativas de questões em batch
 */
export async function saveQuestionAttempts(attempts: QuestionAttempt[]): Promise<void> {
  if (attempts.length === 0) return;

  const promises = attempts.map(attempt => saveQuestionAttempt(attempt));
  await Promise.all(promises);

  // Integra automaticamente tentativas de prova/simulado no painel de acurácia por matéria.
  const questionIds = Array.from(new Set(attempts.map((a) => a.questionId)));
  const questions = await Promise.all(questionIds.map((id) => getQuestionById(id)));
  const questionById = new Map<string, QuestionBankItem>();
  questions.forEach((q) => {
    if (q?.id) questionById.set(q.id, q);
  });

  type Aggregate = { subject: string; totalQuestions: number; correctAnswers: number; planId?: string };
  const grouped = new Map<string, Aggregate>();

  for (const attempt of attempts) {
    const question = questionById.get(attempt.questionId);
    if (!question?.materia) continue;

    const subject = normalizeSubject(question.materia);
    const aggregateKey = `${attempt.planId || ''}::${subjectKey(subject)}`;
    const current = grouped.get(aggregateKey) || {
      subject,
      totalQuestions: 0,
      correctAnswers: 0,
      planId: attempt.planId || undefined,
    };

    current.totalQuestions += 1;
    if (attempt.correct) current.correctAnswers += 1;
    grouped.set(aggregateKey, current);
  }

  if (grouped.size === 0) return;

  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const userId = attempts[0].userId;

  await Promise.all(
    Array.from(grouped.values()).map((item) =>
      saveQuestionSession({
        userId,
        planId: item.planId,
        subject: item.subject,
        totalQuestions: item.totalQuestions,
        correctAnswers: item.correctAnswers,
        date,
      })
    )
  );
}

/**
 * Retorna lista de matérias únicas disponíveis no banco de questões
 */
export async function getAvailableSubjects(): Promise<string[]> {
  const snapshot = await getDocs(collection(db, QUESTIONS_COLLECTION));
  const subjects = new Set<string>();
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.materia) {
      subjects.add(data.materia);
    }
  });
  
  return Array.from(subjects).sort();
}

/**
 * Retorna lista de bancas únicas disponíveis no banco de questões
 */
export async function getAvailableBancas(): Promise<string[]> {
  const snapshot = await getDocs(collection(db, QUESTIONS_COLLECTION));
  const bancas = new Set<string>();
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.banca) {
      bancas.add(data.banca);
    }
  });
  
  return Array.from(bancas).sort();
}
