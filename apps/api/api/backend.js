// ../../packages/infrastructure-firebase/src/index.ts
function getFirebaseApiKey() {
  return process.env.FIREBASE_WEB_API_KEY || process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || null;
}
async function verifyFirebaseIdToken(idToken) {
  const apiKey = getFirebaseApiKey();
  if (!apiKey) return null;
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store"
    }
  );
  if (!response.ok) return null;
  const data = await response.json();
  const uid = data.users?.[0]?.localId;
  if (!uid) return null;
  return {
    uid,
    email: data.users?.[0]?.email || null
  };
}
async function findFirebaseUserByEmail(email) {
  const apiKey = getFirebaseApiKey();
  const normalizedEmail = email.trim().toLowerCase();
  if (!apiKey || !normalizedEmail) return null;
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: [normalizedEmail] }),
      cache: "no-store"
    }
  );
  if (!response.ok) return null;
  const data = await response.json();
  const uid = data.users?.[0]?.localId;
  if (!uid) return null;
  return {
    uid,
    email: data.users?.[0]?.email || normalizedEmail
  };
}
function primitiveToFirestoreValue(value) {
  if (value === null || value === void 0) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  return { stringValue: String(value) };
}
function toFirestoreFields(data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === void 0) continue;
    fields[key] = primitiveToFirestoreValue(value);
  }
  return fields;
}
function firestoreValueToPrimitive(value) {
  if ("stringValue" in value) return String(value.stringValue ?? "");
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("nullValue" in value) return null;
  return void 0;
}
function fromFirestoreFields(fields) {
  if (!fields) return {};
  const data = {};
  for (const [key, raw] of Object.entries(fields)) {
    if (!raw || typeof raw !== "object") continue;
    data[key] = firestoreValueToPrimitive(raw);
  }
  return data;
}
function getProjectId() {
  return process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null;
}
function decodeJwtPayload(idToken) {
  try {
    const parts = idToken.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + (4 - base64.length % 4) % 4,
      "="
    );
    const json = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}
function getProjectIdFromIdToken(idToken) {
  const payload = decodeJwtPayload(idToken);
  if (!payload) return null;
  const aud = typeof payload.aud === "string" ? payload.aud : null;
  if (aud) return aud;
  const iss = typeof payload.iss === "string" ? payload.iss : "";
  const marker = "securetoken.google.com/";
  const idx = iss.indexOf(marker);
  if (idx >= 0) {
    const fromIss = iss.slice(idx + marker.length).trim();
    if (fromIss) return fromIss;
  }
  return null;
}
function getResolvedProjectId(idToken) {
  const projectIdFromToken = getProjectIdFromIdToken(idToken);
  const projectIdFromEnv = getProjectId();
  const projectId = projectIdFromToken || projectIdFromEnv;
  if (projectIdFromToken && projectIdFromEnv && projectIdFromToken !== projectIdFromEnv) {
    console.warn(
      `[infrastructure-firebase] Project mismatch: token=${projectIdFromToken} env=${projectIdFromEnv}. Using token project.`
    );
  }
  return projectId;
}
function buildCollectionUrl(projectId, collection) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`;
}
function buildDocumentUrl(projectId, collection, documentId) {
  return `${buildCollectionUrl(projectId, collection)}/${encodeURIComponent(
    documentId
  )}`;
}
async function createFirestoreDocumentWithUserToken(params) {
  const projectId = getResolvedProjectId(params.idToken);
  if (!projectId) {
    return { ok: false, error: "FIREBASE_PROJECT_ID n\xE3o configurado." };
  }
  const url = buildCollectionUrl(projectId, params.collection);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.idToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fields: toFirestoreFields(params.data)
      }),
      cache: "no-store"
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        error: errText || "Falha ao escrever documento no Firestore."
      };
    }
    return { ok: true, status: res.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro de rede ao escrever no Firestore."
    };
  }
}
async function getFirestoreDocumentWithUserToken(params) {
  const projectId = getResolvedProjectId(params.idToken);
  if (!projectId) {
    return { ok: false, error: "FIREBASE_PROJECT_ID n\xE3o configurado." };
  }
  const url = buildDocumentUrl(projectId, params.collection, params.documentId);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${params.idToken}`,
        "Content-Type": "application/json"
      },
      cache: "no-store"
    });
    if (res.status === 404) {
      return { ok: true, exists: false, status: 404 };
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        error: errText || "Falha ao ler documento no Firestore."
      };
    }
    const body = await res.json();
    return {
      ok: true,
      exists: true,
      status: res.status,
      updateTime: body.updateTime,
      data: fromFirestoreFields(body.fields)
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro de rede ao ler no Firestore."
    };
  }
}
async function listFirestoreDocumentsWithUserToken(params) {
  const projectId = getResolvedProjectId(params.idToken);
  if (!projectId) {
    return { ok: false, error: "FIREBASE_PROJECT_ID n\xE3o configurado." };
  }
  const searchParams = new URLSearchParams();
  if (params.pageSize && Number.isFinite(params.pageSize) && params.pageSize > 0) {
    searchParams.set("pageSize", String(Math.floor(params.pageSize)));
  }
  const baseUrl = buildCollectionUrl(projectId, params.collection);
  const url = searchParams.toString() ? `${baseUrl}?${searchParams.toString()}` : baseUrl;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${params.idToken}`,
        "Content-Type": "application/json"
      },
      cache: "no-store"
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        error: errText || "Falha ao listar documentos no Firestore."
      };
    }
    const body = await res.json();
    const documents = (body.documents || []).flatMap((document) => {
      if (!document?.name) return [];
      const rawId = document.name.split("/").pop();
      if (!rawId) return [];
      return [{
        id: decodeURIComponent(rawId),
        updateTime: document.updateTime,
        data: fromFirestoreFields(document.fields)
      }];
    });
    return {
      ok: true,
      status: res.status,
      documents
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro de rede ao listar documentos no Firestore."
    };
  }
}
async function setFirestoreDocumentWithUserToken(params) {
  const projectId = getResolvedProjectId(params.idToken);
  if (!projectId) {
    return { ok: false, error: "FIREBASE_PROJECT_ID n\xE3o configurado." };
  }
  const searchParams = new URLSearchParams();
  if (params.createOnly) {
    searchParams.set("currentDocument.exists", "false");
  } else if (params.currentUpdateTime) {
    searchParams.set("currentDocument.updateTime", params.currentUpdateTime);
  }
  const query = searchParams.toString();
  const baseUrl = buildDocumentUrl(projectId, params.collection, params.documentId);
  const url = query ? `${baseUrl}?${query}` : baseUrl;
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${params.idToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fields: toFirestoreFields(params.data)
      }),
      cache: "no-store"
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        error: errText || "Falha ao salvar documento no Firestore."
      };
    }
    return { ok: true, status: res.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro de rede ao salvar no Firestore."
    };
  }
}

// ../../packages/infrastructure-firebase/src/LegacyEngineDataSource.ts
var USER_STATS_COLLECTION = "user_stats";
var STUDY_PLANS_COLLECTION = "study_plans";
var STUDY_SESSIONS_COLLECTION = "sessions";
var QUESTION_SESSIONS_COLLECTION = "questions_stats";
var DEFAULT_USER_PRIORITY = 3;
var DEFAULT_PLAN_COLOR = "#8b5cf6";
function primitiveToFirestoreValue2(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return { integerValue: String(value) };
    }
    return { doubleValue: value };
  }
  return { nullValue: null };
}
function firestoreValueToJson(value) {
  if ("stringValue" in value) return String(value.stringValue ?? "");
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return String(value.timestampValue ?? "");
  if ("arrayValue" in value) {
    const rawArray = value.arrayValue;
    if (!rawArray || typeof rawArray !== "object") return [];
    const values = Array.isArray(rawArray.values) ? rawArray.values : [];
    return values.map((item) => firestoreValueToJson(item));
  }
  if ("mapValue" in value) {
    const rawMap = value.mapValue;
    if (!rawMap || typeof rawMap !== "object") return {};
    const fields = rawMap.fields ?? {};
    const json = {};
    for (const [key, nested] of Object.entries(fields)) {
      json[key] = firestoreValueToJson(nested);
    }
    return json;
  }
  return null;
}
function fromFirestoreFields2(fields) {
  if (!fields) return {};
  const data = {};
  for (const [key, raw] of Object.entries(fields)) {
    if (!raw || typeof raw !== "object") continue;
    data[key] = firestoreValueToJson(raw);
  }
  return data;
}
function decodeJwtPayload2(idToken) {
  try {
    const parts = idToken.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + (4 - base64.length % 4) % 4,
      "="
    );
    const json = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}
function resolveProjectId(idToken) {
  const payload = decodeJwtPayload2(idToken);
  const aud = payload && typeof payload.aud === "string" ? payload.aud : null;
  if (aud) return aud;
  const issuer = payload && typeof payload.iss === "string" ? payload.iss : "";
  const marker = "securetoken.google.com/";
  const markerIndex = issuer.indexOf(marker);
  if (markerIndex >= 0) {
    const fromIssuer = issuer.slice(markerIndex + marker.length).trim();
    if (fromIssuer) return fromIssuer;
  }
  return process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null;
}
function buildDocumentUrl2(projectId, collection, documentId) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${encodeURIComponent(documentId)}`;
}
function buildRunQueryUrl(projectId) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
}
function documentNameToId(name) {
  if (!name) return "";
  const parts = name.split("/");
  return parts[parts.length - 1] || "";
}
function asString(value) {
  return typeof value === "string" && value.trim() ? value : null;
}
function asNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function asObject(value) {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  return value;
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function normalizePlanId(planId) {
  if (!planId) return null;
  const trimmed = planId.trim();
  return trimmed ? trimmed : null;
}
function compareDateDesc(a, b) {
  return b.date.localeCompare(a.date);
}
function toSubjectPlanInput(value) {
  const raw = asObject(value);
  if (!raw) return null;
  const subject = asString(raw.subject);
  const weight = asNumber(raw.weight);
  if (!subject || weight === null) return null;
  return {
    subject,
    weight,
    priorityOverride: asNumber(raw.priorityOverride)
  };
}
function toPlanInput(planId, data) {
  return {
    planId,
    name: asString(data.name) ?? "Plano sem nome",
    subjects: asArray(data.subjects).map(toSubjectPlanInput).filter((item) => item !== null),
    weeklyGoalHours: asNumber(data.weeklyGoalHours) ?? 10,
    examDate: asString(data.examDate),
    color: asString(data.color) ?? DEFAULT_PLAN_COLOR,
    userPriority: asNumber(data.userPriority) ?? DEFAULT_USER_PRIORITY
  };
}
function toStudySessionInput(data) {
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
    source: asString(data.source) === "manual" ? "manual" : "timer"
  };
}
function toQuestionSessionInput(data) {
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
    date
  };
}
function matchesStudyPlan(planId, data) {
  return normalizePlanId(asString(data.planId)) === planId;
}
function matchesQuestionPlan(planId, data) {
  const storedPlanId = normalizePlanId(asString(data.planId));
  return storedPlanId === planId || storedPlanId === null;
}
async function getDocument(idToken, collection, documentId) {
  const projectId = resolveProjectId(idToken);
  if (!projectId) {
    return { ok: false, error: "FIREBASE_PROJECT_ID n\xE3o configurado." };
  }
  try {
    const response = await fetch(buildDocumentUrl2(projectId, collection, documentId), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json"
      },
      cache: "no-store"
    });
    if (response.status === 404) {
      return { ok: true, exists: false, status: 404 };
    }
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        ok: false,
        status: response.status,
        error: errorText || "Falha ao ler documento no Firestore."
      };
    }
    const body = await response.json();
    return {
      ok: true,
      exists: true,
      status: response.status,
      data: fromFirestoreFields2(body.fields)
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro de rede ao ler documento no Firestore."
    };
  }
}
async function queryDocumentsByUser(idToken, collection, userId) {
  const projectId = resolveProjectId(idToken);
  if (!projectId) {
    return { ok: false, error: "FIREBASE_PROJECT_ID n\xE3o configurado." };
  }
  try {
    const response = await fetch(buildRunQueryUrl(projectId), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collection }],
          where: {
            fieldFilter: {
              field: { fieldPath: "userId" },
              op: "EQUAL",
              value: primitiveToFirestoreValue2(userId)
            }
          }
        }
      }),
      cache: "no-store"
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        ok: false,
        status: response.status,
        error: errorText || "Falha ao consultar cole\xE7\xE3o no Firestore."
      };
    }
    const body = await response.json();
    const documents = body.filter((item) => item.document).map((item) => ({
      id: documentNameToId(item.document?.name),
      data: fromFirestoreFields2(item.document?.fields)
    }));
    return { ok: true, status: response.status, documents };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro de rede ao consultar cole\xE7\xE3o no Firestore."
    };
  }
}
var LegacyEngineDataSource = class {
  constructor(idToken) {
    this.idToken = idToken;
  }
  async loadPlanEngineContext(params) {
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
          userStats.error || "Falha ao carregar o plano ativo do usu\xE1rio."
        );
      }
      resolvedPlanId = normalizePlanId(asString(userStats.data?.activePlanId));
    }
    if (!resolvedPlanId) {
      return { found: false, reason: "no_active_plan" };
    }
    const planDocument = await getDocument(
      this.idToken,
      STUDY_PLANS_COLLECTION,
      resolvedPlanId
    );
    if (!planDocument.ok) {
      console.warn(`[EngineDataSource] Failed to fetch plan ${resolvedPlanId}:`, planDocument.error);
      return { found: false, reason: "plan_not_found" };
    }
    if (!planDocument.exists || !planDocument.data) {
      return { found: false, reason: "plan_not_found" };
    }
    if (asString(planDocument.data.userId) !== params.userId) {
      return { found: false, reason: "plan_not_found" };
    }
    const [sessionQuery, questionQuery] = await Promise.all([
      queryDocumentsByUser(this.idToken, STUDY_SESSIONS_COLLECTION, params.userId),
      queryDocumentsByUser(this.idToken, QUESTION_SESSIONS_COLLECTION, params.userId)
    ]);
    if (!sessionQuery.ok) {
      throw new Error(
        sessionQuery.error || "Falha ao carregar sess\xF5es de estudo."
      );
    }
    if (!questionQuery.ok) {
      throw new Error(
        questionQuery.error || "Falha ao carregar sess\xF5es de quest\xF5es."
      );
    }
    const allTimeStudyFrom = params.window.allTimeStudySessionsFrom ?? "1900-01-01";
    const allTimeQuestionFrom = params.window.allTimeQuestionSessionsFrom ?? "1900-01-01";
    const allTimeSessions = (sessionQuery.documents ?? []).filter((item) => matchesStudyPlan(resolvedPlanId, item.data)).map((item) => toStudySessionInput(item.data)).filter((item) => item !== null).filter((item) => item.date >= allTimeStudyFrom).sort(compareDateDesc);
    const sessions = allTimeSessions.filter(
      (item) => item.date >= params.window.studySessionsFrom
    );
    const allTimeQuestions = (questionQuery.documents ?? []).filter((item) => matchesQuestionPlan(resolvedPlanId, item.data)).map((item) => toQuestionSessionInput(item.data)).filter((item) => item !== null).filter((item) => item.date >= allTimeQuestionFrom).sort(compareDateDesc);
    const questions = allTimeQuestions.filter(
      (item) => item.date >= params.window.questionSessionsFrom
    );
    const context = {
      plan: toPlanInput(resolvedPlanId, planDocument.data),
      sessions,
      questions,
      allTimeSessions,
      allTimeQuestions,
      today: params.today
    };
    return {
      found: true,
      context
    };
  }
  async loadAllPlanEngineContexts(params) {
    const plansQuery = await queryDocumentsByUser(
      this.idToken,
      STUDY_PLANS_COLLECTION,
      params.userId
    );
    if (!plansQuery.ok || !plansQuery.documents) {
      throw new Error(plansQuery.error || "Falha ao carregar os planos.");
    }
    const plansData = plansQuery.documents.filter((doc) => {
      return asString(doc.data.userId) === params.userId;
    });
    if (plansData.length === 0) {
      return { found: true, contexts: [] };
    }
    const [sessionQuery, questionQuery] = await Promise.all([
      queryDocumentsByUser(this.idToken, STUDY_SESSIONS_COLLECTION, params.userId),
      queryDocumentsByUser(this.idToken, QUESTION_SESSIONS_COLLECTION, params.userId)
    ]);
    if (!sessionQuery.ok) {
      throw new Error(
        sessionQuery.error || "Falha ao carregar sess\xF5es de estudo."
      );
    }
    if (!questionQuery.ok) {
      throw new Error(
        questionQuery.error || "Falha ao carregar sess\xF5es de quest\xF5es."
      );
    }
    const allTimeStudyFrom = params.window.allTimeStudySessionsFrom ?? "1900-01-01";
    const allTimeQuestionFrom = params.window.allTimeQuestionSessionsFrom ?? "1900-01-01";
    const contexts = [];
    for (const planDoc of plansData) {
      const planId = planDoc.id;
      const planInput = toPlanInput(planId, planDoc.data);
      const allTimeSessions = (sessionQuery.documents ?? []).filter((item) => matchesStudyPlan(planId, item.data)).map((item) => toStudySessionInput(item.data)).filter((item) => item !== null).filter((item) => item.date >= allTimeStudyFrom).sort(compareDateDesc);
      const sessions = allTimeSessions.filter(
        (item) => item.date >= params.window.studySessionsFrom
      );
      const allTimeQuestions = (questionQuery.documents ?? []).filter((item) => matchesQuestionPlan(planId, item.data)).map((item) => toQuestionSessionInput(item.data)).filter((item) => item !== null).filter((item) => item.date >= allTimeQuestionFrom).sort(compareDateDesc);
      const questions = allTimeQuestions.filter(
        (item) => item.date >= params.window.questionSessionsFrom
      );
      contexts.push({
        plan: planInput,
        sessions,
        questions,
        allTimeSessions,
        allTimeQuestions,
        today: params.today
      });
    }
    return { found: true, contexts };
  }
};

