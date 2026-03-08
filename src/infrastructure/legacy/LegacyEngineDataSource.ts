import type {
  EngineDataSource,
  LoadPlanEngineContextParams,
  LoadPlanEngineContextResult,
  LoadAllPlanEngineContextsParams,
  LoadAllPlanEngineContextsResult,
} from '@/application/ports/EngineDataSource';
import type {
  PlanEngineContext,
  PlanInput,
  QuestionSessionInput,
  StudySessionInput,
  SubjectPlanInput,
} from '@/domain/types';

const USER_STATS_COLLECTION = 'user_stats';
const STUDY_PLANS_COLLECTION = 'study_plans';
const STUDY_SESSIONS_COLLECTION = 'sessions';
const QUESTION_SESSIONS_COLLECTION = 'questions_stats';
const DEFAULT_USER_PRIORITY = 3;
const DEFAULT_PLAN_COLOR = '#8b5cf6';

type FirestoreScalar = string | number | boolean | null;
type FirestoreJsonValue =
  | FirestoreScalar
  | FirestoreJsonValue[]
  | { [key: string]: FirestoreJsonValue };

interface FirestoreJsonDocumentResult {
  ok: boolean;
  exists?: boolean;
  status?: number;
  error?: string;
  data?: Record<string, FirestoreJsonValue>;
}

interface FirestoreJsonQueryResult {
  ok: boolean;
  status?: number;
  error?: string;
  documents?: Array<{
    id: string;
    data: Record<string, FirestoreJsonValue>;
  }>;
}

function primitiveToFirestoreValue(value: FirestoreScalar) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { integerValue: String(value) };
    }
    return { doubleValue: value };
  }

  return { nullValue: null };
}

function firestoreValueToJson(
  value: Record<string, unknown>
): FirestoreJsonValue {
  if ('stringValue' in value) return String(value.stringValue ?? '');
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return String(value.timestampValue ?? '');

  if ('arrayValue' in value) {
    const rawArray = value.arrayValue;
    if (!rawArray || typeof rawArray !== 'object') return [];
    const values = Array.isArray((rawArray as { values?: unknown[] }).values)
      ? (rawArray as { values: Record<string, unknown>[] }).values
      : [];
    return values.map((item) => firestoreValueToJson(item));
  }

  if ('mapValue' in value) {
    const rawMap = value.mapValue;
    if (!rawMap || typeof rawMap !== 'object') return {};
    const fields = ((rawMap as { fields?: Record<string, unknown> }).fields ??
      {}) as Record<string, Record<string, unknown>>;

    const json: Record<string, FirestoreJsonValue> = {};
    for (const [key, nested] of Object.entries(fields)) {
      json[key] = firestoreValueToJson(nested);
    }
    return json;
  }

  return null;
}

function fromFirestoreFields(
  fields: Record<string, unknown> | undefined
): Record<string, FirestoreJsonValue> {
  if (!fields) return {};

  const data: Record<string, FirestoreJsonValue> = {};
  for (const [key, raw] of Object.entries(fields)) {
    if (!raw || typeof raw !== 'object') continue;
    data[key] = firestoreValueToJson(raw as Record<string, unknown>);
  }

  return data;
}

function decodeJwtPayload(idToken: string): Record<string, unknown> | null {
  try {
    const parts = idToken.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '='
    );
    const json = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function resolveProjectId(idToken: string): string | null {
  const payload = decodeJwtPayload(idToken);
  const aud =
    payload && typeof payload.aud === 'string' ? payload.aud : null;
  if (aud) return aud;

  const issuer = payload && typeof payload.iss === 'string' ? payload.iss : '';
  const marker = 'securetoken.google.com/';
  const markerIndex = issuer.indexOf(marker);

  if (markerIndex >= 0) {
    const fromIssuer = issuer.slice(markerIndex + marker.length).trim();
    if (fromIssuer) return fromIssuer;
  }

  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    null
  );
}

