import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server/apiGuard';
import { enforceAiTaskQuota } from '@/lib/server/aiRateLimit';
import { logAiUsageEvent, runAiText, parseJsonFromModelText } from '@/lib/ai';
import { saveAiUsageEvent } from '@/lib/server/aiUsageStore';

export interface SmartScheduleRequest {
    userName: string;
    activePlanName?: string | null;
    weeklyGoalHours: number;
    examDate?: string | null;
    materialWorkloadHours?: number | null;
    requiredWeeklyHours?: number | null;
    coverageStatus?: 'missing_deadline' | 'missing_workload' | 'healthy' | 'attention' | 'critical';
    availableSchedule: { day: string; availableHours: number }[];
    planSubjects: { subject: string; weight: number; hoursStudied: number; accuracy: number }[];
}

interface SmartScheduleItem {
    day: string;
    totalHours: number;
    subjects: { name: string; hours: number; reason: string }[];
}

function sanitizeSchedule(
    raw: SmartScheduleItem[],
    availableSchedule: { day: string; availableHours: number }[]
): SmartScheduleItem[] {
    const limits = new Map(
        availableSchedule.map((day) => [day.day.toLowerCase(), day.availableHours])
    );

    return raw
        .filter((item) => item && typeof item.day === 'string' && limits.has(item.day.toLowerCase()))
        .map((item) => {
            const dayKey = item.day.toLowerCase();
            const maxHours = limits.get(dayKey) ?? 0;
            const subjects = Array.isArray(item.subjects)
                ? item.subjects
                    .filter((subject) => subject && typeof subject.name === 'string')
                    .map((subject) => ({
                        name: subject.name,
                        hours: Math.max(0, Math.round(Number(subject.hours || 0) * 10) / 10),
                        reason: typeof subject.reason === 'string' ? subject.reason : 'Distribuição estratégica da semana.',
                    }))
                : [];
            const totalHours = Math.max(
                0,
                Math.min(
                    maxHours,
                    Math.round(
                        (Number.isFinite(Number(item.totalHours))
                            ? Number(item.totalHours)
                            : subjects.reduce((sum, subject) => sum + subject.hours, 0)) * 10
                    ) / 10
                )
            );

            return {
                day: item.day,
                totalHours,
                subjects,
            };
        });
}

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAuthenticatedUser(request);
        if ('response' in auth) return auth.response;

        const quota = await enforceAiTaskQuota({
            uid: auth.uid,
            email: auth.email,
            idToken: auth.idToken,
            task: 'smart-schedule',
        });
        if (!quota.allowed) return quota.response;

        const {
            userName,
            activePlanName,
            weeklyGoalHours,
            examDate,
            materialWorkloadHours,
            requiredWeeklyHours,
            coverageStatus,
            availableSchedule,
            planSubjects,
        } = (await request.json()) as SmartScheduleRequest;

        if (!userName || !availableSchedule || availableSchedule.length === 0 || !planSubjects || planSubjects.length === 0) {
            return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
        }

        const normalizedAvailableSchedule = availableSchedule
            .filter((day) => day && typeof day.day === 'string' && Number.isFinite(Number(day.availableHours)) && Number(day.availableHours) > 0)
            .map((day) => ({
                day: day.day,
                availableHours: Math.round(Number(day.availableHours) * 10) / 10,
            }));

        if (normalizedAvailableSchedule.length === 0) {
            return NextResponse.json({ error: 'Nenhum dia disponível foi informado.' }, { status: 400 });
        }

        const systemPrompt = `Você é o Algoritmo Preditivo do AprovaMind.\nSua função é gerar o cronograma ideal de estudos da semana para o usuário, mapeando as horas de estudo por dia da semana.\n\nREGRAS ABSOLUTAS:\n1. O total de horas sugeridas na semana DEVE ficar EXATAMENTE ou muito próximo da meta semanal (${weeklyGoalHours}h), sem ultrapassar a capacidade real declarada.\n2. Distribua as horas SOMENTE nos dias disponíveis e respeite o teto de cada dia informado.\n3. Matérias com maior peso e baixa precisão (accuracy) DEVEM receber mais horas.\n4. Se o status da cobertura estiver em "attention" ou "critical", aumente o foco nas matérias nucleares e concentre mais horas nos dias com maior disponibilidade.\n5. NÃO gere texto livre. Retorne APENAS um JSON estrito no seguinte formato:\n\n[\n  {\n    "day": "Nome do Dia",\n    "totalHours": number,\n    "subjects": [{ "name": "Materia", "hours": number, "reason": "motivo curto" }]\n  }\n]\n\nCONTEXTO DO PLANO:\n- Plano ativo: ${activePlanName || 'Visao Geral'}\n- Prova: ${examDate || 'nao informada'}\n- Carga estimada do material: ${materialWorkloadHours ?? 'nao informada'}h\n- Ritmo semanal necessario: ${requiredWeeklyHours ?? 'nao calculado'}h\n- Status de cobertura: ${coverageStatus || 'desconhecido'}\n\nJANELA REAL DISPONIVEL NA SEMANA:\n${normalizedAvailableSchedule
            .map((day) => `- ${day.day}: até ${day.availableHours}h`)
            .join('\n')}\n\nDADOS DO ALUNO (${userName}):\n${planSubjects
            .map((s) => `- ${s.subject} (Peso: ${s.weight} | Estudado: ${s.hoursStudied}h | Precisão: ${s.accuracy}%)`)
            .join('\n')}`;

        const fullPrompt = `${systemPrompt}\n\nGere o cronograma completo abaixo.`;

        const aiResponse = await runAiText({
            task: 'smart-schedule',
            prompt: fullPrompt,
            temperature: 0.2, // Baixa temperatura para manter a estrutura JSON previsível
            maxOutputTokens: 2048,
            preferJson: true,
        });

        const text = aiResponse.text?.trim() || '[]';
        const jsonStr = text.replace(/^```json/g, '').replace(/```$/g, '').trim();
        const parsedSchedule = parseJsonFromModelText<SmartScheduleItem[]>(jsonStr) || [];
        const sanitizedSchedule = sanitizeSchedule(parsedSchedule, normalizedAvailableSchedule);

        const usageEvent = {
            route: '/api/smart-schedule',
            task: 'smart-schedule',
            provider: aiResponse.provider,
            model: aiResponse.model,
            latencyMs: aiResponse.latencyMs,
            inputTokens: aiResponse.usage.inputTokens,
            outputTokens: aiResponse.usage.outputTokens,
            totalTokens: aiResponse.usage.totalTokens,
            estimatedCostUsd: aiResponse.usage.estimatedCostUsd,
            success: true,
            statusCode: 200,
            userId: auth.uid,
        } as const;
        logAiUsageEvent(usageEvent);
        void saveAiUsageEvent(usageEvent, auth.idToken);

        if (!sanitizedSchedule || sanitizedSchedule.length === 0) {
            console.error("Falha ao parsear JSON no smart-schedule", jsonStr);
            return NextResponse.json({ error: 'Erro gerando cronograma' }, { status: 500 });
        }

        return NextResponse.json(
            { schedule: sanitizedSchedule },
            {
                headers: {
                    ...quota.headers,
                    'x-ai-provider': aiResponse.provider,
                    'x-ai-model': aiResponse.model,
                    'x-ai-cost-usd': aiResponse.usage.estimatedCostUsd.toString(),
                },
            }
        );
    } catch (error) {
        console.error('Erro na rota /smart-schedule:', error);
        return NextResponse.json(
            { error: 'Erro interno ao consultar IA.' },
            { status: 500 }
        );
    }
}