// ../../packages/domain/src/enums.ts
var SubjectHealthStatus = {
  /** High consistency and performance */
  Healthy: "healthy",
  /** Top tier: High consistency AND performance >= 80% */
  Mature: "mature",
  /** Slight deviation in volume or performance */
  Warning: "warning",
  /** High deviation or critical negligence in high-weight subject */
  Critical: "critical",
  /** > 7-10 days without contact */
  Neglected: "neglected",
  /** High volume but low performance (< 60%) */
  Inefficient: "inefficient",
  /** High theory volume but zero/few questions */
  BlindSpot: "blind_spot",
  /** No data in the last 30 days */
  NoData: "no_data"
};
var SubjectStrategicState = {
  /** Focus on retention (e.g., Mature) */
  Maintenance: "maintenance",
  /** Regular theory/practice cycles (e.g., Healthy) */
  ActiveGrowth: "active_growth",
  /** Immediate effort to cover gaps (e.g., Critical/Neglected) */
  Recovery: "recovery"
};
var STRATEGIC_STATE_SEVERITY = {
  [SubjectHealthStatus.Critical]: 1,
  [SubjectHealthStatus.Neglected]: 2,
  [SubjectHealthStatus.Inefficient]: 3,
  [SubjectHealthStatus.BlindSpot]: 3,
  [SubjectHealthStatus.Warning]: 4,
  [SubjectHealthStatus.Healthy]: 5,
  [SubjectHealthStatus.Mature]: 6,
  [SubjectHealthStatus.NoData]: 7
};
var RecommendationType = {
  /** Subject in critical/neglected > 7 days — immediate rescue session */
  Rescue: "rescue",
  /** Effort distribution deviated > 20% from target — redistribute hours */
  Rebalance: "rebalance",
  /** High effort but low accuracy (< 60%) — switch to questions */
  Deepen: "deepen",
  /** Subject healthy — maintain rhythm */
  Maintain: "maintain",
  /** Subject exceeding goals in effort and accuracy — celebrate */
  Celebrate: "celebrate",
  /** Overtraining detected (effort > 150% sustained) — moderate */
  Rest: "rest",
  /** Exam < 30 days, high-weight subject with low health — intensive mode */
  ExamPush: "exam_push",
  /** High theory volume but zero/few questions — force assessment */
  Diagnostic: "diagnostic"
};
var RecommendationUrgency = {
  Immediate: "immediate",
  // Exemplo: Executar hoje obrigatoriamente
  High: "high",
  // Priorizar na semana
  Medium: "medium",
  // Agendar normalmente
  Low: "low"
  // Cumprir se tiver tempo livre
};
var PriorityBand = {
  /** Score ≥ 80 — must act today */
  Critical: 1,
  /** Score 60–79 — act this week */
  High: 2,
  /** Score 40–59 — scheduled attention */
  Medium: 3,
  /** Score 20–39 — low urgency */
  Low: 4,
  /** Score < 20 — optional / maintenance */
  Optional: 5
};
var ExamPhase = {
  /** No exam date or > 90 days. Broad coverage, regular rhythm */
  Building: "building",
  /** 30–90 days. Balance theory & questions, identify gaps */
  Consolidating: "consolidating",
  /** 15–30 days. Focus on questions & review, close effort gaps */
  Sprinting: "sprinting",
  /** < 15 days. Only high-weight subjects, pure review */
  FinalPush: "final_push",
  /** Exam date has passed */
  PostExam: "post_exam"
};

// ../../packages/domain/src/billing/types.ts
var PlanCode = {
  Free: "free",
  Pro: "pro"
};
var SubscriptionStatus = {
  Trialing: "trialing",
  Active: "active",
  PastDue: "past_due",
  GracePeriod: "grace_period",
  Canceled: "canceled",
  Expired: "expired"
};
var AccessState = {
  Full: "full",
  Restricted: "restricted",
  FreeFallback: "free_fallback"
};
var EntitlementMode = {
  Boolean: "boolean",
  Quota: "quota"
};
var EntitlementPeriod = {
  Month: "month",
  Lifetime: "lifetime"
};
var FeatureCode = {
  StudyTimer: "study_timer",
  DashboardBasic: "dashboard_basic",
  ActivePlans: "active_plans",
  QuestionsPracticeBasic: "questions_practice_basic",
  SimulationsBasic: "simulations_basic",
  SimulationsCustom: "simulations_custom",
  SimulationsAnalytics: "simulations_analytics",
  SubjectHealthBasic: "subject_health_basic",
  SubjectHealthFull: "subject_health_full",
  PriorityDay: "priority_day",
  PriorityScoreFull: "priority_score_full",
  RecommendationsBasic: "recommendations_basic",
  RecommendationsFull: "recommendations_full",
  WeeklyDiagnostic: "weekly_diagnostic",
  AdaptiveDailyPlan: "adaptive_daily_plan",
  RecoveryPlan: "recovery_plan",
  MultiEdital: "multi_edital",
  EditalParse: "edital_parse",
  AiExplanations: "ai_explanations",
  ContextualAiChat: "contextual_ai_chat",
  WeeklyMentoring: "weekly_mentoring",
  ErrorGapAnalyzer: "error_gap_analyzer",
  PostSimuladoInteligente: "post_simulado_inteligente"
};

// ../../packages/domain/src/billing/entitlement-policy.ts
var EFFECTIVELY_UNLIMITED_MONTHLY_LIMIT = 9999;
function createPlan(plan, template) {
  return {
    plan,
    features: template
  };
}
var DEFAULT_ENTITLEMENT_POLICY = {
  plans: {
    [PlanCode.Free]: createPlan(PlanCode.Free, {
      [FeatureCode.StudyTimer]: { mode: EntitlementMode.Boolean, enabled: true },
      [FeatureCode.DashboardBasic]: { mode: EntitlementMode.Boolean, enabled: true },
      [FeatureCode.ActivePlans]: {
        mode: EntitlementMode.Quota,
        limit: 1,
        period: EntitlementPeriod.Month
      },
      [FeatureCode.QuestionsPracticeBasic]: {
        mode: EntitlementMode.Boolean,
        enabled: true
      },
      [FeatureCode.SimulationsBasic]: {
        mode: EntitlementMode.Quota,
        limit: 2,
        period: EntitlementPeriod.Month
      },
      [FeatureCode.SimulationsCustom]: {
        mode: EntitlementMode.Boolean,
        enabled: false
      },
      [FeatureCode.SimulationsAnalytics]: {
        mode: EntitlementMode.Boolean,
        enabled: false
      },
      [FeatureCode.SubjectHealthBasic]: { mode: EntitlementMode.Boolean, enabled: true },
      [FeatureCode.SubjectHealthFull]: { mode: EntitlementMode.Boolean, enabled: false },
      [FeatureCode.PriorityDay]: { mode: EntitlementMode.Boolean, enabled: true },
      [FeatureCode.PriorityScoreFull]: { mode: EntitlementMode.Boolean, enabled: false },
      [FeatureCode.RecommendationsBasic]: { mode: EntitlementMode.Boolean, enabled: true },
      [FeatureCode.RecommendationsFull]: { mode: EntitlementMode.Boolean, enabled: false },
      [FeatureCode.WeeklyDiagnostic]: { mode: EntitlementMode.Boolean, enabled: false },
      [FeatureCode.AdaptiveDailyPlan]: { mode: EntitlementMode.Boolean, enabled: false },
      [FeatureCode.RecoveryPlan]: { mode: EntitlementMode.Boolean, enabled: false },
      [FeatureCode.MultiEdital]: { mode: EntitlementMode.Boolean, enabled: false },
      [FeatureCode.EditalParse]: {
        mode: EntitlementMode.Quota,
        limit: 1,
        period: EntitlementPeriod.Lifetime
      },
      [FeatureCode.AiExplanations]: {
        mode: EntitlementMode.Quota,
        limit: 3,
        period: EntitlementPeriod.Month
      },
      [FeatureCode.ContextualAiChat]: {
        mode: EntitlementMode.Quota,
        limit: 5,
        period: EntitlementPeriod.Month
      },
      [FeatureCode.WeeklyMentoring]: {
        mode: EntitlementMode.Quota,
        limit: 0,
        period: EntitlementPeriod.Month
      },
      [FeatureCode.ErrorGapAnalyzer]: {
        mode: EntitlementMode.Boolean,
        enabled: false
      },
      [FeatureCode.PostSimuladoInteligente]: {
        mode: EntitlementMode.Quota,
        limit: 0,
        period: EntitlementPeriod.Month
      }
    }),
    [PlanCode.Pro]: createPlan(PlanCode.Pro, {
      [FeatureCode.StudyTimer]: { mode: EntitlementMode.Boolean, enabled: true },
      [FeatureCode.DashboardBasic]: { mode: EntitlementMode.Boolean, enabled: true },
      [FeatureCode.ActivePlans]: {
        mode: EntitlementMode.Quota,
        limit: 3,
        period: EntitlementPeriod.Month
      },
      [FeatureCode.QuestionsPracticeBasic]: {
        mode: EntitlementMode.Boolean,
        enabled: true
      },
      [FeatureCode.SimulationsBasic]: {
        mode: EntitlementMode.Quota,
        limit: EFFECTIVELY_UNLIMITED_MONTHLY_LIMIT,
        period: EntitlementPeriod.Month
      },
      [FeatureCode.SimulationsCustom]: {
        mode: EntitlementMode.Boolean,
        enabled: true
      },
      [FeatureCode.SimulationsAnalytics]: {
        mode: EntitlementMode.Boolean,
        enabled: true
      },
      [FeatureCode.SubjectHealthBasic]: { mode: EntitlementMode.Boolean, enabled: true },
      [FeatureCode.SubjectHealthFull]: { mode: EntitlementMode.Boolean, enabled: true },
      [FeatureCode.PriorityDay]: { mode: EntitlementMode.Boolean, enabled: true },
      [FeatureCode.PriorityScoreFull]: { mode: EntitlementMode.Boolean, enabled: true },
      [FeatureCode.RecommendationsBasic]: { mode: EntitlementMode.Boolean, enabled: true },
      [FeatureCode.RecommendationsFull]: { mode: EntitlementMode.Boolean, enabled: true },
      [FeatureCode.WeeklyDiagnostic]: { mode: EntitlementMode.Boolean, enabled: true },
      [FeatureCode.AdaptiveDailyPlan]: { mode: EntitlementMode.Boolean, enabled: true },
      [FeatureCode.RecoveryPlan]: { mode: EntitlementMode.Boolean, enabled: true },
      [FeatureCode.MultiEdital]: { mode: EntitlementMode.Boolean, enabled: true },
      [FeatureCode.EditalParse]: {
        mode: EntitlementMode.Quota,
        limit: 10,
        period: EntitlementPeriod.Month
      },
      [FeatureCode.AiExplanations]: {
        mode: EntitlementMode.Quota,
        limit: 300,
        period: EntitlementPeriod.Month
      },
      [FeatureCode.ContextualAiChat]: {
        mode: EntitlementMode.Quota,
        limit: 150,
        period: EntitlementPeriod.Month
      },
      [FeatureCode.WeeklyMentoring]: {
        mode: EntitlementMode.Quota,
        limit: 8,
        period: EntitlementPeriod.Month
      },
      [FeatureCode.ErrorGapAnalyzer]: {
        mode: EntitlementMode.Boolean,
        enabled: true
      },
      [FeatureCode.PostSimuladoInteligente]: {
        mode: EntitlementMode.Quota,
        limit: 8,
        period: EntitlementPeriod.Month
      }
    })
  },
  statusBehavior: {
    [SubscriptionStatus.Trialing]: {
      accessState: AccessState.Full
    },
    [SubscriptionStatus.Active]: {
      accessState: AccessState.Full
    },
    [SubscriptionStatus.PastDue]: {
      accessState: AccessState.Restricted,
      disabledFeatures: [
        FeatureCode.MultiEdital,
        FeatureCode.AdaptiveDailyPlan,
        FeatureCode.RecoveryPlan,
        FeatureCode.EditalParse,
        FeatureCode.AiExplanations,
        FeatureCode.ContextualAiChat,
        FeatureCode.WeeklyMentoring,
        FeatureCode.ErrorGapAnalyzer,
        FeatureCode.PostSimuladoInteligente
      ]
    },
    [SubscriptionStatus.GracePeriod]: {
      accessState: AccessState.Full
    },
    [SubscriptionStatus.Canceled]: {
      accessState: AccessState.Full
    },
    [SubscriptionStatus.Expired]: {
      accessState: AccessState.FreeFallback,
      fallbackPlan: PlanCode.Free
    }
  }
};

// ../../packages/domain/src/billing/resolve-user-entitlements.ts
function toUsageValue(value) {
  if (!Number.isFinite(value) || value == null) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}
function applyRule(rule, used, disabled) {
  if (rule.mode === EntitlementMode.Boolean) {
    return {
      mode: EntitlementMode.Boolean,
      enabled: rule.enabled && !disabled
    };
  }
  const limit = disabled ? 0 : rule.limit;
  const remaining = Math.max(0, limit - used);
  return {
    mode: EntitlementMode.Quota,
    enabled: limit > 0 && remaining > 0,
    limit,
    used,
    remaining,
    period: rule.period
  };
}
function resolveUserEntitlements(input, policy = DEFAULT_ENTITLEMENT_POLICY) {
  let resolvedStatus = input.status;
  if (input.billingPeriodEnd) {
    const periodEnd = typeof input.billingPeriodEnd === "string" ? new Date(input.billingPeriodEnd) : input.billingPeriodEnd;
    if (Date.now() > periodEnd.getTime()) {
      resolvedStatus = "expired";
    }
  }
  const behavior = policy.statusBehavior[resolvedStatus];
  const effectivePlan = behavior.fallbackPlan ?? input.plan;
  const template = policy.plans[effectivePlan];
  const disabledFeatures = new Set(behavior.disabledFeatures ?? []);
  const features = Object.fromEntries(
    Object.entries(template.features).map(([featureCode, rule]) => {
      const used = toUsageValue(input.usage?.[featureCode]);
      return [
        featureCode,
        applyRule(rule, used, disabledFeatures.has(featureCode))
      ];
    })
  );
  return {
    catalogPlan: input.plan,
    effectivePlan,
    status: resolvedStatus,
    accessState: behavior.accessState,
    features
  };
}

