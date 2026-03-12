/**
 * RecommendationEngine — AprovaMind Decision Engine
 *
 * Generates typed, actionable recommendations from SubjectHealth data.
 * Produces structured reasons and sorting criteria based on business rules.
 */

import {
    SubjectHealthStatus,
    RecommendationType,
    RecommendationUrgency,
    ExamPhase,
} from '../enums';
import {
    DEFAULT_ENGINE_POLICY,
    type EnginePolicy,
} from '../policies/engine-policy';
import type {
    Recommendation,
    SubjectHealth,
    PlanInput,
    SubjectPlanInput,
    StudySessionInput,
    QuestionSessionInput,
    PlanEngineContext,
} from '../types';
import { createPlanningWindow, type PlanningWindow } from '../value-objects';
import { computeAllSubjectHealth } from './SubjectHealthComputer';
import { applyPriorityCalculation } from './PriorityCalculator';

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Generates detailed recommendations for a given study plan.
 * Uses computeAllSubjectHealth and calculateSubjectPriorityScore internally.
 * Returns exactly ONE recommendation per subject, sorted by urgency and priority.
 */
export function generateRecommendationsForPlan(
    plan: PlanInput,
    subjects: SubjectPlanInput[],
    sessions: StudySessionInput[],
    questionSessions: QuestionSessionInput[],
    currentDate: string,
    policy: EnginePolicy = DEFAULT_ENGINE_POLICY
): Recommendation[] {
    // 1. Build context
    const assembledPlan: PlanInput = { ...plan, subjects };
    const ctx: PlanEngineContext = {
        plan: assembledPlan,
        sessions,
        questions: questionSessions,
        // Simplification: treating passed sessions as all-time for engine context unless split upstream
        allTimeSessions: sessions,
        allTimeQuestions: questionSessions,
        today: currentDate,
    };

    // 2. Base window (weekly assume typical rhythm)
    const window = createPlanningWindow({
        type: 'weekly',
        startDate: currentDate,
        endDate: currentDate, // Just needs today for daysToExam logic inside
        availableHours: assembledPlan.weeklyGoalHours,
        examDate: assembledPlan.examDate,
        today: currentDate,
    });

    // 3. Compute continuous health
    let healthEntries = computeAllSubjectHealth(ctx, policy);

    // 4. Compute and rank priority 
    healthEntries = applyPriorityCalculation(
        healthEntries,
        window,
        policy
    );

    return generateRecommendationsForHealthEntries(healthEntries, window, {
        now: currentDate,
        policy,
    });
}

export interface GenerateRecommendationsForHealthEntriesOptions {
    now?: string;
    maxRecommendations?: number;
    policy?: EnginePolicy;
}

export function generateRecommendationsForHealthEntries(
    healthEntries: SubjectHealth[],
    window: PlanningWindow,
    options: GenerateRecommendationsForHealthEntriesOptions = {}
): Recommendation[] {
    const now = options.now ?? new Date().toISOString();
    const policy = options.policy ?? DEFAULT_ENGINE_POLICY;
    const recommendations: Recommendation[] = [];

    for (const health of healthEntries) {
        const rec = generateForSubject(health, window, now, policy);
        if (rec) {
            recommendations.push(rec);
        }
    }

    const sorted = sortRecommendations(recommendations);

    if (typeof options.maxRecommendations === 'number') {
        return sorted.slice(0, options.maxRecommendations);
    }

    return sorted.slice(0, policy.recommendations.maxRecommendations);
}

// ─────────────────────────────────────────────
// Generators
// ─────────────────────────────────────────────

