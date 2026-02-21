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
  let q = query(collection(db, QUESTIONS_COLLECTION));
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
  const accuracy =
    session.totalQuestions > 0
      ? Math.round((session.correctAnswers / session.totalQuestions) * 100)
      : 0;

  const docRef = await addDoc(collection(db, QUESTIONS_STATS_COLLECTION), {
    ...session,
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
  planId?: string
): Promise<QuestionSession[]> {
  const q = query(
    collection(db, QUESTIONS_COLLECTION),
    where('userId', '==', userId),
    where('date', '>=', fromDate),
    orderBy('date', 'desc')
  );

  const snapshot = await getDocs(q);
  let sessions = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as QuestionSession[];

  if (planId) {
    sessions = sessions.filter((s) => s.planId === planId);
  }

  return sessions;
}

/**
 * Retorna a taxa de acerto agregada por matéria (mês atual)
 */
export async function getAccuracyBySubject(
  userId: string,
  planId?: string
): Promise<SubjectAccuracy[]> {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const sessions = await getQuestionSessionsFromDate(userId, monthStart, planId);

  // Agrupa por matéria
  const map = new Map<
    string,
    { total: number; correct: number; sessions: number }
  >();

  for (const s of sessions) {
    const entry = map.get(s.subject) || {
      total: 0,
      correct: 0,
      sessions: 0,
    };
    entry.total += s.totalQuestions;
    entry.correct += s.correctAnswers;
    entry.sessions += 1;
    map.set(s.subject, entry);
  }

  return Array.from(map.entries())
    .map(([subject, data]) => ({
      subject,
      totalQuestions: data.total,
      correctAnswers: data.correct,
      accuracy:
        data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      sessions: data.sessions,
    }))
    .sort((a, b) => b.totalQuestions - a.totalQuestions);
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
  const promises = attempts.map(attempt => saveQuestionAttempt(attempt));
  await Promise.all(promises);
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