// ../../packages/domain/src/billing/usage-periods.ts
function getEffectivePlan(plan, status, policy) {
  const behavior = policy.statusBehavior[status];
  return behavior?.fallbackPlan ?? plan;
}
function getPeriodBucket(period, now) {
  if (period === EntitlementPeriod.Lifetime) {
    return "lifetime";
  }
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}
function materializeCurrentFeatureUsage(input) {
  if (!input.usage || Object.keys(input.usage).length === 0) {
    return void 0;
  }
  const policy = input.policy ?? DEFAULT_ENTITLEMENT_POLICY;
  const effectivePlan = getEffectivePlan(input.plan, input.status, policy);
  const template = policy.plans[effectivePlan];
  const now = input.now ?? /* @__PURE__ */ new Date();
  const entries = Object.entries(input.usage).flatMap(([featureCode, rawValue]) => {
    const rule = template.features[featureCode];
    if (!rule || rule.mode !== EntitlementMode.Quota) {
      return [];
    }
    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return [];
    }
    const expectedBucket = getPeriodBucket(rule.period, now);
    const storedBucket = input.usagePeriods?.[featureCode];
    const currentValue = !storedBucket || storedBucket === expectedBucket ? Math.max(0, Math.floor(numericValue)) : 0;
    if (currentValue <= 0) {
      return [];
    }
    return [[featureCode, currentValue]];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : void 0;
}
function buildFeatureUsagePeriods(input) {
  if (!input.usage || Object.keys(input.usage).length === 0) {
    return void 0;
  }
  const policy = input.policy ?? DEFAULT_ENTITLEMENT_POLICY;
  const effectivePlan = getEffectivePlan(input.plan, input.status, policy);
  const template = policy.plans[effectivePlan];
  const now = input.now ?? /* @__PURE__ */ new Date();
  const entries = Object.entries(input.usage).flatMap(([featureCode, rawValue]) => {
    const rule = template.features[featureCode];
    if (!rule || rule.mode !== EntitlementMode.Quota) {
      return [];
    }
    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return [];
    }
    return [[featureCode, getPeriodBucket(rule.period, now)]];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : void 0;
}

// ../../packages/domain/src/policies/engine-policy.ts
var DEFAULT_ENGINE_POLICY = {
  engineVersion: "2026-03-08.v1",
  health: {
    windows: {
      rollingVolumeDays: 7,
      rollingFrequencyDays: 14,
      rollingPerformanceDays: 30,
      noDataDays: 30
    },
    sample: {
      minQuestionsForPerformance: 15,
      minQuestionsForInefficiency: 20,
      minStudySessionSeconds: 60,
      minQuestionSessionQuestions: 5
    },
    scoreWeights: {
      withPerformance: {
        performance: 0.35,
        volume: 0.25,
        adherence: 0.2,
        recency: 0.1,
        frequency: 0.1
      },
      withoutPerformance: {
        volume: 0.4,
        adherence: 0.3,
        recency: 0.2,
        frequency: 0.1
      }
    },
    frequency: {
      idealContactsByWeight: [
        { minWeight: 15, value: 5 },
        { minWeight: 10, maxWeight: 14.99, value: 4 },
        { minWeight: 5, maxWeight: 9.99, value: 3 },
        { maxWeight: 4.99, value: 2 }
      ]
    },
    recency: {
      safetyLimitDaysByWeight: [
        { minWeight: 10, value: 3 },
        { minWeight: 5, maxWeight: 9.99, value: 5 },
        { maxWeight: 4.99, value: 7 }
      ],
      scoreDecayPerExtraDay: 15
    },
    adherence: {
      understudyPenaltyMultiplier: 2,
      overstudyPenaltyMultiplier: 1
    },
    statusThresholds: {
      healthyMinOverall: 70,
      matureMinOverall: 80,
      matureMinPerformance: 80,
      warningMinOverall: 50,
      criticalMaxOverall: 49,
      criticalMinWeight: 8,
      neglectedMinNegativeDeviation: 25,
      neglectedMinWeightForShortRecencyWindow: 5,
      neglectedMaxDaysSinceStudyHighWeight: 5,
      neglectedMaxDaysSinceStudyDefault: 10,
      criticalMinNegativeDeviation: 50,
      criticalMaxDaysSinceStudy: 10,
      blindSpotMinVolume: 80,
      inefficientMinVolume: 100,
      inefficientMaxPerformance: 60,
      noDataMaxRecentStudyDays: 30
    }
  },
  priority: {
    weights: {
      weight: 0.3,
      deviation: 0.25,
      recency: 0.2,
      accuracy: 0.15,
      examProximity: 0.1
    },
    factors: {
      recencyPointsPerDayWithoutStudy: 10,
      maxRecencyFactor: 100,
      examProximityFactorMultiplier: 20,
      missingPerformanceFallbackFactor: 50,
      noDataRecencyFactor: 0
    },
    bands: [
      { minScore: 80, band: PriorityBand.Critical },
      { minScore: 60, band: PriorityBand.High },
      { minScore: 40, band: PriorityBand.Medium },
      { minScore: 20, band: PriorityBand.Low },
      { minScore: 0, band: PriorityBand.Optional }
    ],
    phaseOverrides: [
      {
        examPhase: ExamPhase.Building,
        weights: {
          weight: 0.4,
          deviation: 0.2,
          recency: 0.15,
          accuracy: 0.15,
          examProximity: 0.1
        }
      },
      {
        examPhase: ExamPhase.Consolidating,
        weights: {
          weight: 0.25,
          deviation: 0.2,
          recency: 0.15,
          accuracy: 0.25,
          examProximity: 0.15
        }
      },
      {
        examPhase: ExamPhase.Sprinting,
        weights: {
          weight: 0.2,
          deviation: 0.35,
          recency: 0.2,
          accuracy: 0.15,
          examProximity: 0.1
        }
      },
      {
        examPhase: ExamPhase.FinalPush,
        minWeight: 10
      }
    ]
  },
  recommendations: {
    actionableStatuses: [
      SubjectHealthStatus.Critical,
      SubjectHealthStatus.Neglected,
      SubjectHealthStatus.Inefficient,
      SubjectHealthStatus.BlindSpot,
      SubjectHealthStatus.Warning,
      SubjectHealthStatus.Healthy,
      SubjectHealthStatus.Mature,
      SubjectHealthStatus.NoData
    ],
    maxRecommendations: 5,
    statusRouting: {
      [SubjectHealthStatus.Critical]: {
        type: RecommendationType.Rescue,
        urgency: RecommendationUrgency.Immediate,
        dueWindow: "today"
      },
      [SubjectHealthStatus.Neglected]: {
        type: RecommendationType.Rescue,
        urgency: RecommendationUrgency.High,
        dueWindow: "this_week"
      },
      [SubjectHealthStatus.Inefficient]: {
        type: RecommendationType.Deepen,
        urgency: RecommendationUrgency.High,
        dueWindow: "this_week"
      },
      [SubjectHealthStatus.BlindSpot]: {
        type: RecommendationType.Diagnostic,
        urgency: RecommendationUrgency.High,
        dueWindow: "this_week"
      },
      [SubjectHealthStatus.Warning]: {
        type: RecommendationType.Rebalance,
        urgency: RecommendationUrgency.Medium,
        dueWindow: "this_week"
      },
      [SubjectHealthStatus.Healthy]: {
        type: RecommendationType.Maintain,
        urgency: RecommendationUrgency.Low,
        dueWindow: "routine"
      },
      [SubjectHealthStatus.Mature]: {
        type: RecommendationType.Celebrate,
        urgency: RecommendationUrgency.Low,
        dueWindow: "routine"
      },
      [SubjectHealthStatus.NoData]: {
        type: RecommendationType.Diagnostic,
        urgency: RecommendationUrgency.Medium,
        dueWindow: "routine"
      }
    },
    examPush: {
      enabled: true,
      eligiblePhases: [ExamPhase.Sprinting, ExamPhase.FinalPush],
      minWeight: 10,
      excludedStatuses: [SubjectHealthStatus.Mature],
      routing: {
        type: RecommendationType.ExamPush,
        urgency: RecommendationUrgency.Immediate,
        dueWindow: "today"
      }
    }
  }
};
function resolveTierValue(weight, tiers) {
  const match = tiers.find((tier) => {
    const respectsMin = tier.minWeight === void 0 || weight >= tier.minWeight;
    const respectsMax = tier.maxWeight === void 0 || weight <= tier.maxWeight;
    return respectsMin && respectsMax;
  });
  if (!match) {
    throw new Error(`No policy tier matched weight ${weight}.`);
  }
  return match.value;
}
function resolvePriorityBand(score, policy = DEFAULT_ENGINE_POLICY) {
  const match = policy.priority.bands.find((bandRule) => score >= bandRule.minScore);
  if (!match) {
    throw new Error(`No priority band matched score ${score}.`);
  }
  return match.band;
}

// ../../packages/domain/src/value-objects.ts
function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
var URGENCY_TABLE = [
  { maxDays: 0, multiplier: 1, phase: ExamPhase.PostExam },
  { maxDays: 15, multiplier: 3, phase: ExamPhase.FinalPush },
  { maxDays: 30, multiplier: 2.2, phase: ExamPhase.Sprinting },
  { maxDays: 60, multiplier: 1.7, phase: ExamPhase.Consolidating },
  { maxDays: 90, multiplier: 1.3, phase: ExamPhase.Consolidating },
  { maxDays: Infinity, multiplier: 1, phase: ExamPhase.Building }
];
function computeUrgency(daysToExam) {
  if (daysToExam === null) {
    return { multiplier: 1, phase: ExamPhase.Building };
  }
  if (daysToExam < 0) {
    return { multiplier: 1, phase: ExamPhase.PostExam };
  }
  for (const tier of URGENCY_TABLE) {
    if (tier.maxDays === 0) continue;
    if (daysToExam <= tier.maxDays) {
      return { multiplier: tier.multiplier, phase: tier.phase };
    }
  }
  return { multiplier: 1, phase: ExamPhase.Building };
}
function createPlanningWindow(params) {
  let daysToExam = null;
  if (params.examDate) {
    const examMs = new Date(params.examDate).getTime();
    const todayMs = new Date(params.today).getTime();
    daysToExam = Math.ceil((examMs - todayMs) / (1e3 * 60 * 60 * 24));
  }
  const { multiplier, phase } = computeUrgency(daysToExam);
  return {
    type: params.type,
    startDate: params.startDate,
    endDate: params.endDate,
    availableHours: params.availableHours,
    daysToExam,
    examPhase: phase,
    urgencyMultiplier: multiplier
  };
}
function daysBetween(dateA, dateB) {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.abs(Math.ceil((b - a) / (1e3 * 60 * 60 * 24)));
}
var URGENCY_FACTOR_TABLE = [
  { maxDays: 15, factor: 100 },
  { maxDays: 30, factor: 85 },
  { maxDays: 60, factor: 65 },
  { maxDays: 90, factor: 45 },
  { maxDays: 180, factor: 25 },
  { maxDays: Infinity, factor: 10 }
];
function computeUrgencyFactor(daysToExam) {
  if (daysToExam === null) return 15;
  if (daysToExam < 0) return 5;
  for (const tier of URGENCY_FACTOR_TABLE) {
    if (daysToExam <= tier.maxDays) return tier.factor;
  }
  return 10;
}

// ../../packages/domain/src/services/SubjectHealthComputer.ts
function shiftIsoDate(date, days) {
  const [year, month, day] = date.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
}
function sumStudyHours(sessions) {
  return sessions.reduce((sum, session) => sum + session.durationSeconds / 3600, 0);
}
function countDistinctStudyDays(sessions) {
  return new Set(sessions.map((session) => session.date)).size;
}
function latestDate(items) {
  if (items.length === 0) return null;
  return [...items].sort((a, b) => b.date.localeCompare(a.date))[0].date;
}
function filterStudySessions(sessions, startDate, endDate, minDurationSeconds) {
  return sessions.filter(
    (session) => session.durationSeconds >= minDurationSeconds && session.date >= startDate && session.date <= endDate
  );
}
function filterQuestionSessions(questions, startDate, endDate, minQuestions) {
  return questions.filter(
    (session) => session.totalQuestions >= minQuestions && session.date >= startDate && session.date <= endDate
  );
}
function strategicStateForStatus(status) {
  if (status === SubjectHealthStatus.Critical || status === SubjectHealthStatus.Neglected || status === SubjectHealthStatus.Inefficient) {
    return SubjectStrategicState.Recovery;
  }
  if (status === SubjectHealthStatus.Mature) {
    return SubjectStrategicState.Maintenance;
  }
  return SubjectStrategicState.ActiveGrowth;
}
function computeAllSubjectHealth(ctx, policy = DEFAULT_ENGINE_POLICY) {
  const { plan, today } = ctx;
  return plan.subjects.map(
    (subjectPlan) => calculateSubjectHealth(
      subjectPlan.subject,
      subjectPlan.weight,
      subjectPlan.priorityOverride,
      plan.planId,
      plan.weeklyGoalHours,
      ctx.sessions,
      ctx.questions,
      ctx.allTimeSessions,
      ctx.allTimeQuestions,
      today,
      policy
    )
  );
}
function calculateSubjectHealth(subject, weight, priorityOverride, planId, weeklyGoalHours, recentSessions, recentQuestions, allTimeSessions, allTimeQuestions, today, policy = DEFAULT_ENGINE_POLICY) {
  const subjectRecentSessions = recentSessions.filter((session) => session.subject === subject);
  const subjectRecentQuestions = recentQuestions.filter((question) => question.subject === subject);
  const subjectAllTimeSessions = allTimeSessions.filter((session) => session.subject === subject);
  const subjectAllTimeQuestions = allTimeQuestions.filter((question) => question.subject === subject);
  const raw = computeAggregatedMetrics(
    subjectRecentSessions,
    subjectRecentQuestions,
    recentSessions,
    subjectAllTimeSessions,
    subjectAllTimeQuestions,
    weeklyGoalHours,
    weight,
    today,
    policy
  );
  const metrics = computeSubScores(raw, weight, policy);
  const status = determineStatus(metrics, raw, weight, policy);
  const strategicState = strategicStateForStatus(status);
  const priorityScore = priorityOverride !== null ? clampScore((6 - priorityOverride) * 20) : 0;
  const priorityBand = priorityOverride !== null ? resolvePriorityBand(priorityScore, policy) : PriorityBand.Optional;
  return {
    subject,
    planId,
    weight,
    status,
    strategicState,
    metrics,
    raw,
    priority: {
      score: priorityScore,
      band: priorityBand,
      influencingFactors: {
        weight: 0,
        deviation: 0,
        recency: 0,
        accuracy: 0,
        proximity: 0
      },
      reasons: []
    },
    priorityScore,
    priorityBand
  };
}
function computeAggregatedMetrics(subjectSessions, subjectQuestions, allRecentSessions, allSubjectSessions, allSubjectQuestions, weeklyGoalHours, weight, today, policy) {
  const volumeWindowStart = shiftIsoDate(
    today,
    -(policy.health.windows.rollingVolumeDays - 1)
  );
  const frequencyWindowStart = shiftIsoDate(
    today,
    -(policy.health.windows.rollingFrequencyDays - 1)
  );
  const performanceWindowStart = shiftIsoDate(
    today,
    -(policy.health.windows.rollingPerformanceDays - 1)
  );
  const filteredRecentSessions = filterStudySessions(
    allRecentSessions,
    volumeWindowStart,
    today,
    policy.health.sample.minStudySessionSeconds
  );
  const filteredSubjectRecentSessions = filterStudySessions(
    subjectSessions,
    volumeWindowStart,
    today,
    policy.health.sample.minStudySessionSeconds
  );
  const filteredSubjectFrequencySessions = filterStudySessions(
    subjectSessions,
    frequencyWindowStart,
    today,
    policy.health.sample.minStudySessionSeconds
  );
  const filteredSubjectRecentQuestions = filterQuestionSessions(
    subjectQuestions,
    performanceWindowStart,
    today,
    policy.health.sample.minQuestionSessionQuestions
  );
  const filteredAllSubjectSessions = allSubjectSessions.filter(
    (session) => session.durationSeconds >= policy.health.sample.minStudySessionSeconds
  );
  const filteredAllSubjectQuestions = allSubjectQuestions.filter(
    (question) => question.totalQuestions >= policy.health.sample.minQuestionSessionQuestions
  );
  const weeklyTargetHours = weight / 100 * weeklyGoalHours;
  const weeklyActualHours = sumStudyHours(filteredSubjectRecentSessions);
  const weeklyTotalHours = sumStudyHours(filteredRecentSessions);
  const targetSharePercent = weight;
  const actualSharePercent = weeklyTotalHours > 0 ? weeklyActualHours / weeklyTotalHours * 100 : 0;
  const deviationPercent = weeklyTargetHours > 0 ? (weeklyActualHours - weeklyTargetHours) / weeklyTargetHours * 100 : 0;
  const recentQuestionsCount = filteredSubjectRecentQuestions.reduce(
    (sum, question) => sum + question.totalQuestions,
    0
  );
  const recentCorrectAnswers = filteredSubjectRecentQuestions.reduce(
    (sum, question) => sum + question.correctAnswers,
    0
  );
  const recentAccuracy = recentQuestionsCount >= policy.health.sample.minQuestionsForPerformance ? recentCorrectAnswers / recentQuestionsCount * 100 : null;
  const lastStudyDate = latestDate(filteredAllSubjectSessions);
  const lastQuestionDate = latestDate(filteredAllSubjectQuestions);
  return {
    weeklyActualHours,
    weeklyTargetHours,
    weeklyTotalHours,
    actualSharePercent,
    targetSharePercent,
    deviationPercent,
    distinctStudyDays: countDistinctStudyDays(filteredSubjectFrequencySessions),
    daysSinceLastStudy: lastStudyDate ? daysBetween(lastStudyDate, today) : 999,
    daysSinceLastQuestion: lastQuestionDate ? daysBetween(lastQuestionDate, today) : null,
    recentAccuracy,
    totalHoursAllTime: sumStudyHours(filteredAllSubjectSessions),
    totalQuestionsAllTime: filteredAllSubjectQuestions.reduce(
      (sum, question) => sum + question.totalQuestions,
      0
    ),
    recentQuestionsCount
  };
}
function computeSubScores(raw, weight, policy) {
  const volumeScore = raw.weeklyTargetHours > 0 ? Math.min(150, raw.weeklyActualHours / raw.weeklyTargetHours * 100) : raw.weeklyActualHours > 0 ? 100 : 0;
  const idealContacts = resolveTierValue(
    weight,
    policy.health.frequency.idealContactsByWeight
  );
  const frequencyScore = clampScore(
    raw.distinctStudyDays / idealContacts * 100
  );
  const shareDelta = Math.abs(raw.actualSharePercent - raw.targetSharePercent);
  const adherencePenalty = raw.actualSharePercent < raw.targetSharePercent ? policy.health.adherence.understudyPenaltyMultiplier : policy.health.adherence.overstudyPenaltyMultiplier;
  const adherenceScore = clampScore(100 - shareDelta * adherencePenalty);
  const safetyLimit = resolveTierValue(
    weight,
    policy.health.recency.safetyLimitDaysByWeight
  );
  const recencyScore = raw.daysSinceLastStudy <= safetyLimit ? 100 : clampScore(
    100 - (raw.daysSinceLastStudy - safetyLimit) * policy.health.recency.scoreDecayPerExtraDay
  );
  const performanceScore = raw.recentAccuracy;
  const cappedVolume = Math.min(100, volumeScore);
  const overallScore = performanceScore !== null ? clampScore(
    performanceScore * policy.health.scoreWeights.withPerformance.performance + cappedVolume * policy.health.scoreWeights.withPerformance.volume + adherenceScore * policy.health.scoreWeights.withPerformance.adherence + recencyScore * policy.health.scoreWeights.withPerformance.recency + frequencyScore * policy.health.scoreWeights.withPerformance.frequency
  ) : clampScore(
    cappedVolume * policy.health.scoreWeights.withoutPerformance.volume + adherenceScore * policy.health.scoreWeights.withoutPerformance.adherence + recencyScore * policy.health.scoreWeights.withoutPerformance.recency + frequencyScore * policy.health.scoreWeights.withoutPerformance.frequency
  );
  return {
    volumeScore,
    frequencyScore,
    adherenceScore,
    recencyScore,
    performanceScore,
    overallScore
  };
}
function determineStatus(metrics, raw, weight, policy) {
  const thresholds = policy.health.statusThresholds;
  if (raw.totalHoursAllTime === 0 && raw.totalQuestionsAllTime === 0) {
    return SubjectHealthStatus.NoData;
  }
  if (raw.daysSinceLastStudy > thresholds.noDataMaxRecentStudyDays) {
    return SubjectHealthStatus.NoData;
  }
  const neglectLimit = weight >= thresholds.neglectedMinWeightForShortRecencyWindow ? thresholds.neglectedMaxDaysSinceStudyHighWeight : thresholds.neglectedMaxDaysSinceStudyDefault;
  if (raw.daysSinceLastStudy >= neglectLimit && raw.totalHoursAllTime > 0) {
    return SubjectHealthStatus.Neglected;
  }
  if (metrics.volumeScore >= thresholds.inefficientMinVolume && metrics.performanceScore !== null && raw.recentQuestionsCount >= policy.health.sample.minQuestionsForInefficiency && metrics.performanceScore < thresholds.inefficientMaxPerformance) {
    return SubjectHealthStatus.Inefficient;
  }
  if (metrics.volumeScore >= thresholds.blindSpotMinVolume && metrics.performanceScore === null) {
    return SubjectHealthStatus.BlindSpot;
  }
  if (metrics.overallScore >= thresholds.matureMinOverall && metrics.performanceScore !== null && metrics.performanceScore >= thresholds.matureMinPerformance) {
    return SubjectHealthStatus.Mature;
  }
  if (metrics.overallScore >= thresholds.healthyMinOverall) {
    return SubjectHealthStatus.Healthy;
  }
  if (metrics.overallScore <= thresholds.criticalMaxOverall && weight >= thresholds.criticalMinWeight || raw.deviationPercent <= -thresholds.criticalMinNegativeDeviation || raw.daysSinceLastStudy >= thresholds.criticalMaxDaysSinceStudy) {
    return SubjectHealthStatus.Critical;
  }
  if (metrics.overallScore >= thresholds.warningMinOverall) {
    return SubjectHealthStatus.Warning;
  }
  return SubjectHealthStatus.Warning;
}

// ../../packages/domain/src/services/PriorityCalculator.ts
var DEFAULT_PRIORITY_WEIGHTS = DEFAULT_ENGINE_POLICY.priority.weights;
function isEnginePolicy(value) {
  return "priority" in value;
}
function resolvePolicy(config) {
  if (!config) return DEFAULT_ENGINE_POLICY;
  return isEnginePolicy(config) ? config : {
    ...DEFAULT_ENGINE_POLICY,
    priority: {
      ...DEFAULT_ENGINE_POLICY.priority,
      weights: config
    }
  };
}
function resolveWeights(window, policy) {
  const override = policy.priority.phaseOverrides.find(
    (rule) => rule.examPhase === window.examPhase
  );
  return {
    ...policy.priority.weights,
    ...override?.weights ?? {}
  };
}
function computeExamProximityFactor(window, policy) {
  const multiplierGap = Math.max(0, window.urgencyMultiplier - 1);
  return clampScore(
    multiplierGap * policy.priority.factors.examProximityFactorMultiplier
  );
}
function generateReasons(health, window, factors) {
  const reasons = [];
  if (health.status === SubjectHealthStatus.NoData) {
    reasons.push("Sem hist\xF3rico recente suficiente para medir a mat\xE9ria.");
    if (health.weight >= 10) {
      reasons.push(`Mat\xE9ria de peso relevante no edital (${health.weight}%).`);
    }
    if (health.raw.deviationPercent < 0) {
      reasons.push(
        `Esfor\xE7o ainda abaixo da meta semanal (${health.raw.deviationPercent.toFixed(0)}% de desvio).`
      );
    }
    if (health.metrics.performanceScore === null) {
      reasons.push("Ainda n\xE3o h\xE1 base suficiente de quest\xF5es para diagn\xF3stico completo.");
    }
    return reasons.slice(0, 3);
  }
  if (health.weight >= 10) {
    reasons.push(`Mat\xE9ria de peso relevante no edital (${health.weight}%).`);
  }
  if (window.urgencyMultiplier > 1) {
    reasons.push(
      `Proximidade da prova aumenta a urg\xEAncia (${window.examPhase}).`
    );
  }
  if (health.raw.deviationPercent < 0) {
    reasons.push(
      `Esfor\xE7o abaixo da meta semanal (${health.raw.deviationPercent.toFixed(0)}% de desvio).`
    );
  }
  if (health.raw.daysSinceLastStudy > 0) {
    reasons.push(
      `${health.raw.daysSinceLastStudy} dias sem contato com a mat\xE9ria.`
    );
  }
  if (health.metrics.performanceScore !== null && health.metrics.performanceScore < 60) {
    reasons.push(
      `Desempenho recente em quest\xF5es em ${health.metrics.performanceScore.toFixed(0)}%.`
    );
  }
  if (reasons.length >= 3) {
    return reasons.slice(0, 3);
  }
  const topFactor = Object.entries(factors).reduce(
    (current, next) => current[1] >= next[1] ? current : next
  )[0];
  if (topFactor === "weight" && !reasons.some((reason) => reason.includes("peso"))) {
    reasons.push("Peso do edital puxando a prioridade para cima.");
  }
  return reasons.slice(0, 3);
}
function calculateSubjectPriorityScore(health, window, config) {
  const policy = resolvePolicy(config);
  const weights = resolveWeights(window, policy);
  const isNoData = health.status === SubjectHealthStatus.NoData;
  const weightFactor = clampScore(health.weight);
  const deviationFactor = clampScore(Math.max(0, -health.raw.deviationPercent));
  const recencyFactor = isNoData ? policy.priority.factors.noDataRecencyFactor : clampScore(
    Math.min(
      policy.priority.factors.maxRecencyFactor,
      health.raw.daysSinceLastStudy * policy.priority.factors.recencyPointsPerDayWithoutStudy
    )
  );
  const accuracyFactor = health.metrics.performanceScore !== null ? clampScore(100 - health.metrics.performanceScore) : policy.priority.factors.missingPerformanceFallbackFactor;
  const proximityFactor = computeExamProximityFactor(window, policy);
  const rawScore = weightFactor * weights.weight + deviationFactor * weights.deviation + recencyFactor * weights.recency + accuracyFactor * weights.accuracy + proximityFactor * weights.examProximity;
  const finalScore = clampScore(rawScore * window.urgencyMultiplier);
  const band = resolvePriorityBand(finalScore, policy);
  const totalWeight = weights.weight + weights.deviation + weights.recency + weights.accuracy + weights.examProximity;
  const factors = {
    weight: weightFactor * weights.weight / totalWeight,
    deviation: deviationFactor * weights.deviation / totalWeight,
    recency: recencyFactor * weights.recency / totalWeight,
    accuracy: accuracyFactor * weights.accuracy / totalWeight,
    proximity: proximityFactor * weights.examProximity / totalWeight
  };
  return {
    score: finalScore,
    band,
    influencingFactors: factors,
    reasons: generateReasons(health, window, factors)
  };
}
function applyPriorityCalculation(healthEntries, window, config) {
  return [...healthEntries].map((health) => {
    const priority = calculateSubjectPriorityScore(health, window, config);
    return {
      ...health,
      priority,
      priorityScore: priority.score,
      priorityBand: priority.band
    };
  }).sort((a, b) => b.priority.score - a.priority.score);
}

// ../../packages/domain/src/services/RecommendationEngine.ts
function generateRecommendationsForHealthEntries(healthEntries, window, options = {}) {
  const now = options.now ?? (/* @__PURE__ */ new Date()).toISOString();
  const policy = options.policy ?? DEFAULT_ENGINE_POLICY;
  const recommendations = [];
  for (const health of healthEntries) {
    const rec = generateForSubject(health, window, now, policy);
    if (rec) {
      recommendations.push(rec);
    }
  }
  const sorted = sortRecommendations(recommendations);
  if (typeof options.maxRecommendations === "number") {
    return sorted.slice(0, options.maxRecommendations);
  }
  return sorted.slice(0, policy.recommendations.maxRecommendations);
}
function generateForSubject(health, window, now, policy) {
  const statusRule = policy.recommendations.statusRouting[health.status];
  if (!statusRule) {
    return null;
  }
  let type = statusRule.type;
  let urgency = statusRule.urgency;
  let summary;
  let suggestedAction;
  let expectedImpact;
  let dueWindow = statusRule.dueWindow;
  const { status } = health;
  const deviation = (health.metrics.volumeScore - 100).toFixed(0);
  const supportData = {
    currentStatus: status,
    effortPercent: health.metrics.volumeScore,
    accuracyPercent: health.metrics.performanceScore,
    rawDeviation: Number(deviation),
    daysSinceStudy: health.raw.daysSinceLastStudy
  };
  switch (status) {
    case SubjectHealthStatus.Critical:
      summary = `Aten\xE7\xE3o Cr\xEDtica em ${health.subject}`;
      suggestedAction = `Realizar sess\xE3o de resgate imediata, focando primariamente na revis\xE3o de lacunas.`;
      expectedImpact = `Estabilizar a performance e evitar o colapso da mat\xE9ria na reta final.`;
      break;
    case SubjectHealthStatus.Neglected:
      summary = `Mat\xE9ria Negligenciada: ${health.subject}`;
      suggestedAction = `Cobrir o gap de rec\xEAncia urgentemente com uma sess\xE3o completa de teoria leve e exerc\xEDcios.`;
      expectedImpact = `Interromper a curva de esquecimento prolongada desta disciplina.`;
      break;
    case SubjectHealthStatus.Inefficient:
      summary = `Estudo Ineficiente em ${health.subject}`;
      suggestedAction = `Interromper a leitura de teoria e focar exclusivamente na resolu\xE7\xE3o de ${health.raw.daysSinceLastStudy > 3 ? "20" : "30"} quest\xF5es dos t\xF3picos que voc\xEA mais erra.`;
      expectedImpact = `Quebrar o plat\xF4 de desempenho transformando esfor\xE7o passivo em acertos reais.`;
      break;
    case SubjectHealthStatus.BlindSpot:
      summary = `Zona Cega Ativa em ${health.subject}`;
      suggestedAction = `Executar um simulado diagn\xF3stico restrito apenas \xE0 esta mat\xE9ria. N\xE3o ler teoria antes.`;
      expectedImpact = `Aferir o n\xEDvel de profici\xEAncia e retirar o aluno da "zona te\xF3rica de conforto".`;
      break;
    case SubjectHealthStatus.Warning:
      summary = `Desvio no Volume: ${health.subject}`;
      suggestedAction = `Priorizar essa disciplina no pr\xF3ximo slot de estudos em aberto, ampliando seu or\xE7amento atual em 25%.`;
      expectedImpact = `Corrigir o d\xE9ficit inicial antes que se torne uma falha cr\xEDtica acumulada no edital.`;
      break;
    case SubjectHealthStatus.Healthy:
      summary = `Ritmo Saud\xE1vel em ${health.subject}`;
      suggestedAction = `Manter exatamente a rotina definida no ciclo de hor\xE1rios.`;
      expectedImpact = `Construir resili\xEAncia e progress\xE3o de conte\xFAdo no modelo cruzeiro de aprendizado.`;
      break;
    case SubjectHealthStatus.Mature:
      summary = `Excelente Dom\xEDnio: ${health.subject}`;
      suggestedAction = `Manuten\xE7\xE3o leve usando revis\xF5es cont\xEDnuas: substituir slot de leitura pura por Flashcards de fixa\xE7\xE3o ou discursivas curtas.`;
      expectedImpact = `Aumentar o "f\xF4lego" do seu cronograma para permitir aportes emergenciais em disciplinas de Risco.`;
      break;
    case SubjectHealthStatus.NoData:
      summary = `Iniciando: ${health.subject}`;
      suggestedAction = `Sem m\xE9tricas registradas para essa disciplina na janela recente. Realize o primeiro contato.`;
      expectedImpact = `Autorizar o Decision Engine a montar uma curva base de m\xE9tricas para sua prepara\xE7\xE3o.`;
      break;
    default:
      return null;
  }
  if (policy.recommendations.examPush.enabled && policy.recommendations.examPush.eligiblePhases.includes(window.examPhase) && health.weight >= policy.recommendations.examPush.minWeight && !policy.recommendations.examPush.excludedStatuses.includes(status)) {
    if (urgency !== RecommendationUrgency.Immediate) {
      type = policy.recommendations.examPush.routing.type;
      urgency = policy.recommendations.examPush.routing.urgency;
      summary = `Tiro Curto (Sprint) em ${health.subject}`;
      suggestedAction = `A prova se aproxima rapidamente. Suspender PDFs pesados, foque 100% no caderno de erros e lei seca para a disciplina.`;
      expectedImpact = `Converter esfor\xE7o em maximiza\xE7\xE3o marginal de pontos.`;
      dueWindow = policy.recommendations.examPush.routing.dueWindow;
    }
  }
  return {
    id: `rec:${health.planId}:${health.subject}:${type}`,
    type,
    target: health.subject,
    urgency,
    summary,
    reason: health.priority.reasons,
    // Inheriting multi-layered reasons from PriorityCalculator!
    suggestedAction,
    expectedImpact,
    dueWindow,
    priorityScore: health.priority.score,
    // Propagated for sorting
    supportData,
    createdAt: now
  };
}
var URGENCY_WEIGHT = {
  [RecommendationUrgency.Immediate]: 4,
  [RecommendationUrgency.High]: 3,
  [RecommendationUrgency.Medium]: 2,
  [RecommendationUrgency.Low]: 1
};
function sortRecommendations(recs) {
  return [...recs].sort((a, b) => {
    const uA = URGENCY_WEIGHT[a.urgency];
    const uB = URGENCY_WEIGHT[b.urgency];
    if (uA !== uB) {
      return uB - uA;
    }
    return b.priorityScore - a.priorityScore;
  });
}

// ../../packages/domain/src/services/PlanEngine.ts
function runPlanEngine(context, options = {}) {
  const policy = options.policy ?? DEFAULT_ENGINE_POLICY;
  const recommendationLimit = options.recommendationLimit ?? policy.recommendations.maxRecommendations;
  const window = createPlanningWindow({
    type: "weekly",
    startDate: context.today,
    endDate: context.today,
    availableHours: context.plan.weeklyGoalHours,
    examDate: context.plan.examDate,
    today: context.today
  });
  const prioritizedSubjects = applyPriorityCalculation(
    computeAllSubjectHealth(context, policy),
    window,
    policy
  );
  const recommendations = generateRecommendationsForHealthEntries(
    prioritizedSubjects,
    window,
    {
      policy,
      now: options.recommendationTimestamp ?? context.today,
      maxRecommendations: recommendationLimit
    }
  );
  return {
    engineVersion: policy.engineVersion,
    plan: context.plan,
    subjects: prioritizedSubjects,
    recommendations
  };
}

// ../../packages/domain/src/services/PortfolioAllocator.ts
var MIN_ALLOCATION_PERCENT = 10;
var MAX_ALLOCATION_PERCENT = 70;
var DISPERSION_THRESHOLD_HOURS = 5;
var SHARED_BONUS_PER_PLAN = 0.15;
var SHARED_BONUS_CAP = 2;
function computePortfolio(ctx) {
  const { plans, planContexts, globalWeeklyBudget, today } = ctx;
  const healthByPlan = /* @__PURE__ */ new Map();
  for (const plan of plans) {
    const planCtx = planContexts.get(plan.planId);
    if (planCtx) {
      healthByPlan.set(plan.planId, computeAllSubjectHealth(planCtx));
    }
  }
  const rankings = plans.map((plan) => {
    const health = healthByPlan.get(plan.planId) ?? [];
    return computePlanRanking(plan, health, today);
  });
  allocateBudget(rankings, globalWeeklyBudget);
  const sharedSubjects = detectSharedSubjects(plans);
  const alerts = generatePortfolioAlerts(rankings, globalWeeklyBudget, plans.length);
  const kpis = computeKPIs(rankings, globalWeeklyBudget, sharedSubjects);
  rankings.sort((a, b) => b.compositeScore - a.compositeScore);
  return {
    userId: "",
    // filled by the application layer
    plans: rankings,
    globalWeeklyBudget,
    sharedSubjects,
    alerts,
    kpis,
    computedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function computeBonusFactor(planCount) {
  if (planCount <= 1) return 1;
  return Math.min(SHARED_BONUS_CAP, 1 + SHARED_BONUS_PER_PLAN * (planCount - 1));
}
function computePlanRanking(plan, health, today) {
  let daysToExam = null;
  if (plan.examDate) {
    const examMs = new Date(plan.examDate).getTime();
    const todayMs = new Date(today).getTime();
    daysToExam = Math.ceil((examMs - todayMs) / (1e3 * 60 * 60 * 24));
  }
  const { phase } = computeUrgency(daysToExam);
  const totalWeight = health.reduce((s, h) => s + h.weight, 0);
  const healthScore = totalWeight > 0 ? health.reduce((s, h) => s + h.metrics.volumeScore * (h.weight / totalWeight), 0) : 50;
  const subjectHealthSummary = {
    healthy: health.filter((h) => h.status === SubjectHealthStatus.Healthy).length,
    mature: health.filter((h) => h.status === SubjectHealthStatus.Mature).length,
    warning: health.filter((h) => h.status === SubjectHealthStatus.Warning).length,
    critical: health.filter((h) => h.status === SubjectHealthStatus.Critical).length,
    neglected: health.filter((h) => h.status === SubjectHealthStatus.Neglected).length,
    inefficient: health.filter((h) => h.status === SubjectHealthStatus.Inefficient).length,
    blind_spot: health.filter((h) => h.status === SubjectHealthStatus.BlindSpot).length,
    no_data: health.filter((h) => h.status === SubjectHealthStatus.NoData).length
  };
  const urgencyFactor = computeUrgencyFactor(daysToExam);
  const riskFactor = clampScore(100 - healthScore);
  const userPriorityFactor = (6 - plan.userPriority) * 20;
  const overallCompletion = health.length > 0 ? health.reduce((s, h) => s + h.metrics.overallScore, 0) / health.length : 50;
  const healthDeficit = Math.max(0, 100 - overallCompletion);
  const criticalProportion = health.length > 0 ? (subjectHealthSummary.critical + subjectHealthSummary.neglected) / health.length * 100 : 0;
  const compositeScore = clampScore(
    urgencyFactor * 0.35 + riskFactor * 0.25 + userPriorityFactor * 0.2 + healthDeficit * 0.15 + criticalProportion * 0.05
  );
  return {
    planId: plan.planId,
    planName: plan.name,
    color: plan.color,
    riskScore: clampScore(riskFactor),
    urgencyScore: clampScore(urgencyFactor),
    healthScore: clampScore(healthScore),
    userPriority: plan.userPriority,
    compositeScore,
    allocatedPercent: 0,
    // filled by allocateBudget
    allocatedHours: 0,
    // filled by allocateBudget
    phase,
    daysToExam,
    subjectHealthSummary
  };
}
function allocateBudget(rankings, globalBudget) {
  if (rankings.length === 0) return;
  if (rankings.length === 1) {
    rankings[0].allocatedPercent = 100;
    rankings[0].allocatedHours = globalBudget;
    return;
  }
  const totalComposite = rankings.reduce((s, r) => s + r.compositeScore, 0);
  if (totalComposite === 0) {
    const equalPercent = 100 / rankings.length;
    for (const r of rankings) {
      r.allocatedPercent = equalPercent;
      r.allocatedHours = equalPercent / 100 * globalBudget;
    }
    return;
  }
  for (const r of rankings) {
    r.allocatedPercent = r.compositeScore / totalComposite * 100;
  }
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 10) {
    changed = false;
    iterations++;
    let excess = 0;
    let flexCount = 0;
    for (const r of rankings) {
      const maxPercent = r.phase === ExamPhase.FinalPush ? 90 : MAX_ALLOCATION_PERCENT;
      if (r.allocatedPercent < MIN_ALLOCATION_PERCENT) {
        excess += MIN_ALLOCATION_PERCENT - r.allocatedPercent;
        r.allocatedPercent = MIN_ALLOCATION_PERCENT;
        changed = true;
      } else if (r.allocatedPercent > maxPercent) {
        excess -= r.allocatedPercent - maxPercent;
        r.allocatedPercent = maxPercent;
        changed = true;
      } else {
        flexCount++;
      }
    }
    if (excess !== 0 && flexCount > 0) {
      const adjustment = excess / flexCount;
      for (const r of rankings) {
        const maxPercent = r.phase === ExamPhase.FinalPush ? 90 : MAX_ALLOCATION_PERCENT;
        if (r.allocatedPercent > MIN_ALLOCATION_PERCENT && r.allocatedPercent < maxPercent) {
          r.allocatedPercent -= adjustment;
        }
      }
    }
  }
  const totalPercent = rankings.reduce((s, r) => s + r.allocatedPercent, 0);
  if (totalPercent !== 100) {
    const factor = 100 / totalPercent;
    for (const r of rankings) {
      r.allocatedPercent *= factor;
    }
  }
  for (const r of rankings) {
    r.allocatedPercent = Math.round(r.allocatedPercent * 10) / 10;
    r.allocatedHours = Math.round(r.allocatedPercent / 100 * globalBudget * 10) / 10;
  }
}
function detectSharedSubjects(plans) {
  const subjectMap = /* @__PURE__ */ new Map();
  for (const plan of plans) {
    for (const sp of plan.subjects) {
      const normalized = normalizeSubjectName(sp.subject);
      const entry = subjectMap.get(normalized) ?? { planIds: [], weights: [] };
      entry.planIds.push(plan.planId);
      entry.weights.push(sp.weight);
      subjectMap.set(normalized, entry);
    }
  }
  const shared = [];
  for (const [subject, { planIds, weights }] of subjectMap) {
    if (planIds.length > 1) {
      shared.push({
        subject,
        planIds,
        maxWeight: Math.max(...weights),
        avgWeight: weights.reduce((a, b) => a + b, 0) / weights.length,
        bonusFactor: computeBonusFactor(planIds.length)
      });
    }
  }
  return shared.sort((a, b) => b.bonusFactor - a.bonusFactor);
}
function normalizeSubjectName(name) {
  return name.trim().toLowerCase().replace(/^d\.\s*/i, "direito ").replace(/^dir\.\s*/i, "direito ").replace(/\s+/g, " ");
}
function generatePortfolioAlerts(rankings, globalBudget, planCount) {
  const alerts = [];
  const hoursPerPlan = globalBudget / planCount;
  if (planCount > 1 && hoursPerPlan < DISPERSION_THRESHOLD_HOURS) {
    alerts.push({
      type: "dispersion",
      severity: "warning",
      message: `Dispers\xE3o detectada: ${planCount} editais ativos com ${globalBudget}h/semana resulta em ~${hoursPerPlan.toFixed(1)}h por edital. Considere congelar editais de menor prioridade.`,
      relatedPlanIds: rankings.map((r) => r.planId)
    });
  }
  for (const r of rankings) {
    if (r.riskScore > 60) {
      alerts.push({
        type: "plan_at_risk",
        severity: r.riskScore > 80 ? "critical" : "warning",
        message: `${r.planName} est\xE1 em risco (score ${r.riskScore}). ${r.subjectHealthSummary.critical + r.subjectHealthSummary.neglected} mat\xE9rias precisam de aten\xE7\xE3o.`,
        relatedPlanIds: [r.planId]
      });
    }
  }
  for (const r of rankings) {
    if (r.phase === ExamPhase.PostExam) {
      alerts.push({
        type: "exam_passed",
        severity: "info",
        message: `A prova de ${r.planName} j\xE1 aconteceu. Deseja arquivar este plano?`,
        relatedPlanIds: [r.planId]
      });
    }
  }
  const totalGoalHours = rankings.reduce((s, r) => s + r.allocatedHours, 0);
  if (totalGoalHours > globalBudget * 1.1) {
    alerts.push({
      type: "budget_exceeded",
      severity: "warning",
      message: `A soma das aloca\xE7\xF5es (${totalGoalHours.toFixed(1)}h) excede o or\xE7amento global (${globalBudget}h). Ajuste suas prioridades.`,
      relatedPlanIds: rankings.map((r) => r.planId)
    });
  }
  return alerts;
}
function computeKPIs(rankings, globalBudget, sharedSubjects) {
  const plansAtRisk = rankings.filter((r) => r.riskScore > 60).length;
  const avgHealth = rankings.length > 0 ? rankings.reduce((s, r) => s + r.healthScore, 0) / rankings.length : 0;
  const percents = rankings.map((r) => r.allocatedPercent);
  const mean = percents.length > 0 ? percents.reduce((a, b) => a + b, 0) / percents.length : 0;
  const variance = percents.length > 0 ? percents.reduce((s, p) => s + (p - mean) ** 2, 0) / percents.length : 0;
  const stddev = Math.sqrt(variance);
  const dispersionIndex = mean > 0 ? clampScore((1 - stddev / mean) * 100) : 100;
  const totalSubjects = rankings.reduce(
    (s, r) => s + Object.values(r.subjectHealthSummary).reduce((a, b) => a + b, 0),
    0
  );
  const sharedCount = sharedSubjects.reduce((s, ss) => s + ss.planIds.length, 0);
  const sharingEfficiency = totalSubjects > 0 ? clampScore(sharedCount / totalSubjects * 100) : 0;
  return {
    budgetAdherencePercent: clampScore(avgHealth),
    dispersionIndex,
    sharingEfficiencyPercent: sharingEfficiency,
    plansAtRisk
  };
}

// src/modules/entitlements/manual-subscription-state-data-source.ts
var MANUAL_SCENARIOS = [
  {
    userId: "free-user",
    plan: PlanCode.Free,
    status: SubscriptionStatus.Active,
    usage: {
      [FeatureCode.SimulationsBasic]: 1,
      [FeatureCode.AiExplanations]: 2,
      [FeatureCode.ContextualAiChat]: 1
    },
    description: "Usuario free com acesso basico e pequena degustacao de IA."
  },
  {
    userId: "pro-user",
    plan: PlanCode.Pro,
    status: SubscriptionStatus.Active,
    usage: {
      [FeatureCode.SimulationsBasic]: 4,
      [FeatureCode.AiExplanations]: 24,
      [FeatureCode.ContextualAiChat]: 15,
      [FeatureCode.WeeklyMentoring]: 1
    },
    description: "Usuario pro com motor completo single-plan."
  },
  {
    userId: "past-due-user",
    plan: PlanCode.Pro,
    status: SubscriptionStatus.PastDue,
    usage: {
      [FeatureCode.AiExplanations]: 30,
      [FeatureCode.ContextualAiChat]: 20
    },
    description: "Usuario pro com assinatura atrasada e features caras restritas."
  },
  {
    userId: "expired-user",
    plan: PlanCode.Pro,
    status: SubscriptionStatus.Expired,
    description: "Usuario pro expirado, caindo para free fallback."
  }
];
var ManualSubscriptionStateDataSource = class {
  async getUserSubscriptionState(params) {
    const scenario = MANUAL_SCENARIOS.find((item) => item.userId === params.userId);
    if (!scenario) {
      return {
        found: false,
        reason: "subscription_not_found"
      };
    }
    return {
      found: true,
      subscription: {
        userId: scenario.userId,
        plan: scenario.plan,
        status: scenario.status,
        usage: scenario.usage
      }
    };
  }
};
function listManualSubscriptionScenarios() {
  return [...MANUAL_SCENARIOS];
}

// src/modules/entitlements/subscription-state.shared.ts
var PLAN_CANDIDATE_FIELDS = [
  "planTier",
  "aiPlanTier",
  "subscriptionTier",
  "planType",
  "tier"
];
var STATUS_CANDIDATE_FIELDS = [
  "subscriptionStatus",
  "billingStatus",
  "planStatus",
  "status"
];
var USAGE_CANDIDATE_FIELDS = [
  "entitlementUsage",
  "entitlementsUsage",
  "featureUsage",
  "featureUsageJson"
];
var USAGE_PERIOD_CANDIDATE_FIELDS = [
  "entitlementUsagePeriods",
  "entitlementsUsagePeriods",
  "featureUsagePeriods",
  "featureUsagePeriodsJson"
];
var BOOTSTRAP_ADMIN_EMAILS = [
  "marsleite@gmail.com",
  "graceandradeleite@gmail.com",
  "marcelop3251@gmail.com"
];
function parseCsv(value) {
  if (!value) return [];
  return value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}
function defaultIsAdminIdentity(identity) {
  const adminUids = [
    ...parseCsv(process.env.ADMIN_UIDS),
    ...parseCsv(process.env.NEXT_PUBLIC_ADMIN_UIDS)
  ];
  const adminEmails = [
    ...BOOTSTRAP_ADMIN_EMAILS.map((item) => item.toLowerCase()),
    ...parseCsv(process.env.ADMIN_EMAILS),
    ...parseCsv(process.env.NEXT_PUBLIC_ADMIN_EMAILS)
  ];
  const uid = (identity.uid || "").trim().toLowerCase();
  const email = (identity.email || "").trim().toLowerCase();
  if (uid && adminUids.includes(uid)) return true;
  if (email && adminEmails.includes(email)) return true;
  return false;
}
function normalizePlanCode(value) {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === PlanCode.Pro) return PlanCode.Pro;
  return PlanCode.Free;
}
function normalizeSubscriptionStatus(value) {
  const normalized = (value || "").trim().toLowerCase();
  switch (normalized) {
    case SubscriptionStatus.Trialing:
      return SubscriptionStatus.Trialing;
    case SubscriptionStatus.PastDue:
    case "past-due":
      return SubscriptionStatus.PastDue;
    case SubscriptionStatus.GracePeriod:
    case "grace":
      return SubscriptionStatus.GracePeriod;
    case SubscriptionStatus.Canceled:
    case "cancelled":
      return SubscriptionStatus.Canceled;
    case SubscriptionStatus.Expired:
      return SubscriptionStatus.Expired;
    case SubscriptionStatus.Active:
    default:
      return SubscriptionStatus.Active;
  }
}
function extractPlanCode(data) {
  if (!data) return PlanCode.Free;
  for (const field of PLAN_CANDIDATE_FIELDS) {
    const raw = data[field];
    if (typeof raw === "string" && raw.trim().length > 0) {
      return normalizePlanCode(raw);
    }
  }
  return PlanCode.Free;
}
function extractSubscriptionStatus(data) {
  if (!data) return SubscriptionStatus.Active;
  for (const field of STATUS_CANDIDATE_FIELDS) {
    const raw = data[field];
    if (typeof raw === "string" && raw.trim().length > 0) {
      return normalizeSubscriptionStatus(raw);
    }
  }
  return SubscriptionStatus.Active;
}
function toFeatureUsageMap(value) {
  if (!value) return void 0;
  const parsed = typeof value === "string" ? (() => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  })() : value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return void 0;
  }
  const usageEntries = Object.entries(parsed).flatMap(([featureCode, rawValue]) => {
    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      return [];
    }
    return [[featureCode, Math.floor(numericValue)]];
  });
  return usageEntries.length > 0 ? Object.fromEntries(usageEntries) : void 0;
}
function toFeatureUsagePeriodMap(value) {
  if (!value) return void 0;
  const parsed = typeof value === "string" ? (() => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  })() : value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return void 0;
  }
  const usageEntries = Object.entries(parsed).flatMap(([featureCode, rawValue]) => {
    if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
      return [];
    }
    return [[featureCode, rawValue.trim()]];
  });
  return usageEntries.length > 0 ? Object.fromEntries(usageEntries) : void 0;
}
function extractUsage(data) {
  if (!data) return void 0;
  const rawUsage = (() => {
    for (const field of USAGE_CANDIDATE_FIELDS) {
      const usage = toFeatureUsageMap(data[field]);
      if (usage) return usage;
    }
    return void 0;
  })();
  if (!rawUsage) {
    return void 0;
  }
  const usagePeriods = (() => {
    for (const field of USAGE_PERIOD_CANDIDATE_FIELDS) {
      const periods = toFeatureUsagePeriodMap(data[field]);
      if (periods) return periods;
    }
    return void 0;
  })();
  return materializeCurrentFeatureUsage({
    plan: extractPlanCode(data),
    status: extractSubscriptionStatus(data),
    usage: rawUsage,
    usagePeriods
  });
}
function buildSubscriptionPatch(input) {
  const patch = {
    subscriptionUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (input.plan) {
    patch.planTier = input.plan;
  }
  if (input.status) {
    patch.subscriptionStatus = input.status;
  }
  if (input.resetUsage) {
    patch.entitlementUsage = "{}";
    patch.entitlementUsagePeriods = "{}";
  } else if (input.usage) {
    const resolvedPlan = input.plan ?? input.currentPlan ?? PlanCode.Free;
    const resolvedStatus = input.status ?? input.currentStatus ?? SubscriptionStatus.Active;
    patch.entitlementUsage = JSON.stringify(input.usage);
    patch.entitlementUsagePeriods = JSON.stringify(
      buildFeatureUsagePeriods({
        plan: resolvedPlan,
        status: resolvedStatus,
        usage: input.usage
      }) ?? {}
    );
  }
  return patch;
}

// src/modules/entitlements/firestore-subscription-state-data-source.ts
var USER_STATS_COLLECTION2 = "user_stats";
async function defaultLoadUserStats(params) {
  return getFirestoreDocumentWithUserToken({
    collection: USER_STATS_COLLECTION2,
    documentId: params.userId,
    idToken: params.idToken
  });
}
var FirestoreSubscriptionStateDataSource = class {
  constructor(options) {
    this.options = options;
    this.loadUserStats = options.loadUserStats ?? defaultLoadUserStats;
    this.isAdminIdentity = options.isAdminIdentity ?? defaultIsAdminIdentity;
  }
  async getUserSubscriptionState(params) {
    if (this.isAdminIdentity({
      uid: params.userId || this.options.identity.uid,
      email: params.email || this.options.identity.email
    })) {
      return {
        found: true,
        subscription: {
          userId: params.userId,
          plan: PlanCode.Pro,
          status: SubscriptionStatus.Active
        }
      };
    }
    const document = await this.loadUserStats({
      userId: params.userId,
      idToken: this.options.idToken
    });
    if (!document.ok) {
      throw new Error(
        `subscription_state_read_failed:${document.status ?? "unknown"}:${document.error || "unknown_error"}`
      );
    }
    if (!document.exists) {
      return {
        found: true,
        subscription: {
          userId: params.userId,
          plan: PlanCode.Free,
          status: SubscriptionStatus.Active
        }
      };
    }
    const data = document.data;
    return {
      found: true,
      subscription: {
        userId: params.userId,
        plan: extractPlanCode(data),
        status: extractSubscriptionStatus(data),
        usage: extractUsage(data),
        billingPeriodEnd: data?.billingPeriodEnd
      }
    };
  }
};

// src/modules/entitlements/firestore-subscription-admin-data-source.ts
async function defaultLoadUserStats2(params) {
  return getFirestoreDocumentWithUserToken({
    collection: USER_STATS_COLLECTION2,
    documentId: params.userId,
    idToken: params.idToken
  });
}
async function defaultSaveUserStats(params) {
  return setFirestoreDocumentWithUserToken({
    collection: USER_STATS_COLLECTION2,
    documentId: params.userId,
    idToken: params.idToken,
    data: params.data
  });
}
var FirestoreSubscriptionAdminDataSource = class {
  constructor(options) {
    this.options = options;
    this.loadUserStats = options.loadUserStats ?? defaultLoadUserStats2;
    this.saveUserStats = options.saveUserStats ?? defaultSaveUserStats;
  }
  async getUserSubscriptionState(params) {
    const document = await this.loadUserStats({
      userId: params.userId,
      idToken: this.options.idToken
    });
    if (!document.ok) {
      throw new Error(
        `subscription_state_read_failed:${document.status ?? "unknown"}:${document.error || "unknown_error"}`
      );
    }
    if (!document.exists) {
      return {
        found: true,
        subscription: {
          userId: params.userId,
          plan: PlanCode.Free,
          status: SubscriptionStatus.Active
        }
      };
    }
    return {
      found: true,
      subscription: this.toSubscription(params.userId, document.data)
    };
  }
  async updateUserSubscriptionState(params) {
    const currentState = await this.getUserSubscriptionState({
      userId: params.userId
    });
    const currentPlan = currentState.found ? currentState.subscription.plan : PlanCode.Free;
    const currentStatus = currentState.found ? currentState.subscription.status : SubscriptionStatus.Active;
    const patch = buildSubscriptionPatch({
      plan: params.plan,
      status: params.status,
      usage: params.usage,
      resetUsage: params.resetUsage,
      currentPlan,
      currentStatus
    });
    if (Object.keys(patch).length === 1 && patch.subscriptionUpdatedAt) {
      throw new Error("subscription_update_empty");
    }
    const write = await this.saveUserStats({
      userId: params.userId,
      idToken: this.options.idToken,
      data: patch
    });
    if (!write.ok) {
      throw new Error(
        `subscription_state_write_failed:${write.status ?? "unknown"}:${write.error || "unknown_error"}`
      );
    }
    return this.getUserSubscriptionState({ userId: params.userId });
  }
  toSubscription(userId, data) {
    return {
      userId,
      plan: extractPlanCode(data),
      status: extractSubscriptionStatus(data),
      usage: extractUsage(data)
    };
  }
};

// ../../packages/contracts/src/analytics/BetaSignals.ts
var DEFAULT_WINDOW_DAYS = 7;
function toDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function getCutoffTimestamp(now, windowDays) {
  return now.getTime() - windowDays * 24 * 60 * 60 * 1e3;
}
function roundCurrency(value) {
  return Number(value.toFixed(6));
}
function normalizeLabel(value) {
  const normalized = value?.trim();
  return normalized ? normalized : void 0;
}
function readMetadataJson(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
function getPlanSortWeight(plan) {
  const normalized = plan.trim().toLowerCase();
  if (normalized === "pro") return 0;
  return 1;
}
function buildBetaSignalsSummary(productEvents, aiEvents, now = /* @__PURE__ */ new Date(), windowDays = DEFAULT_WINDOW_DAYS) {
  const cutoffTs = getCutoffTimestamp(now, windowDays);
  const activeUsers = /* @__PURE__ */ new Set();
  const productEventUsers = /* @__PURE__ */ new Set();
  const aiUsers = /* @__PURE__ */ new Set();
  const blockedFeatures = /* @__PURE__ */ new Map();
  const upgradeSurfaces = /* @__PURE__ */ new Map();
  const recommendedPlanSignals = /* @__PURE__ */ new Map();
  const quotaTasks = /* @__PURE__ */ new Map();
  const planTransitions = /* @__PURE__ */ new Map();
  const aiTasks = /* @__PURE__ */ new Map();
  const aiProviders = /* @__PURE__ */ new Map();
  let featureBlocked = 0;
  let upgradeViews = 0;
  let upgradeClicks = 0;
  let aiQuotaExhausted = 0;
  let simulationCompleted = 0;
  let testerSubscriptionUpdated = 0;
  let planStatusChanged = 0;
  let aiEventsCount = 0;
  let aiCostUsd = 0;
  let aiFallbacks = 0;
  let aiBudgetBlocks = 0;
  let aiFailures = 0;
  for (const event of productEvents) {
    const createdAt = toDate(event.createdAt);
    if (!createdAt || createdAt.getTime() < cutoffTs) continue;
    const userId = event.userId?.trim();
    if (userId) {
      activeUsers.add(userId);
      productEventUsers.add(userId);
    }
    const recommendedPlan = normalizeLabel(event.recommendedPlan);
    const recommendedPlanSummary = recommendedPlan ? recommendedPlanSignals.get(recommendedPlan) ?? {
      blocked: 0,
      quotaExhausted: 0,
      views: 0,
      clicks: 0,
      users: /* @__PURE__ */ new Set()
    } : null;
    if (recommendedPlan && userId && recommendedPlanSummary) {
      recommendedPlanSummary.users.add(userId);
    }
    if (event.eventName === "feature_blocked") {
      featureBlocked += 1;
      const label = normalizeLabel(event.featureCode) || normalizeLabel(event.surface) || normalizeLabel(event.route) || "desconhecido";
      blockedFeatures.set(label, (blockedFeatures.get(label) || 0) + 1);
      if (recommendedPlan && recommendedPlanSummary) {
        recommendedPlanSummary.blocked += 1;
        recommendedPlanSignals.set(recommendedPlan, recommendedPlanSummary);
      }
      continue;
    }
    if (event.eventName === "upgrade_cta_viewed" || event.eventName === "upgrade_cta_clicked") {
      const label = normalizeLabel(event.surface) || normalizeLabel(event.route) || "desconhecido";
      const current = upgradeSurfaces.get(label) || { views: 0, clicks: 0 };
      if (event.eventName === "upgrade_cta_viewed") {
        upgradeViews += 1;
        current.views += 1;
        if (recommendedPlan && recommendedPlanSummary) {
          recommendedPlanSummary.views += 1;
          recommendedPlanSignals.set(recommendedPlan, recommendedPlanSummary);
        }
      } else {
        upgradeClicks += 1;
        current.clicks += 1;
        if (recommendedPlan && recommendedPlanSummary) {
          recommendedPlanSummary.clicks += 1;
          recommendedPlanSignals.set(recommendedPlan, recommendedPlanSummary);
        }
      }
      upgradeSurfaces.set(label, current);
      continue;
    }
    if (event.eventName === "ai_quota_exhausted") {
      aiQuotaExhausted += 1;
      const label = normalizeLabel(event.task) || normalizeLabel(event.featureCode) || normalizeLabel(event.route) || "desconhecido";
      quotaTasks.set(label, (quotaTasks.get(label) || 0) + 1);
      if (recommendedPlan && recommendedPlanSummary) {
        recommendedPlanSummary.quotaExhausted += 1;
        recommendedPlanSignals.set(recommendedPlan, recommendedPlanSummary);
      }
      continue;
    }
    if (event.eventName === "simulation_completed") {
      simulationCompleted += 1;
      continue;
    }
    if (event.eventName === "tester_subscription_updated") {
      testerSubscriptionUpdated += 1;
      continue;
    }
    if (event.eventName === "plan_status_changed") {
      planStatusChanged += 1;
      const metadata = readMetadataJson(event.metadataJson);
      const previousPlan = normalizeLabel(
        typeof metadata?.["previousPlan"] === "string" ? metadata["previousPlan"] : void 0
      );
      const nextPlan = normalizeLabel(
        typeof metadata?.["nextPlan"] === "string" ? metadata["nextPlan"] : event.planTier
      );
      const previousStatus = normalizeLabel(
        typeof metadata?.["previousStatus"] === "string" ? metadata["previousStatus"] : void 0
      );
      const nextStatus = normalizeLabel(
        typeof metadata?.["nextStatus"] === "string" ? metadata["nextStatus"] : event.status
      );
      let label = "desconhecido";
      if (previousPlan && nextPlan && previousPlan !== nextPlan) {
        label = `${previousPlan} -> ${nextPlan}`;
      } else if (nextPlan && previousStatus && nextStatus && previousStatus !== nextStatus) {
        label = `${nextPlan} (${previousStatus} -> ${nextStatus})`;
      } else if (nextPlan) {
        label = nextPlan;
      } else if (previousPlan) {
        label = previousPlan;
      }
      planTransitions.set(label, (planTransitions.get(label) || 0) + 1);
    }
  }
  for (const event of aiEvents) {
    const createdAt = toDate(event.createdAt);
    if (!createdAt || createdAt.getTime() < cutoffTs) continue;
    aiEventsCount += 1;
    aiCostUsd += Number(event.estimatedCostUsd || 0);
    const userId = event.userId?.trim();
    if (userId) {
      activeUsers.add(userId);
      aiUsers.add(userId);
    }
    const task = event.task?.trim() || "unknown";
    const status = event.status?.trim() || (event.success ? "success" : "failed");
    const fallbackUsed = event.fallbackUsed === true || status === "fallback";
    const budgetBlocked = event.budgetBlocked === true || status === "blocked_by_budget";
    const failed = !event.success || status === "failed";
    if (fallbackUsed) aiFallbacks += 1;
    if (budgetBlocked) aiBudgetBlocks += 1;
    if (failed && !budgetBlocked && !fallbackUsed) aiFailures += 1;
    const current = aiTasks.get(task) || { events: 0, costUsd: 0 };
    current.events += 1;
    current.costUsd += Number(event.estimatedCostUsd || 0);
    aiTasks.set(task, current);
    const provider = event.provider?.trim() || (fallbackUsed ? "local-heuristic" : "unknown");
    const model = event.model?.trim() || (fallbackUsed ? "fallback" : "unknown");
    const providerKey = `${provider}::${model}`;
    const providerCurrent = aiProviders.get(providerKey) || {
      provider,
      model,
      events: 0,
      costUsd: 0,
      fallbacks: 0,
      failures: 0
    };
    providerCurrent.events += 1;
    providerCurrent.costUsd += Number(event.estimatedCostUsd || 0);
    if (fallbackUsed) providerCurrent.fallbacks += 1;
    if (failed && !budgetBlocked && !fallbackUsed) providerCurrent.failures += 1;
    aiProviders.set(providerKey, providerCurrent);
  }
  const topBlockedFeatures = Array.from(blockedFeatures.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 5);
  const topUpgradeSurfaces = Array.from(upgradeSurfaces.entries()).map(([label, value]) => ({
    label,
    views: value.views,
    clicks: value.clicks,
    ctrPercent: value.views > 0 ? Math.round(value.clicks / value.views * 100) : 0
  })).sort((a, b) => b.clicks - a.clicks || b.views - a.views || a.label.localeCompare(b.label)).slice(0, 5);
  const upgradeByRecommendedPlan = Array.from(recommendedPlanSignals.entries()).map(([recommendedPlan, value]) => ({
    recommendedPlan,
    blocked: value.blocked,
    quotaExhausted: value.quotaExhausted,
    views: value.views,
    clicks: value.clicks,
    ctrPercent: value.views > 0 ? Math.round(value.clicks / value.views * 100) : 0,
    uniqueUsers: value.users.size
  })).sort(
    (a, b) => getPlanSortWeight(a.recommendedPlan) - getPlanSortWeight(b.recommendedPlan) || b.clicks - a.clicks || b.views - a.views || a.recommendedPlan.localeCompare(b.recommendedPlan)
  );
  const topQuotaTasks = Array.from(quotaTasks.entries()).map(([task, count]) => ({ task, count })).sort((a, b) => b.count - a.count || a.task.localeCompare(b.task)).slice(0, 5);
  const topPlanTransitions = Array.from(planTransitions.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 5);
  const topAiTasks = Array.from(aiTasks.entries()).map(([task, value]) => ({
    task,
    events: value.events,
    costUsd: roundCurrency(value.costUsd)
  })).sort((a, b) => b.events - a.events || b.costUsd - a.costUsd || a.task.localeCompare(b.task)).slice(0, 5);
  const topAiProviders = Array.from(aiProviders.values()).map((value) => ({
    provider: value.provider,
    model: value.model,
    events: value.events,
    costUsd: roundCurrency(value.costUsd),
    fallbackRatePercent: value.events > 0 ? Math.round(value.fallbacks / value.events * 100) : 0,
    failureRatePercent: value.events > 0 ? Math.round(value.failures / value.events * 100) : 0
  })).sort((a, b) => b.events - a.events || b.costUsd - a.costUsd || a.provider.localeCompare(b.provider)).slice(0, 5);
  return {
    windowDays,
    activeUsers: activeUsers.size,
    productEventUsers: productEventUsers.size,
    aiUsers: aiUsers.size,
    featureBlocked,
    upgradeViews,
    upgradeClicks,
    upgradeCtrPercent: upgradeViews > 0 ? Math.round(upgradeClicks / upgradeViews * 100) : 0,
    aiQuotaExhausted,
    simulationCompleted,
    testerSubscriptionUpdated,
    planStatusChanged,
    aiEvents: aiEventsCount,
    aiCostUsd: roundCurrency(aiCostUsd),
    upgradeByRecommendedPlan,
    topBlockedFeatures,
    topUpgradeSurfaces,
    topQuotaTasks,
    topPlanTransitions,
    topAiTasks,
    aiFallbacks,
    aiBudgetBlocks,
    aiFailures,
    aiFallbackRatePercent: aiEventsCount > 0 ? Math.round(aiFallbacks / aiEventsCount * 100) : 0,
    aiFailureRatePercent: aiEventsCount > 0 ? Math.round(aiFailures / aiEventsCount * 100) : 0,
    topAiProviders
  };
}

// src/modules/entitlements/beta-signals.ts
var PRODUCT_USAGE_COLLECTION = "product_usage_events";
var AI_USAGE_COLLECTION = "ai_usage_events";
function collectDocumentsOrWarn(result, collection, warnings) {
  if (result.ok) {
    return result.documents || [];
  }
  warnings.push(`${collection}_unavailable`);
  return [];
}
async function loadAdminBetaSignalsSummary(params) {
  const windowDays = params.windowDays && params.windowDays > 0 ? params.windowDays : 7;
  const now = params.now ?? /* @__PURE__ */ new Date();
  const [productResult, aiResult] = await Promise.all([
    listFirestoreDocumentsWithUserToken({
      collection: PRODUCT_USAGE_COLLECTION,
      idToken: params.idToken,
      pageSize: 500
    }),
    listFirestoreDocumentsWithUserToken({
      collection: AI_USAGE_COLLECTION,
      idToken: params.idToken,
      pageSize: 500
    })
  ]);
  const dataWarnings = [];
  const productEvents = collectDocumentsOrWarn(
    productResult,
    PRODUCT_USAGE_COLLECTION,
    dataWarnings
  ).map(
    ({ id, data }) => ({ id, ...data })
  );
  const aiEvents = collectDocumentsOrWarn(
    aiResult,
    AI_USAGE_COLLECTION,
    dataWarnings
  ).map(
    ({ id, data }) => ({ id, ...data })
  );
  const summary = buildBetaSignalsSummary(productEvents, aiEvents, now, windowDays);
  if (dataWarnings.length > 0) {
    return {
      ...summary,
      dataWarnings
    };
  }
  return summary;
}

// ../../packages/contracts/src/analytics/ProductEvents.ts
var PUBLIC_PRODUCT_EVENT_NAMES = [
  "feature_blocked",
  "upgrade_cta_viewed",
  "upgrade_cta_clicked",
  "ai_quota_exhausted",
  "simulation_completed"
];
function normalizeOptionalString(value) {
  if (typeof value !== "string") return void 0;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : void 0;
}
function isPublicProductEventName(value) {
  return typeof value === "string" && PUBLIC_PRODUCT_EVENT_NAMES.includes(value);
}
function normalizeProductEventMetadata(metadata) {
  if (!metadata) return void 0;
  const normalized = {};
  for (const [rawKey, rawValue] of Object.entries(metadata)) {
    const key = rawKey.trim();
    if (!key) continue;
    if (rawValue === void 0) continue;
    if (rawValue === null) {
      normalized[key] = null;
      continue;
    }
    if (typeof rawValue === "string") {
      const value = rawValue.trim();
      if (value) {
        normalized[key] = value;
      }
      continue;
    }
    if (typeof rawValue === "boolean") {
      normalized[key] = rawValue;
      continue;
    }
    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
      normalized[key] = rawValue;
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : void 0;
}
function serializeProductEventMetadata(metadata) {
  const normalized = normalizeProductEventMetadata(metadata);
  return normalized ? JSON.stringify(normalized) : void 0;
}
function buildProductEventDocument(event, createdAt = (/* @__PURE__ */ new Date()).toISOString()) {
  const actorUserId = normalizeOptionalString(event.actorUserId);
  if (!actorUserId) {
    throw new Error("product_event_actor_required");
  }
  const userId = normalizeOptionalString(event.userId) || actorUserId;
  return {
    actorUserId,
    userId,
    eventName: event.eventName,
    route: normalizeOptionalString(event.route),
    surface: normalizeOptionalString(event.surface),
    featureCode: normalizeOptionalString(event.featureCode),
    recommendedPlan: normalizeOptionalString(event.recommendedPlan),
    planTier: normalizeOptionalString(event.planTier),
    task: normalizeOptionalString(event.task),
    status: normalizeOptionalString(event.status),
    ctaHref: normalizeOptionalString(event.ctaHref),
    targetUserId: normalizeOptionalString(event.targetUserId),
    targetEmail: normalizeOptionalString(event.targetEmail),
    metadataJson: serializeProductEventMetadata(event.metadata),
    createdAt
  };
}

// src/modules/entitlements/product-event-store.ts
var PRODUCT_USAGE_COLLECTION2 = "product_usage_events";
async function saveProductUsageEvent(event, idToken) {
  if (!idToken) return;
  const result = await createFirestoreDocumentWithUserToken({
    collection: PRODUCT_USAGE_COLLECTION2,
    data: buildProductEventDocument(event),
    idToken
  });
  if (!result.ok) {
    console.warn("[product-events] Firestore write failed:", result.status, result.error);
  }
}

// src/modules/billing/admin-auth.ts
async function getAdminSession() {
  const email = "marsleite@gmail.com";
  const password = process.env.SEED_ADMIN_PASSWORD || "928010Mgr";
  const apiKey = process.env.FIREBASE_WEB_API_KEY || process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("Firebase API key is not configured");
  }
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true
      })
    }
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Admin programmatic login failed: ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  if (!data.idToken || !data.localId) {
    throw new Error("Invalid response from Identity Toolkit during admin sign-in");
  }
  return {
    idToken: data.idToken,
    identity: {
      uid: data.localId,
      email: data.email || email
    }
  };
}