function generateForSubject(
    health: SubjectHealth,
    window: PlanningWindow,
    now: string,
    policy: EnginePolicy
): Recommendation | null {
    const statusRule = policy.recommendations.statusRouting[health.status];
    if (!statusRule) {
        return null;
    }

    let type: RecommendationType = statusRule.type;
    let urgency: RecommendationUrgency = statusRule.urgency;
    let summary: string;
    let suggestedAction: string;
    let expectedImpact: string;
    let dueWindow: 'today' | 'this_week' | 'next_week' | 'routine' = statusRule.dueWindow;

    const { status } = health;
    const deviation = (health.metrics.volumeScore - 100).toFixed(0);

    // Default Support Data Structure
    const supportData = {
        currentStatus: status,
        effortPercent: health.metrics.volumeScore,
        accuracyPercent: health.metrics.performanceScore,
        rawDeviation: Number(deviation),
        daysSinceStudy: health.raw.daysSinceLastStudy
    };

    // 1. Base mapping according to Health Status
    switch (status) {
        case SubjectHealthStatus.Critical:
            summary = `Atenção Crítica em ${health.subject}`;
            suggestedAction = `Realizar sessão de resgate imediata, focando primariamente na revisão de lacunas.`;
            expectedImpact = `Estabilizar a performance e evitar o colapso da matéria na reta final.`;
            break;

        case SubjectHealthStatus.Neglected:
            summary = `Matéria Negligenciada: ${health.subject}`;
            suggestedAction = `Cobrir o gap de recência urgentemente com uma sessão completa de teoria leve e exercícios.`;
            expectedImpact = `Interromper a curva de esquecimento prolongada desta disciplina.`;
            break;

        case SubjectHealthStatus.Inefficient:
            summary = `Estudo Ineficiente em ${health.subject}`;
            suggestedAction = `Interromper a leitura de teoria e focar exclusivamente na resolução de ${health.raw.daysSinceLastStudy > 3 ? '20' : '30'} questões dos tópicos que você mais erra.`;
            expectedImpact = `Quebrar o platô de desempenho transformando esforço passivo em acertos reais.`;
            break;

        case SubjectHealthStatus.BlindSpot:
            summary = `Zona Cega Ativa em ${health.subject}`;
            suggestedAction = `Executar um simulado diagnóstico restrito apenas à esta matéria. Não ler teoria antes.`;
            expectedImpact = `Aferir o nível de proficiência e retirar o aluno da "zona teórica de conforto".`;
            break;

        case SubjectHealthStatus.Warning:
            summary = `Desvio no Volume: ${health.subject}`;
            suggestedAction = `Priorizar essa disciplina no próximo slot de estudos em aberto, ampliando seu orçamento atual em 25%.`;
            expectedImpact = `Corrigir o déficit inicial antes que se torne uma falha crítica acumulada no edital.`;
            break;

        case SubjectHealthStatus.Healthy:
            summary = `Ritmo Saudável em ${health.subject}`;
            suggestedAction = `Manter exatamente a rotina definida no ciclo de horários.`;
            expectedImpact = `Construir resiliência e progressão de conteúdo no modelo cruzeiro de aprendizado.`;
            break;

        case SubjectHealthStatus.Mature:
            summary = `Excelente Domínio: ${health.subject}`;
            suggestedAction = `Manutenção leve usando revisões contínuas: substituir slot de leitura pura por Flashcards de fixação ou discursivas curtas.`;
            expectedImpact = `Aumentar o "fôlego" do seu cronograma para permitir aportes emergenciais em disciplinas de Risco.`;
            break;

        case SubjectHealthStatus.NoData:
            summary = `Iniciando: ${health.subject}`;
            suggestedAction = `Sem métricas registradas para essa disciplina na janela recente. Realize o primeiro contato.`;
            expectedImpact = `Autorizar o Decision Engine a montar uma curva base de métricas para sua preparação.`;
            break;

        default:
            return null;
    }

    // 2. Exam Sprint / Final Push Overlay logic
    // Overrides base state recommendations with high-stress commands if exam is close
    if (
        policy.recommendations.examPush.enabled &&
        policy.recommendations.examPush.eligiblePhases.includes(window.examPhase as ExamPhase) &&
        health.weight >= policy.recommendations.examPush.minWeight &&
        !policy.recommendations.examPush.excludedStatuses.includes(status)
    ) {
        if (urgency !== RecommendationUrgency.Immediate) {
            type = policy.recommendations.examPush.routing.type;
            urgency = policy.recommendations.examPush.routing.urgency;
            summary = `Tiro Curto (Sprint) em ${health.subject}`;
            suggestedAction = `A prova se aproxima rapidamente. Suspender PDFs pesados, foque 100% no caderno de erros e lei seca para a disciplina.`;
            expectedImpact = `Converter esforço em maximização marginal de pontos.`;
            dueWindow = policy.recommendations.examPush.routing.dueWindow;
        }
    }

    return {
        id: `rec:${health.planId}:${health.subject}:${type}`,
        type,
        target: health.subject,
        urgency,
        summary,
        reason: health.priority.reasons, // Inheriting multi-layered reasons from PriorityCalculator!
        suggestedAction,
        expectedImpact,
        dueWindow,
        priorityScore: health.priority.score, // Propagated for sorting
        supportData,
        createdAt: now,
    };
}

// ─────────────────────────────────────────────
// Sorting
// ─────────────────────────────────────────────

const URGENCY_WEIGHT: Record<RecommendationUrgency, number> = {
    [RecommendationUrgency.Immediate]: 4,
    [RecommendationUrgency.High]: 3,
    [RecommendationUrgency.Medium]: 2,
    [RecommendationUrgency.Low]: 1,
};

function sortRecommendations(recs: Recommendation[]): Recommendation[] {
    return [...recs].sort((a, b) => {
        const uA = URGENCY_WEIGHT[a.urgency];
        const uB = URGENCY_WEIGHT[b.urgency];

        if (uA !== uB) {
            return uB - uA; // Higher urgency weight first
        }

        // Tie-breaker: Deterministic PriorityScore computed by PriorityCalculator
        return b.priorityScore - a.priorityScore;
    });
}
