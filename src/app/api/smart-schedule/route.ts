import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server/apiGuard';
import { enforceAiTaskQuota } from '@/lib/server/aiRateLimit';
import { logAiUsageEvent, runAiText } from '@/lib/ai';
import { saveAiUsageEvent } from '@/lib/server/aiUsageStore';

export interface SmartScheduleRequest {
    userName: string;
    weeklyGoalHours: number;
    availableDays: string[]; // ["Segunda", "Terça", "Quarta"]
    planSubjects: { subject: string; weight: number; hoursStudied: number; accuracy: number }[];
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
            weeklyGoalHours,
            availableDays,
            planSubjects,
        } = (await request.json()) as SmartScheduleRequest;

        if (!userName || !availableDays || !planSubjects || planSubjects.length === 0) {
            return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
        }

        const systemPrompt = `Você é o Algoritmo Preditivo do AprovaMind.\nSua função é gerar o cronograma ideal de estudos da semana para o usuário, mapeando as horas de estudo por dia da semana.\n\nREGRAS ABSOLUTAS:\n1. O total de horas sugeridas na semana DEVE ser EXATAMENTE ou muito próximo da meta semanal (${weeklyGoalHours}h).\n2. Distribua as horas SOMENTE nos dias disponíveis: ${availableDays.join(', ')}.\n3. Matérias com maior peso e baixa precisão (accuracy) DEVEM receber mais horas.\n4. NÃO gere texto livre. Retorne APENAS um JSON estrito no seguinte formato:\n\n[\n  {\n    "day": "Nome do Dia",\n    "totalHours": number,\n    "subjects": [{ "name": "Materia", "hours": number, "reason": "motivo curto" }]\n  }\n]\n\nDADOS DO ALUNO (${userName}):\n${planSubjects
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

        // Tenta limpar marcações Markdown de JSON se a IA tiver enviado.
        const jsonStr = text.replace(/^```json/g, '').replace(/```$/g, '').trim();

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

        try {
            const parsedSchedule = JSON.parse(jsonStr);
            return NextResponse.json(
                { schedule: parsedSchedule },
                {
                    headers: {
                        ...quota.headers,
                        'x-ai-provider': aiResponse.provider,
                        'x-ai-model': aiResponse.model,
                        'x-ai-cost-usd': aiResponse.usage.estimatedCostUsd.toString(),
                    },
                }
            );
        } catch (parseError) {
            console.error("Falha ao parsear JSON no smart-schedule", parseError, jsonStr);
            return NextResponse.json({ error: 'Erro gerando cronograma' }, { status: 500 });
        }
    } catch (error) {
        console.error('Erro na rota /smart-schedule:', error);
        return NextResponse.json(
            { error: 'Erro interno ao consultar IA.' },
            { status: 500 }
        );
    }
}