// ../../packages/application/src/mappers/toUserEntitlementsSnapshot.ts
function toUserEntitlementsSnapshot(entitlements) {
  const features = Object.fromEntries(
    Object.entries(entitlements.features).map(([featureCode, value]) => {
      const snapshotValue = value.mode === "boolean" ? {
        mode: "boolean",
        enabled: value.enabled
      } : {
        mode: "quota",
        enabled: value.enabled,
        limit: value.limit,
        used: value.used,
        remaining: value.remaining,
        period: value.period
      };
      return [featureCode, snapshotValue];
    })
  );
  return {
    catalogPlan: entitlements.catalogPlan,
    effectivePlan: entitlements.effectivePlan,
    status: entitlements.status,
    accessState: entitlements.accessState,
    features
  };
}

// ../../packages/application/src/use-cases/billing/GetUserEntitlements.ts
var GetUserEntitlements = class {
  constructor(dataSource, policy = DEFAULT_ENTITLEMENT_POLICY) {
    this.dataSource = dataSource;
    this.policy = policy;
  }
  async execute(input) {
    const loaded = await this.dataSource.getUserSubscriptionState({
      userId: input.userId,
      email: input.email
    });
    if (!loaded.found) {
      return loaded;
    }
    const entitlements = resolveUserEntitlements(
      {
        plan: loaded.subscription.plan,
        status: loaded.subscription.status,
        usage: loaded.subscription.usage,
        billingPeriodEnd: loaded.subscription.billingPeriodEnd
      },
      this.policy
    );
    return {
      found: true,
      entitlements: toUserEntitlementsSnapshot(entitlements)
    };
  }
};