function buildDocumentUrl(
  projectId: string,
  collection: string,
  documentId: string
): string {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${encodeURIComponent(documentId)}`;
}

function buildRunQueryUrl(projectId: string): string {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
}

function documentNameToId(name: string | undefined): string {
  if (!name) return '';
  const parts = name.split('/');
  return parts[parts.length - 1] || '';
}

function asString(value: FirestoreJsonValue | undefined): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asNumber(value: FirestoreJsonValue | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asBoolean(value: FirestoreJsonValue | undefined): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function asObject(
  value: FirestoreJsonValue | undefined
): Record<string, FirestoreJsonValue> | null {
  if (!value || Array.isArray(value) || typeof value !== 'object') return null;
  return value as Record<string, FirestoreJsonValue>;
}

function asArray(value: FirestoreJsonValue | undefined): FirestoreJsonValue[] {
  return Array.isArray(value) ? value : [];
}

function normalizePlanId(planId?: string | null): string | null {
  if (!planId) return null;
  const trimmed = planId.trim();
  return trimmed ? trimmed : null;
}

function compareDateDesc<T extends { date: string }>(a: T, b: T): number {
  return b.date.localeCompare(a.date);
}

function toSubjectPlanInput(
  value: FirestoreJsonValue
): SubjectPlanInput | null {
  const raw = asObject(value);
  if (!raw) return null;

  const subject = asString(raw.subject);
  const weight = asNumber(raw.weight);

  if (!subject || weight === null) return null;

  return {
    subject,
    weight,
    priorityOverride: asNumber(raw.priorityOverride),
  };
}

function toPlanInput(
  planId: string,
  data: Record<string, FirestoreJsonValue>
): PlanInput {
  return {
    planId,
    name: asString(data.name) ?? 'Plano sem nome',
    subjects: asArray(data.subjects)
      .map(toSubjectPlanInput)
      .filter((item): item is SubjectPlanInput => item !== null),
    weeklyGoalHours: asNumber(data.weeklyGoalHours) ?? 10,
    examDate: asString(data.examDate),
    color: asString(data.color) ?? DEFAULT_PLAN_COLOR,
    userPriority: asNumber(data.userPriority) ?? DEFAULT_USER_PRIORITY,
  };
}

function toStudySessionInput(
  data: Record<string, FirestoreJsonValue>
): StudySessionInput | null {
  const subject = asString(data.subject);
  const durationSeconds = asNumber(data.duration);
  const date = asString(data.date);

  if (!subject || durationSeconds === null || !date) {
    return null;
  }

  return {
    subject,
    durationSeconds,
    date,
    source: asString(data.source) === 'manual' ? 'manual' : 'timer',
  };
}

function toQuestionSessionInput(
  data: Record<string, FirestoreJsonValue>
): QuestionSessionInput | null {
  const subject = asString(data.subject);
  const totalQuestions = asNumber(data.totalQuestions);
  const correctAnswers = asNumber(data.correctAnswers);
  const date = asString(data.date);

  if (!subject || totalQuestions === null || correctAnswers === null || !date) {
    return null;
  }

  return {
    subject,
    totalQuestions,
    correctAnswers,
    date,
  };
}

function matchesStudyPlan(planId: string, data: Record<string, FirestoreJsonValue>): boolean {
  return normalizePlanId(asString(data.planId)) === planId;
}

function matchesQuestionPlan(planId: string, data: Record<string, FirestoreJsonValue>): boolean {
  const storedPlanId = normalizePlanId(asString(data.planId));
  return storedPlanId === planId || storedPlanId === null;
}

async function getDocument(
  idToken: string,
  collection: string,
  documentId: string
): Promise<FirestoreJsonDocumentResult> {
  const projectId = resolveProjectId(idToken);
  if (!projectId) {
    return { ok: false, error: 'FIREBASE_PROJECT_ID não configurado.' };
  }

  try {
    const response = await fetch(buildDocumentUrl(projectId, collection, documentId), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (response.status === 404) {
      return { ok: true, exists: false, status: 404 };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        ok: false,
        status: response.status,
        error: errorText || 'Falha ao ler documento no Firestore.',
      };
    }

    const body = (await response.json()) as {
      fields?: Record<string, unknown>;
    };

    return {
      ok: true,
      exists: true,
      status: response.status,
      data: fromFirestoreFields(body.fields),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro de rede ao ler documento no Firestore.',
    };
  }
}

async function queryDocumentsByUser(
  idToken: string,
  collection: string,
  userId: string
): Promise<FirestoreJsonQueryResult> {
  const projectId = resolveProjectId(idToken);
  if (!projectId) {
    return { ok: false, error: 'FIREBASE_PROJECT_ID não configurado.' };
  }

  try {
    const response = await fetch(buildRunQueryUrl(projectId), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collection }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'userId' },
              op: 'EQUAL',
              value: primitiveToFirestoreValue(userId),
            },
          },
        },
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        ok: false,
        status: response.status,
        error: errorText || 'Falha ao consultar coleção no Firestore.',
      };
    }

    const body = (await response.json()) as Array<{
      document?: {
        name?: string;
        fields?: Record<string, unknown>;
      };
    }>;

    const documents = body
      .filter((item) => item.document)
      .map((item) => ({
        id: documentNameToId(item.document?.name),
        data: fromFirestoreFields(item.document?.fields),
      }));

    return { ok: true, status: response.status, documents };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro de rede ao consultar coleção no Firestore.',
    };
  }
}

export class LegacyEngineDataSource implements EngineDataSource {
  constructor(private readonly idToken: string) { }

  async loadPlanEngineContext(
    params: LoadPlanEngineContextParams
  ): Promise<LoadPlanEngineContextResult> {
    const explicitPlanId = normalizePlanId(params.planId);
    let resolvedPlanId = explicitPlanId;

    if (!resolvedPlanId) {
      const userStats = await getDocument(
        this.idToken,
        USER_STATS_COLLECTION,
        params.userId
      );

      if (!userStats.ok) {
        throw new Error(
          userStats.error || 'Falha ao carregar o plano ativo do usuário.'
        );
      }

      resolvedPlanId = normalizePlanId(asString(userStats.data?.activePlanId));
    }

    if (!resolvedPlanId) {
      return { found: false, reason: 'no_active_plan' };
    }

    const planDocument = await getDocument(
      this.idToken,
      STUDY_PLANS_COLLECTION,
      resolvedPlanId
    );

    if (!planDocument.ok) {
      throw new Error(planDocument.error || 'Falha ao carregar o plano.');
    }

    if (!planDocument.exists || !planDocument.data) {
      return { found: false, reason: 'plan_not_found' };
    }

    if (asString(planDocument.data.userId) !== params.userId) {
      return { found: false, reason: 'plan_not_found' };
    }

    const [sessionQuery, questionQuery] = await Promise.all([
      queryDocumentsByUser(this.idToken, STUDY_SESSIONS_COLLECTION, params.userId),
      queryDocumentsByUser(this.idToken, QUESTION_SESSIONS_COLLECTION, params.userId),
    ]);

    if (!sessionQuery.ok) {
      throw new Error(
        sessionQuery.error || 'Falha ao carregar sessões de estudo.'
      );
    }

    if (!questionQuery.ok) {
      throw new Error(
        questionQuery.error || 'Falha ao carregar sessões de questões.'
      );
    }

    const allTimeStudyFrom =
      params.window.allTimeStudySessionsFrom ?? '1900-01-01';
    const allTimeQuestionFrom =
      params.window.allTimeQuestionSessionsFrom ?? '1900-01-01';

    const allTimeSessions = (sessionQuery.documents ?? [])
      .filter((item) => matchesStudyPlan(resolvedPlanId, item.data))
      .map((item) => toStudySessionInput(item.data))
      .filter((item): item is StudySessionInput => item !== null)
      .filter((item) => item.date >= allTimeStudyFrom)
      .sort(compareDateDesc);

    const sessions = allTimeSessions.filter(
      (item) => item.date >= params.window.studySessionsFrom
    );

    const allTimeQuestions = (questionQuery.documents ?? [])
      .filter((item) => matchesQuestionPlan(resolvedPlanId, item.data))
      .map((item) => toQuestionSessionInput(item.data))
      .filter((item): item is QuestionSessionInput => item !== null)
      .filter((item) => item.date >= allTimeQuestionFrom)
      .sort(compareDateDesc);

    const questions = allTimeQuestions.filter(
      (item) => item.date >= params.window.questionSessionsFrom
    );

    const context: PlanEngineContext = {
      plan: toPlanInput(resolvedPlanId, planDocument.data),
      sessions,
      questions,
      allTimeSessions,
      allTimeQuestions,
      today: params.today,
    };

    return {
      found: true,
      context,
    };
  }

  async loadAllPlanEngineContexts(
    params: LoadAllPlanEngineContextsParams
  ): Promise<LoadAllPlanEngineContextsResult> {
    const plansQuery = await queryDocumentsByUser(
      this.idToken,
      STUDY_PLANS_COLLECTION,
      params.userId
    );

    if (!plansQuery.ok || !plansQuery.documents) {
      throw new Error(plansQuery.error || 'Falha ao carregar os planos.');
    }

    const plansData = plansQuery.documents.filter((doc) => {
      // If we need to filter only active ones we could do it here, but generally 
      // all returned are user plans. Let's include everything or add logic later.
      return asString(doc.data.userId) === params.userId;
    });

    if (plansData.length === 0) {
      return { found: true, contexts: [] };
    }

    const [sessionQuery, questionQuery] = await Promise.all([
      queryDocumentsByUser(this.idToken, STUDY_SESSIONS_COLLECTION, params.userId),
      queryDocumentsByUser(this.idToken, QUESTION_SESSIONS_COLLECTION, params.userId),
    ]);

    if (!sessionQuery.ok) {
      throw new Error(
        sessionQuery.error || 'Falha ao carregar sessões de estudo.'
      );
    }

    if (!questionQuery.ok) {
      throw new Error(
        questionQuery.error || 'Falha ao carregar sessões de questões.'
      );
    }

    const allTimeStudyFrom =
      params.window.allTimeStudySessionsFrom ?? '1900-01-01';
    const allTimeQuestionFrom =
      params.window.allTimeQuestionSessionsFrom ?? '1900-01-01';

    const contexts: PlanEngineContext[] = [];

    for (const planDoc of plansData) {
      const planId = planDoc.id;
      const planInput = toPlanInput(planId, planDoc.data);

      const allTimeSessions = (sessionQuery.documents ?? [])
        .filter((item) => matchesStudyPlan(planId, item.data))
        .map((item) => toStudySessionInput(item.data))
        .filter((item): item is StudySessionInput => item !== null)
        .filter((item) => item.date >= allTimeStudyFrom)
        .sort(compareDateDesc);

      const sessions = allTimeSessions.filter(
        (item) => item.date >= params.window.studySessionsFrom
      );

      const allTimeQuestions = (questionQuery.documents ?? [])
        .filter((item) => matchesQuestionPlan(planId, item.data))
        .map((item) => toQuestionSessionInput(item.data))
        .filter((item): item is QuestionSessionInput => item !== null)
        .filter((item) => item.date >= allTimeQuestionFrom)
        .sort(compareDateDesc);

      const questions = allTimeQuestions.filter(
        (item) => item.date >= params.window.questionSessionsFrom
      );

      contexts.push({
        plan: planInput,
        sessions,
        questions,
        allTimeSessions,
        allTimeQuestions,
        today: params.today,
      });
    }

    return { found: true, contexts };
  }
}
