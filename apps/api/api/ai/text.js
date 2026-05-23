var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../packages/infrastructure-firebase/src/index.ts
var src_exports = {};
__export(src_exports, {
  createFirestoreDocumentWithUserToken: () => createFirestoreDocumentWithUserToken,
  extractBearerToken: () => extractBearerToken,
  findFirebaseUserByEmail: () => findFirebaseUserByEmail,
  getFirestoreDocumentWithUserToken: () => getFirestoreDocumentWithUserToken,
  listFirestoreDocumentsWithUserToken: () => listFirestoreDocumentsWithUserToken,
  setFirestoreDocumentWithUserToken: () => setFirestoreDocumentWithUserToken,
  verifyFirebaseIdToken: () => verifyFirebaseIdToken
});
function getFirebaseApiKey() {
  return process.env.FIREBASE_WEB_API_KEY || process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || null;
}
function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  const token = authorizationHeader.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
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
var init_src = __esm({
  "../../packages/infrastructure-firebase/src/index.ts"() {
    "use strict";
  }
});

// ../../packages/ai-gateway/src/pricing.ts
function normalizeModelKey(model) {
  return model.trim().toLowerCase();
}
function getModelPricing(model) {
  return MODEL_PRICING_PER_1M[normalizeModelKey(model)] || null;
}
function estimateRequestCostUsd(params) {
  return estimateCostUsd({
    model: params.model,
    inputTokens: params.estimatedInputTokens,
    outputTokens: params.estimatedOutputTokens
  });
}
function estimateCostUsd(params) {
  const pricing = getModelPricing(params.model);
  if (!pricing) return 0;
  const inputCost = Math.max(0, params.inputTokens) / 1e6 * pricing.inputPer1M;
  const outputCost = Math.max(0, params.outputTokens) / 1e6 * pricing.outputPer1M;
  return Number((inputCost + outputCost).toFixed(8));
}
var MODEL_PRICING_PER_1M;
var init_pricing = __esm({
  "../../packages/ai-gateway/src/pricing.ts"() {
    "use strict";
    MODEL_PRICING_PER_1M = {
      // Gemini (Developer API)
      "gemini-2.5-flash": { inputPer1M: 0.3, outputPer1M: 2.5 },
      "gemini-2.5-flash-lite": { inputPer1M: 0.1, outputPer1M: 0.4 },
      // Qwen / Alibaba Model Studio public list style aliases.
      "qwen-flash": { inputPer1M: 0.022, outputPer1M: 0.216 },
      "qwen3-flash": { inputPer1M: 0.029, outputPer1M: 0.287 },
      "qwen-3.5-flash": { inputPer1M: 0.029, outputPer1M: 0.287 },
      "qwen3.5-flash": { inputPer1M: 0.029, outputPer1M: 0.287 },
      "qwen/qwen3-8b": { inputPer1M: 0.05, outputPer1M: 0.2 },
      "qwen/qwen3-14b": { inputPer1M: 0.08, outputPer1M: 0.24 },
      "qwen/qwen3-30b-a3b": { inputPer1M: 0.08, outputPer1M: 0.29 },
      // DeepSeek
      "deepseek-chat": { inputPer1M: 0.28, outputPer1M: 0.42 },
      "deepseek/deepseek-v4-flash": { inputPer1M: 0.287, outputPer1M: 0.431 },
      "deepseek/deepseek-v4-flash:free": { inputPer1M: 0, outputPer1M: 0 },
      // OpenAI
      "gpt-5-mini": { inputPer1M: 0.25, cachedInputPer1M: 0.025, outputPer1M: 2 },
      "gpt-5-nano": { inputPer1M: 0.05, cachedInputPer1M: 5e-3, outputPer1M: 0.4 }
    };
  }
});

// ../../packages/ai-gateway/src/metrics.ts
function estimateTokensFromText(text) {
  return Math.max(1, Math.ceil((text || "").length / 4));
}
function estimatePromptTokens(params) {
  return estimateTokensFromText(`${params.systemInstruction || ""}
${params.prompt || ""}`);
}
function estimateOutputTokensFromLimit(maxOutputTokens, fallback = 256) {
  const value = Number(maxOutputTokens ?? fallback);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(1, Math.ceil(value));
}
function buildUsage(params) {
  const inputTokens = Math.max(0, Math.round(params.inputTokens));
  const outputTokens = Math.max(0, Math.round(params.outputTokens));
  const totalTokens = inputTokens + outputTokens;
  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCostUsd: estimateCostUsd({
      model: params.model,
      inputTokens,
      outputTokens
    })
  };
}
function extractGeminiUsage(response) {
  const usage = response?.usageMetadata;
  if (!usage) return {};
  const inputTokens = Number(usage.promptTokenCount);
  const outputTokens = Number(usage.candidatesTokenCount);
  const totalTokens = Number(usage.totalTokenCount);
  return {
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : void 0,
    outputTokens: Number.isFinite(outputTokens) ? outputTokens : void 0,
    totalTokens: Number.isFinite(totalTokens) ? totalTokens : void 0
  };
}
function extractOpenAiUsage(response) {
  const usage = response?.usage;
  if (!usage) return {};
  const inputTokens = Number(usage.input_tokens ?? usage.prompt_tokens);
  const outputTokens = Number(usage.output_tokens ?? usage.completion_tokens);
  const totalTokens = Number(usage.total_tokens);
  return {
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : void 0,
    outputTokens: Number.isFinite(outputTokens) ? outputTokens : void 0,
    totalTokens: Number.isFinite(totalTokens) ? totalTokens : void 0
  };
}
function logAiUsageEvent(event) {
  console.info("[ai-usage]", JSON.stringify(event));
}
var init_metrics = __esm({
  "../../packages/ai-gateway/src/metrics.ts"() {
    "use strict";
    init_pricing();
  }
});