// ../../packages/application/src/mappers/toPlanEngineSnapshot.ts
var DEFAULT_MAX_RECOMMENDATIONS = 3;
var DEFAULT_MAX_REASONS_PER_RECOMMENDATION = 3;
function toPlanEngineSnapshot(result, options = {}) {
  const maxRecommendations = options.maxRecommendations ?? DEFAULT_MAX_RECOMMENDATIONS;
  const maxReasonsPerRecommendation = options.maxReasonsPerRecommendation ?? DEFAULT_MAX_REASONS_PER_RECOMMENDATION;
  return {
    engineVersion: result.engineVersion,
    plan: {
      planId: result.plan.planId,
      name: result.plan.name,
      examDate: result.plan.examDate,
      weeklyGoalHours: result.plan.weeklyGoalHours
    },
    subjects: [...result.subjects].map((item) => ({
      subject: item.subject,
      weight: item.weight,
      status: item.status,
      priorityScore: item.priority.score,
      priorityBand: item.priority.band,
      metrics: {
        overallScore: item.metrics.overallScore,
        volumeScore: item.metrics.volumeScore,
        frequencyScore: item.metrics.frequencyScore,
        adherenceScore: item.metrics.adherenceScore,
        recencyScore: item.metrics.recencyScore,
        performanceScore: item.metrics.performanceScore
      }
    })),
    recommendations: [...result.recommendations].slice(0, maxRecommendations).map((item) => ({
      targetSubject: item.target,
      type: item.type,
      urgency: item.urgency,
      dueWindow: item.dueWindow,
      priorityScore: item.priorityScore,
      reasons: item.reason.slice(0, maxReasonsPerRecommendation)
    }))
  };
}

