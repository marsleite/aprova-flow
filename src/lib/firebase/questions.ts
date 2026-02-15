/**
 * Serviço de Questões — Firestore
 *
 * Gerencia registro de acertos/erros por matéria.
 * Coleção: "questions_stats"
 * Schema: { userId, subject, totalQuestions, correctAnswers, accuracy, date, createdAt }
 */

import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from './config';
import { QuestionSession, SubjectAccuracy } from '@/types';

const QUESTIONS_COLLECTION = 'questions_stats';

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

  const docRef = await addDoc(collection(db, QUESTIONS_COLLECTION), {
    ...session,
    accuracy,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

/**
 * Busca todas as sessões de questões de um usuário a partir de uma data
 */
export async function getQuestionSessionsFromDate(
  userId: string,
  fromDate: string
): Promise<QuestionSession[]> {
  const q = query(
    collection(db, QUESTIONS_COLLECTION),
    where('userId', '==', userId),
    where('date', '>=', fromDate),
    orderBy('date', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as QuestionSession[];
}

/**
 * Retorna a taxa de acerto agregada por matéria (mês atual)
 */
export async function getAccuracyBySubject(
  userId: string
): Promise<SubjectAccuracy[]> {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const sessions = await getQuestionSessionsFromDate(userId, monthStart);

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
