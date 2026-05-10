import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server/apiGuard';
import { enforceAiTaskQuota } from '@/lib/server/aiRateLimit';
import { parseJsonFromModelText } from '@/lib/ai';
import { runDedicatedAiText } from '@/lib/server/dedicatedAi';
import { resolveAiFailureState } from '@aprovamind/application/use-cases/ai/ResolveAiCapabilityState';

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

        const systemInstruction = [
            'Você é o Algoritmo Preditivo do AprovaMind.',
            'Sua função é gerar o cronograma ideal de estudos da semana para o usuário, mapeando as horas de estudo por dia da semana.',
            '',
            'REGRAS ABSOLUTAS:',
            `1. O total de horas sugeridas na semana DEVE ficar EXATAMENTE ou muito próximo da meta semanal (${weeklyGoalHours}h), sem ultrapassar a capacidade real declarada.`,
            '2. Distribua as horas SOMENTE nos dias disponíveis e respeite o teto de cada dia informado.',
            '3. Matérias com maior peso e baixa precisão (accuracy) DEVEM receber mais horas.',
            '4. Se o status da cobertura estiver em "attention" ou "critical", aumente o foco nas matérias nucleares e concentre mais horas nos dias com maior disponibilidade.',
            '5. NÃO gere texto livre. Retorne APENAS um JSON estrito no seguinte formato:',
            '',
            '[',
            '  {',
            '    "day": "Nome do Dia",',
            '    "totalHours": number,',
            '    "subjects": [{ "name": "Materia", "hours": number, "reason": "motivo curto" }]',
            '  }',
            ']',
        ].join('\n');

        const prompt = [
            'CONTEXTO DO PLANO:',
            `- Plano ativo: ${activePlanName || 'Visão Geral'}`,
            `- Prova: ${examDate || 'não informada'}`,
            `- Carga estimada do material: ${materialWorkloadHours ?? 'não informada'}h`,
            `- Ritmo semanal necessário: ${requiredWeeklyHours ?? 'não calculado'}h`,
            `- Status de cobertura: ${coverageStatus || 'desconhecido'}`,
            '',
            'JANELA REAL DISPONÍVEL NA SEMANA:',
            ...normalizedAvailableSchedule.map((day) => `- ${day.day}: até ${day.availableHours}h`),
            '',
            `DADOS DO ALUNO (${userName}):`,
            ...planSubjects.map((s) => `- ${s.subject} (Peso: ${s.weight} | Estudado: ${s.hoursStudied}h | Precisão: ${s.accuracy}%)`),
            '',
            'Gere o cronograma completo.',
        ].join('\n');

        const aiResponse = await runDedicatedAiText({
            idToken: auth.idToken,
            payload: {
                task: 'smart-schedule',
                systemInstruction,
                prompt,
                temperature: 0.2,
                maxOutputTokens: 2048,
                preferJson: true,
            },
        });

        const text = aiResponse.text?.trim() || '[]';
        const jsonStr = text.replace(/^```json/g, '').replace(/```$/g, '').trim();
        const parsedSchedule = parseJsonFromModelText<SmartScheduleItem[]>(jsonStr) || [];
        const sanitizedSchedule = sanitizeSchedule(parsedSchedule, normalizedAvailableSchedule);

        if (!sanitizedSchedule || sanitizedSchedule.length === 0) {
            console.error("Falha ao parsear JSON no smart-schedule", jsonStr);
            return NextResponse.json({
                error: 'Não consegui montar o cronograma agora. Tente novamente ou distribua os blocos manualmente.',
                aiCapability: resolveAiFailureState({
                    capability: 'smart_schedule',
                    error: new Error('invalid_json'),
                }),
            }, { status: 500 });
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
        const failure = resolveAiFailureState({
            capability: 'smart_schedule',
            error,
        });
        return NextResponse.json(
            { error: failure.message, aiCapability: failure },
            { status: 500 }
        );
    }
}