// ../../packages/application/src/use-cases/engine/GetPlanEngineSnapshot.ts
function shiftIsoDate2(date, days) {
  const [year, month, day] = date.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
}
function buildDefaultWindow(today, policy) {
  const recentStudyDays = Math.max(
    policy.health.windows.rollingVolumeDays,
    policy.health.windows.rollingFrequencyDays,
    policy.health.windows.noDataDays
  );
  const recentQuestionDays = Math.max(
    policy.health.windows.rollingPerformanceDays,
    policy.health.windows.noDataDays
  );
  return {
    studySessionsFrom: shiftIsoDate2(today, -(recentStudyDays - 1)),
    questionSessionsFrom: shiftIsoDate2(today, -(recentQuestionDays - 1)),
    allTimeStudySessionsFrom: "1900-01-01",
    allTimeQuestionSessionsFrom: "1900-01-01"
  };
}
var GetPlanEngineSnapshot = class {
  constructor(dataSource, policy = DEFAULT_ENGINE_POLICY) {
    this.dataSource = dataSource;
    this.policy = policy;
  }
  async execute(input) {
    const defaultWindow = buildDefaultWindow(input.today, this.policy);
    const loaded = await this.dataSource.loadPlanEngineContext({
      userId: input.userId,
      today: input.today,
      planId: input.planId,
      window: {
        ...defaultWindow,
        ...input.window
      }
    });
    if (!loaded.found) {
      return loaded;
    }
    const result = runPlanEngine(loaded.context, {
      policy: this.policy,
      recommendationLimit: input.maxRecommendations,
      recommendationTimestamp: input.today
    });
    return {
      found: true,
      snapshot: toPlanEngineSnapshot(result, {
        maxRecommendations: input.maxRecommendations
      })
    };
  }
};

