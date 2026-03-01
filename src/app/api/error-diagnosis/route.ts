import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server/apiGuard';
import { enforceAiTaskQuota } from '@/lib/server/aiRateLimit';
import { logAiUsageEvent, runAiText } from '@/lib/ai';
import { saveAiUsageEvent } from '@/lib/server/aiUsageStore';

const SYSTEM_INSTRUCTION = [
    'Você é um especialista em preparação para concursos públicos.',
    'Você receberá uma lista de erros que um aluno cometeu em questões de concurso.',
    'Analise os erros e identifique PADRÕES recorrentes e recomendações práticas.',
    '',
    'REGRAS:',
    '- Máximo 3 padrões de erro identificados.',
    '- Máximo 3 recomendações práticas e acionáveis.',
    '- Identifique as matérias mais críticas (máximo 3).',
    '- Seja direto e objetivo.',
    '- Retorne EXCLUSIVAMENTE um JSON válido. Sem markdown.',
    '',
    'FORMATO:',
    '{',
    '  "patterns": ["padrão 1", "padrão 2", ...],',
    '  "recommendations": ["recomendação 1", "recomendação 2", ...],',
    '  "criticalSubjects": ["matéria 1", "matéria 2", ...]',
    '}',
].join('\n');

interface ErrorItem {
    materia: string;
    subtema?: string;
    statement: string;
    correctAnswer: string;
    studentAnswer: string;
}

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAuthenticatedUser(request);
        if ('response' in auth) return auth.response;

        const quota = await enforceAiTaskQuota({
            uid: auth.uid,
            email: auth.email,
            idToken: auth.idToken,
            task: 'error-diagnosis',
        });
        if (!quota.allowed) return quota.response;

        const body = await request.json().catch(() => ({}));
        const { errors } = body as { errors?: ErrorItem[] };

        if (!errors || !Array.isArray(errors) || errors.length === 0) {
            return NextResponse.json(
                { error: 'Nenhum erro fornecido para análise.' },
                { status: 400 }
            );
        }

        // Build the prompt from the errors list
        const errorsSummary = errors.slice(0, 50).map((e, i) =>
            `${i + 1}. [${e.materia}${e.subtema ? ' > ' + e.subtema : ''}] "${e.statement.substring(0, 120)}..." → Resposta: ${e.studentAnswer} (Correta: ${e.correctAnswer})`
        ).join('\n');

        const prompt = [
            `O aluno errou ${errors.length} questões. Aqui estão os erros:`,
            '',
            errorsSummary,
            '',
            'Analise os padrões de erro e forneça recomendações.',
        ].join('\n');

        const aiResponse = await runAiText({
            task: 'error-diagnosis',
            systemInstruction: SYSTEM_INSTRUCTION,
            prompt,
            preferJson: true,
            temperature: 0.3,
            maxOutputTokens: 1024,
        });

        const text = aiResponse.text?.trim() || '{}';
        const jsonStr = text.replace(/^```json/g, '').replace(/```$/g, '').trim();

        const usageEvent = {
            route: '/api/error-diagnosis',
            task: 'error-diagnosis',
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
            const parsed = JSON.parse(jsonStr);
            return NextResponse.json(
                {
                    patterns: parsed.patterns || [],
                    recommendations: parsed.recommendations || [],
                    criticalSubjects: parsed.criticalSubjects || [],
                },
                {
                    headers: {
                        ...quota.headers,
                        'x-ai-provider': aiResponse.provider,
                        'x-ai-model': aiResponse.model,
                    },
                }
            );
        } catch {
            console.error('[ErrorDiagnosis] Falha ao parsear JSON:', jsonStr);
            return NextResponse.json(
                { error: 'A IA retornou formato inválido.' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Erro na rota /error-diagnosis:', error);
        return NextResponse.json(
            { error: 'Erro interno ao consultar IA.' },
            { status: 500 }
        );
    }
}