// ../../packages/domain/src/enums.ts
var SubjectHealthStatus, STRATEGIC_STATE_SEVERITY, RecommendationType, RecommendationUrgency, PriorityBand, ExamPhase;
var init_enums = __esm({
  "../../packages/domain/src/enums.ts"() {
    "use strict";
    SubjectHealthStatus = {
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
    STRATEGIC_STATE_SEVERITY = {
      [SubjectHealthStatus.Critical]: 1,
      [SubjectHealthStatus.Neglected]: 2,
      [SubjectHealthStatus.Inefficient]: 3,
      [SubjectHealthStatus.BlindSpot]: 3,
      [SubjectHealthStatus.Warning]: 4,
      [SubjectHealthStatus.Healthy]: 5,
      [SubjectHealthStatus.Mature]: 6,
      [SubjectHealthStatus.NoData]: 7
    };
    RecommendationType = {
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
    RecommendationUrgency = {
      Immediate: "immediate",
      // Exemplo: Executar hoje obrigatoriamente
      High: "high",
      // Priorizar na semana
      Medium: "medium",
      // Agendar normalmente
      Low: "low"
      // Cumprir se tiver tempo livre
    };
    PriorityBand = {
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
    ExamPhase = {
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
  }
});

// ../../packages/domain/src/billing/types.ts
var PlanCode, SubscriptionStatus, AccessState, EntitlementMode, EntitlementPeriod, FeatureCode;
var init_types = __esm({
  "../../packages/domain/src/billing/types.ts"() {
    "use strict";
    PlanCode = {
      Free: "free",
      Pro: "pro"
    };
    SubscriptionStatus = {
      Trialing: "trialing",
      Active: "active",
      PastDue: "past_due",
      GracePeriod: "grace_period",
      Canceled: "canceled",
      Expired: "expired"
    };
    AccessState = {
      Full: "full",
      Restricted: "restricted",
      FreeFallback: "free_fallback"
    };
    EntitlementMode = {
      Boolean: "boolean",
      Quota: "quota"
    };
    EntitlementPeriod = {
      Month: "month",
      Lifetime: "lifetime"
    };
    FeatureCode = {
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
  }
});

// ../../packages/domain/src/billing/entitlement-policy.ts
function createPlan(plan, template) {
  return {
    plan,
    features: template
  };
}
var EFFECTIVELY_UNLIMITED_MONTHLY_LIMIT, DEFAULT_ENTITLEMENT_POLICY;
var init_entitlement_policy = __esm({
  "../../packages/domain/src/billing/entitlement-policy.ts"() {
    "use strict";
    init_types();
    EFFECTIVELY_UNLIMITED_MONTHLY_LIMIT = 9999;
    DEFAULT_ENTITLEMENT_POLICY = {
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
  }
});

// ../../packages/domain/src/billing/resolve-user-entitlements.ts
var init_resolve_user_entitlements = __esm({
  "../../packages/domain/src/billing/resolve-user-entitlements.ts"() {
    "use strict";
    init_types();
    init_entitlement_policy();
  }
});

// ../../packages/domain/src/billing/usage-periods.ts
var init_usage_periods = __esm({
  "../../packages/domain/src/billing/usage-periods.ts"() {
    "use strict";
    init_entitlement_policy();
    init_types();
  }
});

// ../../packages/domain/src/billing/index.ts
var init_billing = __esm({
  "../../packages/domain/src/billing/index.ts"() {
    "use strict";
    init_types();
    init_entitlement_policy();
    init_resolve_user_entitlements();
    init_usage_periods();
  }
});

// ../../packages/domain/src/policies/engine-policy.ts
var DEFAULT_ENGINE_POLICY;
var init_engine_policy = __esm({
  "../../packages/domain/src/policies/engine-policy.ts"() {
    "use strict";
    init_enums();
    DEFAULT_ENGINE_POLICY = {
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
  }
});

// ../../packages/domain/src/value-objects.ts
var URGENCY_TABLE;
var init_value_objects = __esm({
  "../../packages/domain/src/value-objects.ts"() {
    "use strict";
    init_enums();
    URGENCY_TABLE = [
      { maxDays: 0, multiplier: 1, phase: ExamPhase.PostExam },
      { maxDays: 15, multiplier: 3, phase: ExamPhase.FinalPush },
      { maxDays: 30, multiplier: 2.2, phase: ExamPhase.Sprinting },
      { maxDays: 60, multiplier: 1.7, phase: ExamPhase.Consolidating },
      { maxDays: 90, multiplier: 1.3, phase: ExamPhase.Consolidating },
      { maxDays: Infinity, multiplier: 1, phase: ExamPhase.Building }
    ];
  }
});

// ../../packages/domain/src/services/SubjectHealthComputer.ts
var init_SubjectHealthComputer = __esm({
  "../../packages/domain/src/services/SubjectHealthComputer.ts"() {
    "use strict";
    init_enums();
    init_engine_policy();
    init_value_objects();
  }
});

// ../../packages/domain/src/services/PriorityCalculator.ts
var DEFAULT_PRIORITY_WEIGHTS;
var init_PriorityCalculator = __esm({
  "../../packages/domain/src/services/PriorityCalculator.ts"() {
    "use strict";
    init_enums();
    init_engine_policy();
    init_value_objects();
    DEFAULT_PRIORITY_WEIGHTS = DEFAULT_ENGINE_POLICY.priority.weights;
  }
});

// ../../packages/domain/src/services/RecommendationEngine.ts
var URGENCY_WEIGHT;
var init_RecommendationEngine = __esm({
  "../../packages/domain/src/services/RecommendationEngine.ts"() {
    "use strict";
    init_enums();
    init_engine_policy();
    init_value_objects();
    init_SubjectHealthComputer();
    init_PriorityCalculator();
    URGENCY_WEIGHT = {
      [RecommendationUrgency.Immediate]: 4,
      [RecommendationUrgency.High]: 3,
      [RecommendationUrgency.Medium]: 2,
      [RecommendationUrgency.Low]: 1
    };
  }
});

// ../../packages/domain/src/services/PlanEngine.ts
var init_PlanEngine = __esm({
  "../../packages/domain/src/services/PlanEngine.ts"() {
    "use strict";
    init_engine_policy();
    init_value_objects();
    init_PriorityCalculator();
    init_RecommendationEngine();
    init_SubjectHealthComputer();
  }
});

// ../../packages/domain/src/services/PortfolioAllocator.ts
var init_PortfolioAllocator = __esm({
  "../../packages/domain/src/services/PortfolioAllocator.ts"() {
    "use strict";
    init_enums();
    init_value_objects();
    init_SubjectHealthComputer();
  }
});

// ../../packages/domain/src/services/index.ts
var init_services = __esm({
  "../../packages/domain/src/services/index.ts"() {
    "use strict";
    init_SubjectHealthComputer();
    init_PriorityCalculator();
    init_RecommendationEngine();
    init_PlanEngine();
    init_PortfolioAllocator();
  }
});

// ../../packages/domain/src/ai/PromptHeuristics.ts
var PromptHeuristics;
var init_PromptHeuristics = __esm({
  "../../packages/domain/src/ai/PromptHeuristics.ts"() {
    "use strict";
    PromptHeuristics = class {
      /**
       * Avalia se uma pergunta direta do usuário pode ser respondida localmente (RegEx/Dicionário)
       * em vez de gastar tokens do Gemini.
       */
      static evaluateChatPrompt(prompt) {
        const normalized = prompt.trim().toLowerCase();
        if (/^(oi|ola|olá|bom dia|boa tarde|boa noite|tudo bem\??)$/.test(normalized)) {
          return {
            requiresLLM: false,
            localResponse: "Ol\xE1! Como posso ajudar voc\xEA a focar na sua meta de estudos hoje?",
            confidence: 1
          };
        }
        if (normalized.includes("como cancelar") || normalized.includes("refund") || normalized.includes("reembolso")) {
          return {
            requiresLLM: false,
            localResponse: "Para gerenciar sua assinatura, acesse a p\xE1gina de Configura\xE7\xF5es no canto superior direito e clique em 'Assinatura'. D\xFAvidas adicionais, procure nosso suporte.",
            confidence: 0.9
          };
        }
        return {
          requiresLLM: true,
          reason: "Complexidade textual ou inten\xE7\xE3o incerta necessita do LLM."
        };
      }
    };
  }
});

// ../../packages/domain/src/ai/AiBudgetPolicy.ts
var init_AiBudgetPolicy = __esm({
  "../../packages/domain/src/ai/AiBudgetPolicy.ts"() {
    "use strict";
  }
});

// ../../packages/domain/src/index.ts
var init_src2 = __esm({
  "../../packages/domain/src/index.ts"() {
    "use strict";
    init_enums();
    init_billing();
    init_engine_policy();
    init_value_objects();
    init_services();
    init_PromptHeuristics();
    init_AiBudgetPolicy();
  }
});

// ../../packages/ai-gateway/src/providers/gemini.ts
import { GoogleGenAI } from "@google/genai";
function getGeminiApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY n\xE3o configurada");
  }
  return key;
}
async function generateGeminiText(params) {
  const startedAt = Date.now();
  if (typeof params.request.prompt === "string") {
    const heuristic = PromptHeuristics.evaluateChatPrompt(params.request.prompt);
    if (!heuristic.requiresLLM) {
      const tokens = estimateTokensFromText(heuristic.localResponse);
      return {
        text: heuristic.localResponse,
        provider: "local-heuristic",
        model: "heuristic-engine-v1",
        latencyMs: Date.now() - startedAt,
        usage: buildUsage({
          model: "heuristic",
          inputTokens: 0,
          outputTokens: tokens
        }),
        raw: { heuristicConfidence: heuristic.confidence }
      };
    }
  }
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const response = await ai.models.generateContent({
    model: params.model,
    contents: params.request.prompt,
    config: {
      temperature: params.request.temperature,
      maxOutputTokens: params.request.maxOutputTokens,
      systemInstruction: params.request.systemInstruction,
      ...params.request.preferJson ? { responseMimeType: "application/json" } : {},
      ...params.request.thinkingBudget !== void 0 ? { thinkingConfig: { thinkingBudget: params.request.thinkingBudget } } : {}
    }
  });
  const text = response.text?.trim() || "";
  const usage = extractGeminiUsage(response);
  const inputFallback = estimateTokensFromText(
    `${params.request.systemInstruction || ""}
${params.request.prompt}`
  );
  const outputFallback = estimateTokensFromText(text);
  return {
    text,
    provider: "gemini",
    model: params.model,
    latencyMs: Date.now() - startedAt,
    usage: buildUsage({
      model: params.model,
      inputTokens: usage.inputTokens ?? inputFallback,
      outputTokens: usage.outputTokens ?? outputFallback
    }),
    raw: response
  };
}
async function generateGeminiPdf(params) {
  const startedAt = Date.now();
  const ai = new GoogleGenAI({ apiKey: getGeminiApiKey() });
  const response = await ai.models.generateContent({
    model: params.model,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: params.request.pdfBase64
            }
          },
          {
            text: params.request.prompt
          }
        ]
      }
    ],
    config: {
      temperature: params.request.temperature,
      maxOutputTokens: params.request.maxOutputTokens,
      systemInstruction: params.request.systemInstruction
    }
  });
  const text = response.text?.trim() || "";
  const usage = extractGeminiUsage(response);
  const inputFallback = Math.max(
    estimateTokensFromText(params.request.prompt),
    Math.ceil(params.request.pdfBase64.length * 0.75 / 4)
  );
  const outputFallback = estimateTokensFromText(text);
  return {
    text,
    provider: "gemini",
    model: params.model,
    latencyMs: Date.now() - startedAt,
    usage: buildUsage({
      model: params.model,
      inputTokens: usage.inputTokens ?? inputFallback,
      outputTokens: usage.outputTokens ?? outputFallback
    }),
    raw: response
  };
}
var init_gemini = __esm({
  "../../packages/ai-gateway/src/providers/gemini.ts"() {
    "use strict";
    init_metrics();
    init_src2();
  }
});