// ../../packages/application/src/use-cases/engine/GetPortfolioSnapshot.ts
function shiftIsoDate3(date, days) {
  const [year, month, day] = date.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
}
function buildDefaultWindow2(today, policy) {
  const recentStudyDays = Math.max(
    policy.health.windows.rollingVolumeDays,
    policy.health.windows.rollingFrequencyDays,
    policy.health.windows.noDataDays
  );
  const recentQuestionDays = Math.max(
    policy.health.windows.rollingPerformanceDays,
    policy.health.windows.noDataDays
  );
  return {
    studySessionsFrom: shiftIsoDate3(today, -(recentStudyDays - 1)),
    questionSessionsFrom: shiftIsoDate3(today, -(recentQuestionDays - 1)),
    allTimeStudySessionsFrom: "1900-01-01",
    allTimeQuestionSessionsFrom: "1900-01-01"
  };
}
var GetPortfolioSnapshot = class {
  constructor(dataSource, policy = DEFAULT_ENGINE_POLICY) {
    this.dataSource = dataSource;
    this.policy = policy;
  }
  async execute(input) {
    const defaultWindow = buildDefaultWindow2(input.today, this.policy);
    const loaded = await this.dataSource.loadAllPlanEngineContexts({
      userId: input.userId,
      today: input.today,
      window: {
        ...defaultWindow,
        ...input.window
      }
    });
    if (!loaded.found) {
      return { found: false, reason: "failed_to_load_contexts" };
    }
    const plans = [];
    const planContexts = /* @__PURE__ */ new Map();
    for (const ctx of loaded.contexts) {
      plans.push(ctx.plan);
      planContexts.set(ctx.plan.planId, ctx);
    }
    if (plans.length === 0) {
      return { found: false, reason: "no_plans_found" };
    }
    const portfolio = computePortfolio({
      globalWeeklyBudget: input.globalWeeklyBudget,
      today: input.today,
      plans,
      planContexts
    });
    const snapshot = {
      engineVersion: "1.0.0",
      // Fixed version for now
      userId: input.userId,
      globalWeeklyBudget: portfolio.globalWeeklyBudget,
      computedAt: portfolio.computedAt,
      plans: portfolio.plans.map((p) => ({
        planId: p.planId,
        planName: p.planName,
        color: p.color,
        riskScore: p.riskScore,
        urgencyScore: p.urgencyScore,
        healthScore: p.healthScore,
        userPriority: p.userPriority,
        compositeScore: p.compositeScore,
        allocatedPercent: p.allocatedPercent,
        allocatedHours: p.allocatedHours,
        phase: p.phase,
        daysToExam: p.daysToExam,
        subjectHealthSummary: p.subjectHealthSummary
      })),
      sharedSubjects: portfolio.sharedSubjects.map((s) => ({
        subject: s.subject,
        planIds: s.planIds,
        maxWeight: s.maxWeight,
        avgWeight: s.avgWeight,
        bonusFactor: s.bonusFactor
      })),
      alerts: portfolio.alerts.map((a) => ({
        type: a.type,
        severity: a.severity,
        message: a.message,
        relatedPlanIds: a.relatedPlanIds
      })),
      kpis: {
        budgetAdherencePercent: portfolio.kpis.budgetAdherencePercent,
        dispersionIndex: portfolio.kpis.dispersionIndex,
        sharingEfficiencyPercent: portfolio.kpis.sharingEfficiencyPercent,
        plansAtRisk: portfolio.kpis.plansAtRisk
      }
    };
    return {
      found: true,
      snapshot
    };
  }
};

// ../../packages/application/src/use-cases/billing/CreateCheckoutSession.ts
var CreateCheckoutSession = class {
  constructor(billingAdapter) {
    this.billingAdapter = billingAdapter;
  }
  async execute(input) {
    if (!input.userId) {
      throw new Error("User ID is required");
    }
    if (!input.email) {
      throw new Error("Email is required");
    }
    if (input.interval !== "monthly" && input.interval !== "annually") {
      throw new Error("Interval must be monthly or annually");
    }
    return this.billingAdapter.createCheckoutSession({
      userId: input.userId,
      email: input.email,
      interval: input.interval
    });
  }
};

