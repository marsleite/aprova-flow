/**
 * Serviço de Planos de Estudo (Multi-Edital) — Firestore
 *
 * Gerencia operações CRUD para planos de estudo por edital/concurso.
 * Coleção: "study_plans"
 * Schema: { userId, name, subjects[], weeklyGoalHours, color, isDefault, createdAt, updatedAt }
 *
 * Inclui lógica de migração: na primeira vez, cria um plano "Geral" padrão
 * e associa todas as sessões existentes a ele.
 */

import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { StudyCapacityHours, StudyPlanEdital, SubjectWeight } from '@/types';
import { normalizeStudyCapacityHours } from '@/lib/plans/studyCapacity';

const PLANS_COLLECTION = 'study_plans';
const SESSIONS_COLLECTION = 'sessions';
const QUESTIONS_COLLECTION = 'questions_stats';
const USER_STATS_COLLECTION = 'user_stats';

function normalizeDateOnly(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function normalizeMaterialWorkloadHours(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.max(1, Math.min(5000, Math.round(parsed)));
}

function normalizePlanSubjects(raw: unknown): SubjectWeight[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((subject) => {
      if (!subject || typeof subject !== 'object') return null;
      const subjectName = typeof (subject as { subject?: unknown }).subject === 'string'
        ? (subject as { subject: string }).subject.trim()
        : '';
      const weight = Number((subject as { weight?: unknown }).weight);
      if (!subjectName || !Number.isFinite(weight)) return null;
      return {
        subject: subjectName,
        weight: Math.max(0, Math.min(100, Math.round(weight))),
      };
    })
    .filter((item): item is SubjectWeight => item !== null);
}

function normalizeStudyPlan(
  planId: string,
  raw: Record<string, unknown>
): StudyPlanEdital {
  const weeklyGoalHours = Number.isFinite(Number(raw.weeklyGoalHours))
    ? Math.max(1, Math.min(80, Math.round(Number(raw.weeklyGoalHours))))
    : 10;

  return {
    id: planId,
    userId: typeof raw.userId === 'string' ? raw.userId : '',
    name:
      typeof raw.name === 'string' && raw.name.trim() !== ''
        ? raw.name.trim()
        : 'Plano sem nome',
    subjects: normalizePlanSubjects(raw.subjects),
    weeklyGoalHours,
    examDate: normalizeDateOnly(raw.examDate),
    materialWorkloadHours: normalizeMaterialWorkloadHours(raw.materialWorkloadHours),
    studyCapacityHours: normalizeStudyCapacityHours(raw.studyCapacityHours, weeklyGoalHours),
    color: typeof raw.color === 'string' && raw.color ? raw.color : 'var(--primary)',
    isDefault: Boolean(raw.isDefault),
    createdAt:
      typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt:
      typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

function buildStudyPlanPayload(
  data: Partial<Omit<StudyPlanEdital, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> & {
    name?: string;
    subjects?: SubjectWeight[];
    weeklyGoalHours?: number;
    color?: string;
    isDefault?: boolean;
  }
) {
  const weeklyGoalHours = Number.isFinite(Number(data.weeklyGoalHours))
    ? Math.max(1, Math.min(80, Math.round(Number(data.weeklyGoalHours))))
    : 10;

  const payload: Record<string, unknown> = {
    name: typeof data.name === 'string' ? data.name.trim() : 'Plano sem nome',
    subjects: normalizePlanSubjects(data.subjects),
    weeklyGoalHours,
    examDate: normalizeDateOnly(data.examDate),
    materialWorkloadHours: normalizeMaterialWorkloadHours(data.materialWorkloadHours),
    studyCapacityHours: normalizeStudyCapacityHours(data.studyCapacityHours, weeklyGoalHours),
    color: typeof data.color === 'string' && data.color ? data.color : 'var(--primary)',
    isDefault: Boolean(data.isDefault),
  };

  return payload;
}

// Lock para evitar race condition em StrictMode / chamadas concorrentes
let migrationInProgress: Promise<string> | null = null;

// ==========================================================
// CRUD
// ==========================================================

/**
 * Cria um novo plano de estudo. Retorna o ID.
 */
export async function createStudyPlan(
  userId: string,
  data: Omit<StudyPlanEdital, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, PLANS_COLLECTION), {
    userId,
    ...buildStudyPlanPayload(data),
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

/**
 * Lista todos os planos de estudo do usuário.
 */
export async function getStudyPlans(userId: string): Promise<StudyPlanEdital[]> {
  const q = query(
    collection(db, PLANS_COLLECTION),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => normalizeStudyPlan(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => {
      // Default sempre primeiro
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Busca um plano específico por ID.
 */
export async function getStudyPlanById(planId: string): Promise<StudyPlanEdital | null> {
  const snap = await getDoc(doc(db, PLANS_COLLECTION, planId));
  if (!snap.exists()) return null;
  return normalizeStudyPlan(snap.id, snap.data() as Record<string, unknown>);
}

/**
 * Atualiza um plano existente.
 */
export async function updateStudyPlan(
  planId: string,
  updates: Partial<
    Pick<
      StudyPlanEdital,
      | 'name'
      | 'subjects'
      | 'weeklyGoalHours'
      | 'color'
      | 'examDate'
      | 'materialWorkloadHours'
      | 'studyCapacityHours'
    >
  >
): Promise<void> {
  const ref = doc(db, PLANS_COLLECTION, planId);
  const current = await getStudyPlanById(planId);
  const merged = {
    name: updates.name ?? current?.name ?? 'Plano sem nome',
    subjects: updates.subjects ?? current?.subjects ?? [],
    weeklyGoalHours: updates.weeklyGoalHours ?? current?.weeklyGoalHours ?? 10,
    color: updates.color ?? current?.color ?? 'var(--primary)',
    examDate: Object.prototype.hasOwnProperty.call(updates, 'examDate')
      ? updates.examDate
      : current?.examDate ?? null,
    materialWorkloadHours: Object.prototype.hasOwnProperty.call(updates, 'materialWorkloadHours')
      ? updates.materialWorkloadHours
      : current?.materialWorkloadHours ?? null,
    studyCapacityHours: Object.prototype.hasOwnProperty.call(updates, 'studyCapacityHours')
      ? updates.studyCapacityHours
      : current?.studyCapacityHours ?? null,
    isDefault: current?.isDefault ?? false,
  };
  await updateDoc(ref, {
    ...buildStudyPlanPayload(merged),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Deleta um plano. Não permite deletar o plano padrão.
 */
export async function deleteStudyPlan(planId: string): Promise<void> {
  const plan = await getStudyPlanById(planId);
  if (!plan) throw new Error('Plano não encontrado.');
  if (plan.isDefault) throw new Error('Não é possível deletar o plano padrão.');
  await deleteDoc(doc(db, PLANS_COLLECTION, planId));
}

// ==========================================================
// Active Plan (contexto selecionado no Header)
// ==========================================================

/**
 * Persiste qual plano está ativo no user_stats.
 */
export async function setActivePlan(userId: string, planId: string | null): Promise<void> {
  const ref = doc(db, USER_STATS_COLLECTION, userId);
  await setDoc(ref, { activePlanId: planId ?? '' }, { merge: true });
}

/**
 * Lê o plano ativo do user_stats. Retorna '' se nenhum (= "Todos").
 */
export async function getActivePlan(userId: string): Promise<string> {
  const ref = doc(db, USER_STATS_COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return '';
  const data = snap.data();
  return typeof data.activePlanId === 'string' ? data.activePlanId : '';
}

// ==========================================================
// Dedup — remove planos "default" duplicados (bug fix)
// ==========================================================

/**
 * Se existirem múltiplos planos com isDefault=true,
 * mantém o primeiro (mais antigo) e deleta os extras.
 * Retorna a lista limpa.
 */
export async function deduplicateDefaultPlans(userId: string): Promise<StudyPlanEdital[]> {
  const allPlans = await getStudyPlans(userId);
  const defaults = allPlans.filter((p) => p.isDefault);

  if (defaults.length <= 1) return allPlans;

  // Mantém o primeiro, remove os demais
  const duplicates = defaults.slice(1);
  for (const dup of duplicates) {
    if (dup.id) {
      try {
        // Desmarca isDefault e depois deleta
        const ref = doc(db, PLANS_COLLECTION, dup.id);
        await updateDoc(ref, { isDefault: false });
        await deleteDoc(ref);
      } catch (err) {
        console.warn('Erro ao remover plano duplicado:', err);
      }
    }
  }

  // Retorna lista atualizada
  return getStudyPlans(userId);
}

// ==========================================================
// Migração — criar plano "Geral" e taguear sessões existentes
// ==========================================================

/**
 * Executa migração 1x: cria plano "Geral" e associa sessions/questions existentes.
 * Retorna o ID do plano default criado (ou existente).
 *
 * Idempotente: se o plano "Geral" já existe, retorna o ID sem duplicar.
 * Protegido contra race condition (StrictMode chama useEffect 2x).
 */
export async function migrateToMultiPlan(userId: string): Promise<string> {
  // Lock: se já há uma migração em andamento, espera ela terminar
  if (migrationInProgress) return migrationInProgress;

  migrationInProgress = _doMigrate(userId);
  try {
    return await migrationInProgress;
  } finally {
    migrationInProgress = null;
  }
}

async function _doMigrate(userId: string): Promise<string> {
  // 1. Verifica se já tem planos
  const existingPlans = await getStudyPlans(userId);
  const defaultPlan = existingPlans.find((p) => p.isDefault);
  if (defaultPlan?.id) return defaultPlan.id;

  // 2. Lê planSubjects do user_stats (se existir)
  let migratedSubjects: SubjectWeight[] = [];
  let migratedGoal = 10;
  try {
    const statsRef = doc(db, USER_STATS_COLLECTION, userId);
    const statsSnap = await getDoc(statsRef);
    if (statsSnap.exists()) {
      const data = statsSnap.data();
      if (Array.isArray(data.planSubjects)) {
        migratedSubjects = data.planSubjects;
      }
      if (typeof data.weeklyGoalHours === 'number') {
        migratedGoal = data.weeklyGoalHours;
      }
    }
  } catch {
    // Segue com defaults
  }

  // 3. Cria plano "Geral"
  const planId = await createStudyPlan(userId, {
    name: 'Geral',
    subjects: migratedSubjects,
    weeklyGoalHours: migratedGoal,
    color: 'var(--primary)',
    isDefault: true,
  });

  // 4. Tagueia sessões existentes que não têm planId (batch)
  try {
    const sessionsQ = query(
      collection(db, SESSIONS_COLLECTION),
      where('userId', '==', userId)
    );
    const sessionsSnap = await getDocs(sessionsQ);
    const untagged = sessionsSnap.docs.filter((d) => !d.data().planId);

    // Firestore batch limit = 500
    const BATCH_SIZE = 500;
    for (let i = 0; i < untagged.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = untagged.slice(i, i + BATCH_SIZE);
      for (const d of chunk) {
        batch.update(d.ref, { planId });
      }
      await batch.commit();
    }
  } catch (err) {
    console.warn('Aviso: não foi possível taguear sessões existentes:', err);
  }

  // 5. Tagueia questions_stats existentes
  try {
    const questionsQ = query(
      collection(db, QUESTIONS_COLLECTION),
      where('userId', '==', userId)
    );
    const questionsSnap = await getDocs(questionsQ);
    const untagged = questionsSnap.docs.filter((d) => !d.data().planId);

    const BATCH_SIZE = 500;
    for (let i = 0; i < untagged.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = untagged.slice(i, i + BATCH_SIZE);
      for (const d of chunk) {
        batch.update(d.ref, { planId });
      }
      await batch.commit();
    }
  } catch (err) {
    console.warn('Aviso: não foi possível taguear questões existentes:', err);
  }

  // 6. Seta como plano ativo
  await setActivePlan(userId, planId);

  return planId;
}