// ../../packages/ai-gateway/src/providers/openai.ts
function getOpenAiApiKey(provider) {
  const key = provider === "openrouter" ? process.env.AI_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || process.env.AI_OPENAI_COMPAT_API_KEY : process.env.AI_OPENAI_COMPAT_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(provider === "openrouter" ? "AI_OPENROUTER_API_KEY/OPENROUTER_API_KEY n\xE3o configurada" : "AI_OPENAI_COMPAT_API_KEY/OPENAI_API_KEY n\xE3o configurada");
  }
  return key;
}
function extractOpenAiText(data) {
  const response = data;
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }
  const fromContent = response.output?.flatMap((item) => item.content || []).filter((part) => part.type === "output_text" || part.type === "text").map((part) => part.text || "").join("\n").trim();
  return fromContent || "";
}
function extractChatCompletionText(data) {
  const response = data;
  const first = response.choices?.[0];
  const content = first?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map((part) => part.text || "").join("\n").trim();
  }
  return first?.text?.trim() || "";
}
function buildOpenRouterHeaders(apiKey) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
  const referer = process.env.AI_OPENROUTER_SITE_URL || process.env.OPENROUTER_SITE_URL;
  const title = process.env.AI_OPENROUTER_APP_NAME || process.env.OPENROUTER_APP_NAME || "AprovaMind";
  if (referer) headers["HTTP-Referer"] = referer;
  if (title) headers["X-Title"] = title;
  return headers;
}
async function generateOpenAiText(params) {
  const startedAt = Date.now();
  const provider = params.provider || "openai-compatible";
  const isOpenRouter = provider === "openrouter";
  const compatBaseUrl = (isOpenRouter ? process.env.AI_OPENROUTER_BASE_URL || process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1" : process.env.AI_OPENAI_COMPAT_BASE_URL || "").replace(/\/$/, "");
  const endpoint = isOpenRouter ? process.env.AI_OPENROUTER_CHAT_COMPLETIONS_URL || `${compatBaseUrl}/chat/completions` : process.env.AI_OPENAI_COMPAT_RESPONSES_URL || process.env.OPENAI_RESPONSES_URL || (compatBaseUrl ? `${compatBaseUrl}/responses` : "https://api.openai.com/v1/responses");
  const body = isOpenRouter ? {
    model: params.model,
    messages: [
      ...params.request.systemInstruction ? [{ role: "system", content: params.request.systemInstruction }] : [],
      { role: "user", content: params.request.prompt }
    ],
    temperature: params.request.temperature,
    max_tokens: params.request.maxOutputTokens
  } : {
    model: params.model,
    input: [
      ...params.request.systemInstruction ? [
        {
          role: "system",
          content: [{ type: "input_text", text: params.request.systemInstruction }]
        }
      ] : [],
      {
        role: "user",
        content: [{ type: "input_text", text: params.request.prompt }]
      }
    ],
    temperature: params.request.temperature,
    max_output_tokens: params.request.maxOutputTokens
  };
  if (params.request.preferJson) {
    if (isOpenRouter) {
      body.response_format = { type: "json_object" };
    } else {
      body.text = { format: { type: "json_object" } };
    }
  }
  const res = await fetch(endpoint, {
    method: "POST",
    headers: isOpenRouter ? buildOpenRouterHeaders(getOpenAiApiKey(provider)) : {
      Authorization: `Bearer ${getOpenAiApiKey(provider)}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error?.message || `${provider} error ${res.status}`;
    throw new Error(msg);
  }
  const text = isOpenRouter ? extractChatCompletionText(data) : extractOpenAiText(data);
  const usage = extractOpenAiUsage(data);
  const inputFallback = estimateTokensFromText(
    `${params.request.systemInstruction || ""}
${params.request.prompt}`
  );
  const outputFallback = estimateTokensFromText(text);
  return {
    text,
    provider,
    model: params.model,
    latencyMs: Date.now() - startedAt,
    usage: buildUsage({
      model: params.model,
      inputTokens: usage.inputTokens ?? inputFallback,
      outputTokens: usage.outputTokens ?? outputFallback
    }),
    raw: data
  };
}
var init_openai = __esm({
  "../../packages/ai-gateway/src/providers/openai.ts"() {
    "use strict";
    init_metrics();
  }
});

// ../../packages/ai-gateway/src/gateway.ts
function envNameForTask(task) {
  return task.toUpperCase().replace(/-/g, "_");
}
function resolveConfig(task) {
  const fallback = DEFAULTS[task];
  const globalProvider = (process.env.AI_PROVIDER_DEFAULT || "").toLowerCase();
  const globalModel = process.env.AI_MODEL_DEFAULT;
  const taskKey = envNameForTask(task);
  const providerByTask = process.env[`AI_PROVIDER_${taskKey}`] || globalProvider;
  const modelByTask = process.env[`AI_MODEL_${taskKey}`] || globalModel;
  const provider = providerByTask === "openrouter" ? "openrouter" : providerByTask === "openai" || providerByTask === "openai-compatible" ? "openai-compatible" : providerByTask === "gemini" ? "gemini" : fallback.provider;
  return {
    provider,
    model: modelByTask?.trim() || fallback.model
  };
}
function resolveAiTaskPolicy(task) {
  const base = DEFAULT_POLICIES[task];
  const config = resolveConfig(task);
  const maxOutputEnv = Number(process.env[`AI_MAX_OUTPUT_${envNameForTask(task)}`]);
  const maxOutputTokens = Number.isFinite(maxOutputEnv) && maxOutputEnv > 0 ? Math.floor(maxOutputEnv) : base.maxOutputTokens;
  const qualityTier = (() => {
    const value = (process.env[`AI_QUALITY_${envNameForTask(task)}`] || "").toLowerCase();
    if (value === "premium" || value === "balanced" || value === "economical") return value;
    return base.qualityTier;
  })();
  return {
    ...base,
    provider: config.provider,
    model: config.model,
    maxOutputTokens,
    qualityTier
  };
}
function toOptionalBudgetNumber(value) {
  if (value === null || value === void 0 || value === "") return void 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return void 0;
  return Math.max(0, parsed);
}
function resolveBudgetDecision(params) {
  const estimatedRequestCostUsd = estimateRequestCostUsd({
    model: params.model,
    estimatedInputTokens: params.estimatedInputTokens,
    estimatedOutputTokens: params.estimatedOutputTokens
  });
  const userDailyBudgetUsd = toOptionalBudgetNumber(
    params.requestBudget?.userDailyBudgetUsd ?? process.env.AI_DAILY_USER_BUDGET_USD
  );
  const globalMonthlyBudgetUsd = toOptionalBudgetNumber(
    params.requestBudget?.globalMonthlyBudgetUsd ?? process.env.AI_MONTHLY_GLOBAL_BUDGET_USD
  );
  const limits = [];
  if (userDailyBudgetUsd !== void 0) {
    const consumedUsd = toOptionalBudgetNumber(
      params.requestBudget?.userDailyConsumedUsd ?? process.env.AI_DAILY_USER_CONSUMED_USD
    ) ?? 0;
    const reservedUsd = toOptionalBudgetNumber(
      params.requestBudget?.userDailyReservedUsd ?? process.env.AI_DAILY_USER_RESERVED_USD
    ) ?? 0;
    limits.push({
      scope: "user",
      window: "day",
      limitUsd: userDailyBudgetUsd,
      consumedUsd,
      reservedUsd,
      remainingUsd: Number(Math.max(0, userDailyBudgetUsd - consumedUsd - reservedUsd).toFixed(8))
    });
  }
  if (globalMonthlyBudgetUsd !== void 0) {
    const consumedUsd = toOptionalBudgetNumber(
      params.requestBudget?.globalMonthlyConsumedUsd ?? process.env.AI_MONTHLY_GLOBAL_CONSUMED_USD
    ) ?? 0;
    const reservedUsd = toOptionalBudgetNumber(
      params.requestBudget?.globalMonthlyReservedUsd ?? process.env.AI_MONTHLY_GLOBAL_RESERVED_USD
    ) ?? 0;
    limits.push({
      scope: "global",
      window: "month",
      limitUsd: globalMonthlyBudgetUsd,
      consumedUsd,
      reservedUsd,
      remainingUsd: Number(Math.max(0, globalMonthlyBudgetUsd - consumedUsd - reservedUsd).toFixed(8))
    });
  }
  const userLimit = limits.find((limit) => limit.scope === "user");
  if (userLimit && estimatedRequestCostUsd > userLimit.remainingUsd) {
    return {
      allowed: false,
      task: params.task,
      estimatedRequestCostUsd,
      limits,
      blockReason: "user_daily_budget"
    };
  }
  const globalLimit = limits.find((limit) => limit.scope === "global");
  if (globalLimit && estimatedRequestCostUsd > globalLimit.remainingUsd) {
    return {
      allowed: false,
      task: params.task,
      estimatedRequestCostUsd,
      limits,
      blockReason: "global_monthly_budget"
    };
  }
  return {
    allowed: true,
    task: params.task,
    estimatedRequestCostUsd,
    limits
  };
}
function shouldFallbackToGemini(err) {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return msg.includes("openai_api_key") || msg.includes("openrouter_api_key") || msg.includes("openai") || msg.includes("openrouter") || msg.includes("429") || msg.includes("quota");
}
async function runAiText(request) {
  const policy = resolveAiTaskPolicy(request.task);
  const estimatedInputTokens = Math.max(
    policy.estimatedInputTokens,
    estimatePromptTokens({ prompt: request.prompt, systemInstruction: request.systemInstruction })
  );
  const estimatedOutputTokens = estimateOutputTokensFromLimit(
    request.maxOutputTokens ?? policy.maxOutputTokens,
    policy.estimatedOutputTokens
  );
  const budgetDecision = resolveBudgetDecision({
    task: request.task,
    model: policy.model,
    estimatedInputTokens,
    estimatedOutputTokens,
    requestBudget: request.budget
  });
  if (!budgetDecision.allowed) {
    return {
      text: "Limite de or\xE7amento de IA atingido para este recurso. Usei uma rota segura sem custo quando dispon\xEDvel.",
      provider: "local-heuristic",
      model: "budget-policy",
      latencyMs: 0,
      usage: buildUsage({
        model: policy.model,
        inputTokens: 0,
        outputTokens: 0
      }),
      status: "blocked_by_budget",
      fallbackUsed: Boolean(request.allowFallback ?? policy.allowFallback),
      budgetBlocked: true,
      userMessage: "Limite de or\xE7amento de IA atingido. Mantive a experi\xEAncia protegida para evitar custo acima do planejado.",
      errorCode: budgetDecision.blockReason,
      budgetDecision
    };
  }
  const requestWithPolicy = {
    ...request,
    maxOutputTokens: Math.min(
      request.maxOutputTokens ?? policy.maxOutputTokens,
      policy.maxOutputTokens
    )
  };
  if (policy.provider === "openai" || policy.provider === "openai-compatible" || policy.provider === "openrouter") {
    try {
      const result2 = await generateOpenAiText({ provider: policy.provider, model: policy.model, request: requestWithPolicy });
      return {
        ...result2,
        provider: policy.provider,
        status: "success",
        fallbackUsed: false,
        budgetBlocked: false,
        userMessage: "Resposta gerada com IA.",
        budgetDecision
      };
    } catch (err) {
      if (!shouldFallbackToGemini(err)) throw err;
      const result2 = await generateGeminiText({
        model: GEMINI_FALLBACK_MODELS[request.task],
        request: requestWithPolicy
      });
      return {
        ...result2,
        status: "success",
        fallbackUsed: true,
        budgetBlocked: false,
        userMessage: "Provider alternativo indispon\xEDvel; usei o fallback seguro.",
        errorCode: "provider_fallback",
        budgetDecision
      };
    }
  }
  const result = await generateGeminiText({ model: policy.model, request: requestWithPolicy });
  return {
    ...result,
    status: "success",
    fallbackUsed: false,
    budgetBlocked: false,
    userMessage: "Resposta gerada com IA.",
    budgetDecision
  };
}
async function runAiPdf(request) {
  const policy = resolveAiTaskPolicy(request.task);
  const result = await generateGeminiPdf({
    model: policy.provider === "gemini" ? policy.model : DEFAULTS[request.task].model,
    request
  });
  return {
    ...result,
    status: "success",
    fallbackUsed: false,
    budgetBlocked: false,
    userMessage: "Resposta gerada com IA."
  };
}
var DEFAULT_POLICIES, DEFAULTS, GEMINI_FALLBACK_MODELS;
var init_gateway = __esm({
  "../../packages/ai-gateway/src/gateway.ts"() {
    "use strict";
    init_gemini();
    init_openai();
    init_metrics();
    init_metrics();
    init_pricing();
    DEFAULT_POLICIES = {
      chat: { task: "chat", provider: "openrouter", model: "qwen/qwen3-8b", maxOutputTokens: 320, allowFallback: false, estimatedInputTokens: 700, estimatedOutputTokens: 220, qualityTier: "economical" },
      "weekly-mentoring": { task: "weekly-mentoring", provider: "openrouter", model: "deepseek/deepseek-v4-flash", maxOutputTokens: 900, allowFallback: true, estimatedInputTokens: 1800, estimatedOutputTokens: 650, qualityTier: "balanced" },
      "parse-edital": { task: "parse-edital", provider: "gemini", model: "gemini-2.5-flash", maxOutputTokens: 4e3, allowFallback: false, estimatedInputTokens: 8e3, estimatedOutputTokens: 2500, qualityTier: "premium" },
      "planner-daily": { task: "planner-daily", provider: "openrouter", model: "qwen/qwen3-8b", maxOutputTokens: 900, allowFallback: true, estimatedInputTokens: 1500, estimatedOutputTokens: 650, qualityTier: "economical" },
      "smart-schedule": { task: "smart-schedule", provider: "openrouter", model: "qwen/qwen3-14b", maxOutputTokens: 1200, allowFallback: true, estimatedInputTokens: 2e3, estimatedOutputTokens: 800, qualityTier: "economical" },
      interrogation: { task: "interrogation", provider: "openrouter", model: "qwen/qwen3-8b", maxOutputTokens: 700, allowFallback: false, estimatedInputTokens: 1200, estimatedOutputTokens: 450, qualityTier: "economical" },
      "predictive-exam": { task: "predictive-exam", provider: "openrouter", model: "deepseek/deepseek-v4-flash", maxOutputTokens: 1200, allowFallback: false, estimatedInputTokens: 2200, estimatedOutputTokens: 900, qualityTier: "balanced" },
      "explain-answer": { task: "explain-answer", provider: "openrouter", model: "qwen/qwen3-8b", maxOutputTokens: 600, allowFallback: false, estimatedInputTokens: 1e3, estimatedOutputTokens: 420, qualityTier: "economical" },
      "error-diagnosis": { task: "error-diagnosis", provider: "openrouter", model: "deepseek/deepseek-v4-flash", maxOutputTokens: 1200, allowFallback: true, estimatedInputTokens: 2200, estimatedOutputTokens: 900, qualityTier: "balanced" }
    };
    DEFAULTS = Object.fromEntries(
      Object.entries(DEFAULT_POLICIES).map(([task, policy]) => [task, {
        provider: policy.provider,
        model: policy.model
      }])
    );
    GEMINI_FALLBACK_MODELS = {
      chat: "gemini-2.5-flash-lite",
      "weekly-mentoring": "gemini-2.5-flash",
      "parse-edital": "gemini-2.5-flash",
      "planner-daily": "gemini-2.5-flash-lite",
      "smart-schedule": "gemini-2.5-flash-lite",
      interrogation: "gemini-2.5-flash-lite",
      "predictive-exam": "gemini-2.5-flash",
      "explain-answer": "gemini-2.5-flash-lite",
      "error-diagnosis": "gemini-2.5-flash"
    };
  }
});

// ../../packages/ai-gateway/src/json.ts
function extractFirstJsonObject(raw) {
  const input = raw?.trim();
  if (!input) return null;
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }
    if (ch === "}") {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        return input.slice(start, i + 1);
      }
    }
  }
  return null;
}
function parseJsonFromModelText(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
  }
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
  }
  const extracted = extractFirstJsonObject(cleaned);
  if (!extracted) return null;
  try {
    return JSON.parse(extracted);
  } catch {
    return null;
  }
}
var init_json = __esm({
  "../../packages/ai-gateway/src/json.ts"() {
    "use strict";
  }
});

// ../../packages/ai-gateway/src/types.ts
var init_types2 = __esm({
  "../../packages/ai-gateway/src/types.ts"() {
    "use strict";
  }
});

// ../../packages/ai-gateway/src/index.ts
var src_exports2 = {};
__export(src_exports2, {
  buildUsage: () => buildUsage,
  estimateCostUsd: () => estimateCostUsd,
  estimateOutputTokensFromLimit: () => estimateOutputTokensFromLimit,
  estimatePromptTokens: () => estimatePromptTokens,
  estimateRequestCostUsd: () => estimateRequestCostUsd,
  estimateTokensFromText: () => estimateTokensFromText,
  extractFirstJsonObject: () => extractFirstJsonObject,
  extractGeminiUsage: () => extractGeminiUsage,
  extractOpenAiUsage: () => extractOpenAiUsage,
  getModelPricing: () => getModelPricing,
  logAiUsageEvent: () => logAiUsageEvent,
  parseJsonFromModelText: () => parseJsonFromModelText,
  resolveAiTaskPolicy: () => resolveAiTaskPolicy,
  runAiPdf: () => runAiPdf,
  runAiText: () => runAiText
});
var init_src3 = __esm({
  "../../packages/ai-gateway/src/index.ts"() {
    "use strict";
    init_gateway();
    init_json();
    init_metrics();
    init_pricing();
    init_types2();
  }
});

// src/modules/ai/ai-usage-store.ts
var ai_usage_store_exports = {};
__export(ai_usage_store_exports, {
  AI_USAGE_COLLECTION: () => AI_USAGE_COLLECTION,
  saveAiUsageEvent: () => saveAiUsageEvent
});
async function saveAiUsageEvent(event, idToken, writer = createFirestoreDocumentWithUserToken) {
  if (!idToken) return;
  const payload = {
    ...event,
    status: event.status || (event.success ? "success" : "failed"),
    fallbackUsed: Boolean(event.fallbackUsed),
    budgetBlocked: Boolean(event.budgetBlocked),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const result = await writer({
    collection: AI_USAGE_COLLECTION,
    data: payload,
    idToken
  });
  if (!result.ok) {
    console.warn("[ai-usage] Firestore write failed:", result.status, result.error);
  }
}
var AI_USAGE_COLLECTION;
var init_ai_usage_store = __esm({
  "src/modules/ai/ai-usage-store.ts"() {
    "use strict";
    init_src();
    AI_USAGE_COLLECTION = "ai_usage_events";
  }
});

// api-src/ai/text.ts
function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}
function setCors(req, res) {
  const origin = req.headers.origin;
  res.setHeader("access-control-allow-origin", typeof origin === "string" ? origin : "*");
  res.setHeader("access-control-allow-methods", "POST,OPTIONS");
  res.setHeader("access-control-allow-headers", "Content-Type, Authorization");
  res.setHeader("vary", "Origin");
}
function extractBearerToken2(value) {
  if (typeof value !== "string") return null;
  if (!value.startsWith("Bearer ")) return null;
  const token = value.slice("Bearer ".length).trim();
  return token || null;
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
async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, {
      error: "method_not_allowed",
      message: "Use POST para executar esta rota de IA."
    });
    return;
  }
  const idToken = extractBearerToken2(req.headers.authorization);
  if (!idToken) {
    sendJson(res, 401, {
      error: "unauthorized",
      message: "Envie um Authorization: Bearer <firebase-id-token> valido."
    });
    return;
  }
  let body = null;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, {
      error: "bad_request",
      message: "JSON invalido."
    });
    return;
  }
  if (!body || typeof body.task !== "string" || typeof body.prompt !== "string") {
    sendJson(res, 400, {
      error: "bad_request",
      message: "Campos obrigat\xF3rios: task, prompt."
    });
    return;
  }
  try {
    const [{ verifyFirebaseIdToken: verifyFirebaseIdToken2 }, gateway] = await Promise.all([
      Promise.resolve().then(() => (init_src(), src_exports)),
      Promise.resolve().then(() => (init_src3(), src_exports2))
    ]);
    const user = await verifyFirebaseIdToken2(idToken);
    if (!user) {
      sendJson(res, 401, {
        error: "unauthorized",
        message: "Token expirado ou invalido."
      });
      return;
    }
    const result = await gateway.runAiText(body);
    const status = result.status || "success";
    const statusCode = status === "blocked_by_budget" ? 429 : 200;
    const usageEvent = {
      route: "/ai/text",
      task: String(body.task),
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
      estimatedCostUsd: result.usage.estimatedCostUsd,
      success: status !== "failed" && status !== "blocked_by_budget",
      status,
      fallbackUsed: Boolean(result.fallbackUsed),
      budgetBlocked: Boolean(result.budgetBlocked),
      statusCode,
      userId: user.uid,
      errorCode: result.errorCode
    };
    void Promise.resolve().then(() => (init_ai_usage_store(), ai_usage_store_exports)).then(({ saveAiUsageEvent: saveAiUsageEvent2 }) => saveAiUsageEvent2(usageEvent, idToken)).catch((error) => {
      console.warn("[api-ai] usage persistence failed:", error instanceof Error ? error.message : error);
    });
    sendJson(res, 200, {
      text: result.text,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      usage: result.usage,
      status,
      fallbackUsed: Boolean(result.fallbackUsed),
      budgetBlocked: Boolean(result.budgetBlocked),
      userMessage: result.userMessage,
      errorCode: result.errorCode
    });
  } catch (error) {
    console.error("[api-ai] text execution failed", error);
    sendJson(res, 500, {
      error: "ai_error",
      message: "Nao foi possivel concluir a chamada de IA na API dedicada."
    });
  }
}
export {
  handler as default
};