// ../../packages/application/src/use-cases/billing/CancelSubscription.ts
var CancelSubscription = class {
  constructor(billingAdapter, firestoreWriter) {
    this.billingAdapter = billingAdapter;
    this.firestoreWriter = firestoreWriter;
  }
  async execute(input) {
    if (!input.userId) {
      throw new Error("User ID is required");
    }
    const userStatsRes = await this.firestoreWriter.getDocument("user_stats", input.userId);
    if (!userStatsRes.ok || !userStatsRes.exists) {
      return {
        success: false,
        refunded: false,
        reason: "user_stats_not_found"
      };
    }
    const {
      planTier,
      subscriptionStatus,
      subscriptionId,
      subscriptionPaymentId,
      subscriptionStartedAt
    } = userStatsRes.data || {};
    if (planTier !== "pro" || subscriptionStatus !== "active" || !subscriptionId) {
      return {
        success: false,
        refunded: false,
        reason: "no_active_pro_subscription"
      };
    }
    const startedAt = subscriptionStartedAt ? new Date(subscriptionStartedAt) : /* @__PURE__ */ new Date();
    const elapsedMs = Date.now() - startedAt.getTime();
    const elapsedDays = elapsedMs / (1e3 * 60 * 60 * 24);
    const isWithinCDC = elapsedDays <= 7;
    try {
      await this.billingAdapter.cancelSubscription(subscriptionId);
      if (isWithinCDC) {
        if (subscriptionPaymentId) {
          await this.billingAdapter.refundPayment(subscriptionPaymentId);
        }
        const updateRes = await this.firestoreWriter.setDocument("user_stats", input.userId, {
          planTier: "free",
          subscriptionStatus: "expired",
          subscriptionUpdatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          billingPeriodEnd: (/* @__PURE__ */ new Date(0)).toISOString()
          // set to epoch to guarantee immediate expiration
        });
        if (!updateRes.ok) {
          throw new Error(`Failed to update user stats during CDC downgrade: ${updateRes.error}`);
        }
        return {
          success: true,
          refunded: true
        };
      } else {
        const updateRes = await this.firestoreWriter.setDocument("user_stats", input.userId, {
          subscriptionStatus: "canceled",
          subscriptionUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        if (!updateRes.ok) {
          throw new Error(`Failed to update user stats during standard cancellation: ${updateRes.error}`);
        }
        return {
          success: true,
          refunded: false
        };
      }
    } catch (error) {
      return {
        success: false,
        refunded: false,
        reason: error.message || "billing_adapter_error"
      };
    }
  }
};

// ../../packages/application/src/use-cases/billing/HandleBillingWebhook.ts
var HandleBillingWebhook = class {
  constructor(billingAdapter, firestoreWriter) {
    this.billingAdapter = billingAdapter;
    this.firestoreWriter = firestoreWriter;
  }
  async execute(input) {
    if (!input.eventId) {
      throw new Error("Event ID is required");
    }
    if (!input.topic) {
      throw new Error("Topic is required");
    }
    if (!input.resourceId) {
      throw new Error("Resource ID is required");
    }
    const logCheck = await this.firestoreWriter.getDocument(
      "billing_event_logs",
      input.eventId
    );
    if (logCheck.ok && logCheck.exists) {
      return {
        processed: false,
        reason: "event_already_processed"
      };
    }
    let subscriptionId = "";
    let lastPaymentId = "";
    if (input.topic === "payment") {
      const paymentResult = await this.billingAdapter.getPayment(input.resourceId);
      if (!paymentResult.preapprovalId) {
        return {
          processed: false,
          reason: "payment_not_associated_with_subscription"
        };
      }
      subscriptionId = paymentResult.preapprovalId;
      lastPaymentId = paymentResult.id;
    } else if (input.topic === "preapproval") {
      subscriptionId = input.resourceId;
    } else {
      return {
        processed: false,
        reason: `unsupported_topic_${input.topic}`
      };
    }
    const subscriptionResult = await this.billingAdapter.getSubscription(subscriptionId);
    const userId = subscriptionResult.userId;
    if (!userId) {
      return {
        processed: false,
        reason: "subscription_no_user_reference"
      };
    }
    const userStatsRes = await this.firestoreWriter.getDocument("user_stats", userId);
    let subscriptionStartedAt = (/* @__PURE__ */ new Date()).toISOString();
    if (userStatsRes.ok && userStatsRes.exists && userStatsRes.data?.subscriptionStartedAt) {
      subscriptionStartedAt = userStatsRes.data.subscriptionStartedAt;
    }
    const planTier = subscriptionResult.plan;
    const subscriptionStatus = subscriptionResult.status;
    const patch = {
      planTier,
      subscriptionStatus,
      subscriptionId,
      subscriptionUpdatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      billingPeriodEnd: subscriptionResult.billingPeriodEnd.toISOString()
    };
    if (lastPaymentId || subscriptionResult.paymentId) {
      patch.subscriptionPaymentId = lastPaymentId || subscriptionResult.paymentId;
    }
    if (subscriptionStatus === "active") {
      patch.subscriptionStartedAt = subscriptionStartedAt;
    }
    const updateRes = await this.firestoreWriter.setDocument(
      "user_stats",
      userId,
      patch
    );
    if (!updateRes.ok) {
      throw new Error(`Failed to update user subscription: ${updateRes.error}`);
    }
    const logRes = await this.firestoreWriter.setDocument(
      "billing_event_logs",
      input.eventId,
      {
        topic: input.topic,
        resourceId: input.resourceId,
        userId,
        processedAt: (/* @__PURE__ */ new Date()).toISOString(),
        planTier,
        subscriptionStatus
      }
    );
    if (!logRes.ok) {
      console.warn(
        `Failed to write idempotency log for event ${input.eventId}: ${logRes.error}`
      );
    }
    return {
      processed: true,
      userId,
      planTier,
      subscriptionStatus
    };
  }
};

// ../../packages/infrastructure-billing/src/mercadopago/MercadoPagoBillingAdapter.ts
import crypto from "node:crypto";
var MercadoPagoBillingAdapter = class {
  constructor() {
    this.baseUrl = "https://api.mercadopago.com";
    this.accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN ?? "";
    this.webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET ?? "";
  }
  getHeaders(extraHeaders = {}) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.accessToken}`,
      ...extraHeaders
    };
  }
  async createCheckoutSession(params) {
    if (!this.accessToken) {
      throw new Error("Mercado Pago Access Token is not configured");
    }
    let appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "").trim();
    if (!appUrl || !appUrl.startsWith("https://")) {
      appUrl = "https://aprova-flow-web.vercel.app";
    }
    const backUrl = `${appUrl.replace(/\/$/, "")}/checkout/success`;
    const body = {
      payer_email: params.email,
      back_url: backUrl,
      reason: params.interval === "monthly" ? "AprovaMind Pro - Mensal" : "AprovaMind Pro - Anual",
      external_reference: params.userId,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: params.interval === "monthly" ? 34.9 : 358.8,
        currency_id: "BRL"
      },
      status: "pending"
    };
    const response = await fetch(`${this.baseUrl}/preapproval`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mercado Pago checkout session generation failed: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    const checkoutId = data.id;
    const initPoint = data.sandbox_init_point || data.init_point;
    if (!checkoutId || !initPoint) {
      throw new Error("Invalid response from Mercado Pago preapproval API");
    }
    return {
      checkoutId,
      initPoint
    };
  }
  async cancelSubscription(subscriptionId) {
    if (!this.accessToken) {
      throw new Error("Mercado Pago Access Token is not configured");
    }
    const response = await fetch(`${this.baseUrl}/preapproval/${subscriptionId}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify({
        status: "cancelled"
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mercado Pago subscription cancellation failed: ${response.status} - ${errorText}`);
    }
    return { success: true };
  }
  async refundPayment(paymentId) {
    if (!this.accessToken) {
      throw new Error("Mercado Pago Access Token is not configured");
    }
    const idempotencyKey = crypto.randomUUID();
    const response = await fetch(`${this.baseUrl}/v1/payments/${paymentId}/refunds`, {
      method: "POST",
      headers: this.getHeaders({
        "X-Idempotency-Key": idempotencyKey
      }),
      body: JSON.stringify({})
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mercado Pago payment refund failed: ${response.status} - ${errorText}`);
    }
    return { success: true };
  }
  async getSubscription(subscriptionId) {
    if (!this.accessToken) {
      throw new Error("Mercado Pago Access Token is not configured");
    }
    const response = await fetch(`${this.baseUrl}/preapproval/${subscriptionId}`, {
      method: "GET",
      headers: this.getHeaders()
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mercado Pago fetch subscription failed: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    const statusMap = {
      authorized: SubscriptionStatus.Active,
      paused: SubscriptionStatus.PastDue,
      cancelled: SubscriptionStatus.Canceled
    };
    const status = statusMap[data.status] || SubscriptionStatus.Expired;
    const userId = data.external_reference;
    const nextPaymentDate = data.next_payment_date ? new Date(data.next_payment_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
    return {
      id: data.id,
      userId,
      status,
      plan: PlanCode.Pro,
      billingPeriodEnd: nextPaymentDate,
      paymentId: data.last_payment_id || void 0
    };
  }
  async getPayment(paymentId) {
    if (!this.accessToken) {
      throw new Error("Mercado Pago Access Token is not configured");
    }
    const response = await fetch(`${this.baseUrl}/v1/payments/${paymentId}`, {
      method: "GET",
      headers: this.getHeaders()
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mercado Pago fetch payment failed: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    return {
      id: data.id.toString(),
      status: data.status,
      amount: data.transaction_amount,
      userId: data.external_reference,
      preapprovalId: data.preapproval_id || void 0
    };
  }
  verifyWebhookSignature(signature, requestId, rawBody) {
    if (!this.webhookSecret) {
      return false;
    }
    const tsMatch = signature.match(/ts=(\d+)/);
    const v1Match = signature.match(/v1=([a-f0-9]+)/i);
    if (!tsMatch || !v1Match) {
      return false;
    }
    const ts = tsMatch[1];
    const v1 = v1Match[1];
    let dataId = "";
    try {
      const body = JSON.parse(rawBody);
      dataId = (body.data?.id ?? body.id ?? "").toString().toLowerCase();
    } catch {
      return false;
    }
    if (!dataId) {
      return false;
    }
    const manifest1 = `id:${dataId};request-timestamp:${ts};`;
    const hmac1 = crypto.createHmac("sha256", this.webhookSecret).update(manifest1).digest("hex");
    if (hmac1 === v1) {
      return true;
    }
    const manifest2 = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const hmac2 = crypto.createHmac("sha256", this.webhookSecret).update(manifest2).digest("hex");
    if (hmac2 === v1) {
      return true;
    }
    return false;
  }
};

// api-src/backend.ts
function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}
function setCors(req, res, methods) {
  const origin = req.headers.origin;
  res.setHeader("access-control-allow-origin", typeof origin === "string" ? origin : "*");
  res.setHeader("access-control-allow-methods", `${methods},OPTIONS`);
  res.setHeader("access-control-allow-headers", "Content-Type, Authorization, X-AprovaMind-User-Id");
  res.setHeader("vary", "Origin");
}
function extractBearerToken(value) {
  if (typeof value !== "string") return null;
  if (!value.startsWith("Bearer ")) return null;
  const token = value.slice("Bearer ".length).trim();
  return token || null;
}
function decodeJwtPayload3(idToken) {
  try {
    const parts = idToken.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + (4 - base64.length % 4) % 4,
      "="
    );
    return JSON.parse(Buffer.from(padded, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}
function getIdentityFromTokenPayload(idToken) {
  const payload = decodeJwtPayload3(idToken);
  if (!payload) return null;
  const uid = typeof payload.user_id === "string" ? payload.user_id : typeof payload.sub === "string" ? payload.sub : "";
  const email = typeof payload.email === "string" ? payload.email : null;
  const issuer = typeof payload.iss === "string" ? payload.iss : "";
  const audience = typeof payload.aud === "string" ? payload.aud : "";
  const expiresAt = typeof payload.exp === "number" ? payload.exp : 0;
  const now = Math.floor(Date.now() / 1e3);
  const envProjectId = (process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
  const looksLikeFirebaseToken = issuer.startsWith("https://securetoken.google.com/") && audience.length > 0 && (!envProjectId || audience === envProjectId);
  if (!uid || !looksLikeFirebaseToken || expiresAt <= now) return null;
  return { uid, email };
}
async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return null;
  const text = Buffer.concat(chunks).toString("utf-8");
  if (!text.trim()) return null;
  const parsed = JSON.parse(text);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
}
function readQuery(req) {
  return new URL(req.url || "/", "http://vercel.internal").searchParams;
}
async function verifyRequestUser(req, options = {}) {
  const idToken = extractBearerToken(req.headers.authorization);
  if (!idToken) {
    return {
      ok: false,
      statusCode: 401,
      payload: {
        error: "unauthorized",
        message: "Envie um Authorization: Bearer <firebase-id-token> valido."
      }
    };
  }
  let identity = null;
  try {
    identity = await verifyFirebaseIdToken(idToken);
  } catch (error) {
    console.error("[api-auth] firebase token verification failed", {
      message: error instanceof Error ? error.message : String(error)
    });
  }
  if (!identity && options.allowDecodedFallback) {
    identity = getIdentityFromTokenPayload(idToken);
    if (identity) {
      console.warn("[api-auth] using decoded firebase token identity fallback", {
        uid: identity.uid,
        email: identity.email
      });
    }
  }
  if (!identity) {
    return {
      ok: false,
      statusCode: 401,
      payload: {
        error: "unauthorized",
        message: "Token expirado ou invalido."
      }
    };
  }
  return { ok: true, idToken, identity };
}
function resolveSandboxUserId(req) {
  if (process.env.NODE_ENV === "production") return null;
  const headerValue = req.headers["x-aprovamind-user-id"];
  if (typeof headerValue === "string" && headerValue.trim()) {
    return headerValue.trim();
  }
  const queryUserId = readQuery(req).get("userId");
  return queryUserId?.trim() || null;
}
function sendNotFound(res, reason) {
  sendJson(res, 404, {
    error: reason,
    message: reason === "user_not_found" ? "Usuario nao encontrado." : "Assinatura de teste nao encontrada para o usuario informado."
  });
}
function getRoute(req) {
  return readQuery(req).get("__route") || "";
}
function getServerTodayIso() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function isLikelyEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
function readOptionalString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : void 0;
}
async function handleEntitlementsScenarios(req, res) {
  setCors(req, res, "GET");
  if (req.method === "OPTIONS") return void (res.statusCode = 204, res.end());
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "method_not_allowed", message: "Use GET para listar cenarios manuais." });
    return;
  }
  if (process.env.NODE_ENV === "production") {
    sendJson(res, 404, { error: "not_found", message: "Cenarios manuais nao estao disponiveis neste ambiente." });
    return;
  }
  sendJson(res, 200, {
    scenarios: listManualSubscriptionScenarios().map((scenario) => ({
      userId: scenario.userId,
      plan: scenario.plan,
      status: scenario.status,
      description: scenario.description
    }))
  });
}
async function handleEntitlementsMe(req, res) {
  setCors(req, res, "GET");
  if (req.method === "OPTIONS") return void (res.statusCode = 204, res.end());
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "method_not_allowed", message: "Use GET para carregar entitlements." });
    return;
  }
  const sandboxUserId = resolveSandboxUserId(req);
  if (sandboxUserId) {
    const result = await new GetUserEntitlements(new ManualSubscriptionStateDataSource()).execute({ userId: sandboxUserId });
    if (!result.found) return sendNotFound(res, result.reason);
    sendJson(res, 200, { userId: sandboxUserId, entitlements: result.entitlements, source: "manual" });
    return;
  }
  const auth = await verifyRequestUser(req);
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);
  try {
    const result = await new GetUserEntitlements(
      new FirestoreSubscriptionStateDataSource({ idToken: auth.idToken, identity: auth.identity })
    ).execute({ userId: auth.identity.uid, email: auth.identity.email });
    if (!result.found) return sendNotFound(res, result.reason);
    sendJson(res, 200, { userId: auth.identity.uid, entitlements: result.entitlements, source: "authenticated" });
  } catch (error) {
    console.error("[api-entitlements] execution failed", error);
    sendJson(res, 500, { error: "subscription_state_unavailable", message: "Nao foi possivel carregar os entitlements do usuario." });
  }
}
async function handleSubscriptionMe(req, res) {
  setCors(req, res, "GET");
  if (req.method === "OPTIONS") return void (res.statusCode = 204, res.end());
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "method_not_allowed", message: "Use GET para carregar assinatura." });
    return;
  }
  const sandboxUserId = resolveSandboxUserId(req);
  if (sandboxUserId) {
    const result = await new ManualSubscriptionStateDataSource().getUserSubscriptionState({ userId: sandboxUserId });
    if (!result.found) return sendNotFound(res, result.reason);
    sendJson(res, 200, { userId: sandboxUserId, subscription: result.subscription, source: "manual" });
    return;
  }
  const auth = await verifyRequestUser(req);
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);
  try {
    const result = await new FirestoreSubscriptionStateDataSource({
      idToken: auth.idToken,
      identity: auth.identity
    }).getUserSubscriptionState({ userId: auth.identity.uid, email: auth.identity.email });
    if (!result.found) return sendNotFound(res, result.reason);
    sendJson(res, 200, { userId: auth.identity.uid, subscription: result.subscription, source: "authenticated" });
  } catch (error) {
    console.error("[api-subscription] execution failed", error);
    sendJson(res, 500, { error: "subscription_state_unavailable", message: "Nao foi possivel carregar a assinatura do usuario." });
  }
}
async function handleAdminSubscription(req, res) {
  setCors(req, res, "GET,POST");
  if (req.method === "OPTIONS") return void (res.statusCode = 204, res.end());
  if (req.method !== "GET" && req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed", message: "Use GET ou POST para gerenciar assinatura de tester." });
    return;
  }
  const auth = await verifyRequestUser(req, { allowDecodedFallback: true });
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);
  if (!defaultIsAdminIdentity(auth.identity)) {
    sendJson(res, 403, { error: "forbidden", message: "Somente administradores podem alterar assinatura de testers." });
    return;
  }
  const query = readQuery(req);
  let userId = query.get("userId")?.trim() || "";
  let email = query.get("email")?.trim().toLowerCase() || "";
  let body = null;
  if (req.method === "POST") {
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { error: "bad_request", message: "JSON invalido." });
      return;
    }
    userId = typeof body?.userId === "string" ? body.userId.trim() : userId;
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : email;
  }
  if (!userId && !email) {
    sendJson(res, 400, { error: "invalid_target", message: "Informe um UID ou e-mail valido." });
    return;
  }
  if (email && !isLikelyEmail(email)) {
    sendJson(res, 400, { error: "invalid_email", message: "Informe um e-mail valido." });
    return;
  }
  if (!userId) {
    const found = await findFirebaseUserByEmail(email);
    if (!found?.uid) {
      sendJson(res, 404, { error: "user_not_found", message: "Usuario nao encontrado para o e-mail informado." });
      return;
    }
    userId = found.uid;
    email = found.email || email;
  }
  const dataSource = new FirestoreSubscriptionAdminDataSource({ idToken: auth.idToken, identity: auth.identity });
  try {
    if (req.method === "GET") {
      const result2 = await dataSource.getUserSubscriptionState({ userId, email });
      if (!result2.found) return sendNotFound(res, result2.reason);
      sendJson(res, 200, { userId, email, subscription: result2.subscription });
      return;
    }
    const hasPlan = typeof body?.plan === "string" && body.plan.trim().length > 0;
    const hasStatus = typeof body?.status === "string" && body.status.trim().length > 0;
    const hasUsage = body?.usage && typeof body.usage === "object";
    const resetUsage = body?.resetUsage === true;
    if (!hasPlan && !hasStatus && !hasUsage && !resetUsage) {
      sendJson(res, 400, { error: "empty_update", message: "Envie ao menos plan, status, usage ou resetUsage=true." });
      return;
    }
    const usage = hasUsage ? toFeatureUsageMap(body?.usage) : void 0;
    if (hasUsage && !usage) {
      sendJson(res, 400, { error: "invalid_usage", message: "usage precisa ser um objeto com contadores numericos nao negativos." });
      return;
    }
    const result = await dataSource.updateUserSubscriptionState({
      userId,
      plan: hasPlan ? normalizePlanCode(body?.plan) : void 0,
      status: hasStatus ? normalizeSubscriptionStatus(body?.status) : void 0,
      usage,
      resetUsage
    });
    if (!result.found) return sendNotFound(res, result.reason);
    sendJson(res, 200, { userId, email, subscription: result.subscription });
  } catch (error) {
    console.error("[api-admin-subscription] execution failed", error);
    sendJson(res, 500, {
      error: req.method === "GET" ? "subscription_state_unavailable" : "subscription_state_update_failed",
      message: req.method === "GET" ? "Nao foi possivel carregar a assinatura do usuario informado." : "Nao foi possivel atualizar a assinatura do usuario informado."
    });
  }
}
async function handleBetaSignals(req, res) {
  setCors(req, res, "GET");
  if (req.method === "OPTIONS") return void (res.statusCode = 204, res.end());
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "method_not_allowed", message: "Use GET para carregar os sinais do beta." });
    return;
  }
  const auth = await verifyRequestUser(req, { allowDecodedFallback: true });
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);
  try {
    if (!defaultIsAdminIdentity(auth.identity)) {
      sendJson(res, 403, { error: "forbidden", message: "Somente administradores podem revisar sinais do beta." });
      return;
    }
    const rawWindowDays = Number(readQuery(req).get("windowDays"));
    const windowDays = Number.isFinite(rawWindowDays) && rawWindowDays > 0 ? Math.min(30, Math.floor(rawWindowDays)) : 7;
    const summary = await loadAdminBetaSignalsSummary({ idToken: auth.idToken, windowDays });
    sendJson(res, 200, summary);
  } catch (error) {
    console.error("[api-beta-signals] execution failed", error);
    sendJson(res, 500, { error: "beta_signals_fetch_failed", message: "Nao foi possivel carregar os sinais do beta." });
  }
}
async function handleEngineSnapshot(req, res) {
  setCors(req, res, "POST");
  if (req.method === "OPTIONS") return void (res.statusCode = 204, res.end());
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed", message: "Use POST para carregar o snapshot do Engine." });
    return;
  }
  const auth = await verifyRequestUser(req);
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);
  let body = null;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: "bad_request", message: "JSON invalido." });
    return;
  }
  const planId = typeof body?.planId === "string" ? body.planId.trim() || null : body?.planId === null ? null : void 0;
  const maxRecommendations = typeof body?.maxRecommendations === "number" ? body.maxRecommendations : 3;
  if (planId === null) {
    sendJson(res, 200, { found: false, reason: "no_active_plan", message: "Selecione um edital ativo no Planner para usar o Engine." });
    return;
  }
  if (!Number.isInteger(maxRecommendations) || maxRecommendations < 1 || maxRecommendations > 5) {
    sendJson(res, 400, { error: "bad_request", message: 'Campo "maxRecommendations" deve ser um inteiro entre 1 e 5.' });
    return;
  }
  try {
    const result = await new GetPlanEngineSnapshot(new LegacyEngineDataSource(auth.idToken)).execute({ userId: auth.identity.uid, today: getServerTodayIso(), planId, maxRecommendations });
    sendJson(res, 200, result);
  } catch (error) {
    console.error("[api-engine-snapshot] execution failed", error);
    sendJson(res, 500, { error: "engine_error", message: "Erro ao carregar o snapshot do motor." });
  }
}
async function handleEnginePortfolio(req, res) {
  setCors(req, res, "GET");
  if (req.method === "OPTIONS") return void (res.statusCode = 204, res.end());
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "method_not_allowed", message: "Use GET para carregar o portfolio do Engine." });
    return;
  }
  const auth = await verifyRequestUser(req);
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);
  const rawBudget = readQuery(req).get("globalWeeklyBudget");
  const globalWeeklyBudget = rawBudget && rawBudget.trim().length > 0 ? Number(rawBudget) : 30;
  if (!Number.isInteger(globalWeeklyBudget) || globalWeeklyBudget <= 0) {
    sendJson(res, 400, { error: "bad_request", message: 'Query "globalWeeklyBudget" deve ser um inteiro maior que zero.' });
    return;
  }
  try {
    const result = await new GetPortfolioSnapshot(new LegacyEngineDataSource(auth.idToken)).execute({ userId: auth.identity.uid, today: getServerTodayIso(), globalWeeklyBudget });
    sendJson(res, 200, result);
  } catch (error) {
    console.error("[api-engine-portfolio] execution failed", error);
    sendJson(res, 500, { error: "engine_error", message: "Erro ao carregar o portf\xF3lio multi-edital." });
  }
}
async function handleProductEvents(req, res) {
  setCors(req, res, "POST");
  if (req.method === "OPTIONS") return void (res.statusCode = 204, res.end());
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed", message: "Use POST para registrar eventos de produto." });
    return;
  }
  const auth = await verifyRequestUser(req);
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);
  let body = null;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: "bad_request", message: "JSON invalido." });
    return;
  }
  if (!isPublicProductEventName(body?.eventName)) {
    sendJson(res, 400, { error: "invalid_event_name", message: "Evento de produto nao permitido nesta rota." });
    return;
  }
  const metadata = body?.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? normalizeProductEventMetadata(body.metadata) : void 0;
  try {
    await saveProductUsageEvent({
      actorUserId: auth.identity.uid,
      userId: auth.identity.uid,
      eventName: body.eventName,
      route: readOptionalString(body.route),
      surface: readOptionalString(body.surface),
      featureCode: readOptionalString(body.featureCode),
      recommendedPlan: readOptionalString(body.recommendedPlan),
      planTier: readOptionalString(body.planTier),
      task: readOptionalString(body.task),
      ctaHref: readOptionalString(body.ctaHref),
      metadata
    }, auth.idToken);
    sendJson(res, 202, { ok: true });
  } catch (error) {
    console.error("[api-product-events] execution failed", error);
    sendJson(res, 500, { error: "product_event_write_failed", message: "Nao foi possivel registrar o evento de produto." });
  }
}
async function handleBillingCheckout(req, res) {
  setCors(req, res, "POST");
  if (req.method === "OPTIONS") return void (res.statusCode = 204, res.end());
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed", message: "Use POST para iniciar sessao de checkout." });
    return;
  }
  const auth = await verifyRequestUser(req);
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);
  let body = null;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: "bad_request", message: "JSON invalido." });
    return;
  }
  const interval = body?.interval;
  if (interval !== "monthly" && interval !== "annually") {
    sendJson(res, 400, {
      error: "bad_request",
      message: 'Campo "interval" deve ser "monthly" ou "annually".'
    });
    return;
  }
  try {
    const adapter = new MercadoPagoBillingAdapter();
    const useCase = new CreateCheckoutSession(adapter);
    const isSandbox = process.env.MERCADO_PAGO_ACCESS_TOKEN?.startsWith("TEST-");
    const payerEmail = isSandbox ? `sandbox-buyer-${auth.identity.uid.slice(0, 8)}@aprovamind.com` : auth.identity.email || "sandbox-user@aprovamind.com";
    const result = await useCase.execute({
      userId: auth.identity.uid,
      email: payerEmail,
      interval
    });
    sendJson(res, 200, {
      success: true,
      checkoutUrl: result.initPoint,
      checkoutId: result.checkoutId
    });
  } catch (error) {
    console.error("[api-billing-checkout] execution failed", error);
    sendJson(res, 500, {
      error: "checkout_error",
      message: error.message || "Erro ao gerar sessao de checkout."
    });
  }
}
var RestFirestoreAdminWriter = class {
  constructor(idToken, setDocFn, getDocFn) {
    this.idToken = idToken;
    this.setDocFn = setDocFn;
    this.getDocFn = getDocFn;
  }
  async setDocument(collection, documentId, data) {
    const result = await this.setDocFn({
      collection,
      documentId,
      data,
      idToken: this.idToken
    });
    return {
      ok: result.ok,
      error: result.error
    };
  }
  async getDocument(collection, documentId) {
    const result = await this.getDocFn({
      collection,
      documentId,
      idToken: this.idToken
    });
    return {
      ok: result.ok,
      exists: result.exists,
      data: result.data
    };
  }
};
async function handleBillingCancel(req, res) {
  setCors(req, res, "POST");
  if (req.method === "OPTIONS") return void (res.statusCode = 204, res.end());
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed", message: "Use POST para cancelar assinatura." });
    return;
  }
  const auth = await verifyRequestUser(req);
  if (!auth.ok) return sendJson(res, auth.statusCode, auth.payload);
  try {
    const adapter = new MercadoPagoBillingAdapter();
    const adminSession = await getAdminSession();
    const writer = new RestFirestoreAdminWriter(
      adminSession.idToken,
      setFirestoreDocumentWithUserToken,
      getFirestoreDocumentWithUserToken
    );
    const useCase = new CancelSubscription(adapter, writer);
    const result = await useCase.execute({
      userId: auth.identity.uid
    });
    sendJson(res, 200, result);
  } catch (error) {
    console.error("[api-billing-cancel] execution failed", error);
    sendJson(res, 500, {
      error: "cancel_error",
      message: error.message || "Erro ao cancelar assinatura."
    });
  }
}
async function handleBillingWebhook(req, res) {
  setCors(req, res, "POST");
  if (req.method === "OPTIONS") return void (res.statusCode = 204, res.end());
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed", message: "Use POST para receber webhook." });
    return;
  }
  let body = null;
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const rawBody = Buffer.concat(chunks).toString("utf-8");
  try {
    body = JSON.parse(rawBody);
  } catch {
    sendJson(res, 400, { error: "bad_request", message: "JSON invalido." });
    return;
  }
  const signature = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];
  try {
    const adapter = new MercadoPagoBillingAdapter();
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || "";
    if (secret) {
      const isValid = adapter.verifyWebhookSignature(signature || "", requestId || "", rawBody);
      if (!isValid) {
        sendJson(res, 400, {
          error: "invalid_signature",
          message: "Assinatura digital do webhook inv\xE1lida ou ausente."
        });
        return;
      }
    }
    const eventId = (body?.id ?? requestId ?? "").toString();
    const rawTopic = (body?.topic ?? body?.type ?? "").toString();
    let topic = "";
    if (rawTopic.includes("payment")) {
      topic = "payment";
    } else if (rawTopic.includes("preapproval")) {
      topic = "preapproval";
    } else {
      topic = rawTopic;
    }
    const dataObj = body?.data;
    const resourceId = (dataObj?.id ?? body?.resource?.split("/").pop() ?? "").toString();
    if (!eventId || !topic || !resourceId) {
      console.warn({ eventId, topic, resourceId }, "Webhook recebido com par\xE2metros incompletos.");
      sendJson(res, 200, { status: "ignored", reason: "incomplete_parameters" });
      return;
    }
    const adminSession = await getAdminSession();
    const writer = new RestFirestoreAdminWriter(
      adminSession.idToken,
      setFirestoreDocumentWithUserToken,
      getFirestoreDocumentWithUserToken
    );
    const useCase = new HandleBillingWebhook(adapter, writer);
    const result = await useCase.execute({
      eventId,
      topic,
      resourceId
    });
    sendJson(res, 200, result);
  } catch (error) {
    console.error("[api-billing-webhook] execution failed", error);
    sendJson(res, 500, {
      error: "webhook_error",
      message: error.message || "Erro ao processar webhook."
    });
  }
}
async function handleBackendRequest(req, res) {
  const route = getRoute(req);
  switch (route) {
    case "entitlements-me":
      return handleEntitlementsMe(req, res);
    case "entitlements-scenarios":
      return handleEntitlementsScenarios(req, res);
    case "billing-subscription-me":
      return handleSubscriptionMe(req, res);
    case "billing-checkout":
      return handleBillingCheckout(req, res);
    case "billing-cancel":
      return handleBillingCancel(req, res);
    case "billing-webhook-mercadopago":
      return handleBillingWebhook(req, res);
    case "billing-admin-subscription":
      return handleAdminSubscription(req, res);
    case "billing-admin-beta-signals":
      return handleBetaSignals(req, res);
    case "engine-snapshot":
      return handleEngineSnapshot(req, res);
    case "engine-portfolio":
      return handleEnginePortfolio(req, res);
    case "product-events":
      return handleProductEvents(req, res);
    default:
      return sendJson(res, 404, { error: "not_found", message: "Rota de API nao encontrada." });
  }
}
async function handler(req, res) {
  await handleBackendRequest(req, res);
}
export {
  handler as default,
  handleBackendRequest
};
