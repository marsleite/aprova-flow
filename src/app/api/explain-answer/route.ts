import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server/apiGuard';
import { enforceAiTaskQuota } from '@/lib/server/aiRateLimit';
import { logAiUsageEvent, runAiText } from '@/lib/ai';
import { saveAiUsageEvent } from '@/lib/server/aiUsageStore';

const SYSTEM_INSTRUCTION = [
    'Você é um professor de concursos públicos extremamente didático.',
    'O aluno acabou de ERRAR uma questão de prova. Seu trabalho é explicar o porquê a alternativa correta é a certa e o porquê a alternativa escolhida pelo aluno está errada.',
    '',
    'REGRAS:',
    '- Seja conciso. A explicação deve ter no MÁXIMO 4 frases.',
    '- A dica (tip) deve ter no MÁXIMO 1 frase curta.',
    '- Use linguagem acessível, como se estivesse explicando para um colega de estudo.',
    '- Cite artigos de lei, súmulas ou jurisprudência quando for relevante e puder agregar.',
    '- Retorne EXCLUSIVAMENTE um JSON válido. Sem markdown.',
    '',
    'FORMATO:',
    '{',
    '  "explanation": "<por que a correta é correta e a escolhida está errada>",',
    '  "tip": "<macete ou dica prática para nunca mais errar>"',
    '}',
].join('\n');

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAuthenticatedUser(request);
        if ('response' in auth) return auth.response;

        const quota = await enforceAiTaskQuota({
            uid: auth.uid,
            email: auth.email,
            idToken: auth.idToken,
            task: 'explain-answer',
        });
        if (!quota.allowed) return quota.response;

        const body = await request.json().catch(() => ({}));
        const { questionText, alternatives, correctAnswer, studentAnswer, subject } = body;

        if (!questionText || !correctAnswer || !studentAnswer) {
            return NextResponse.json(
                { error: 'Campos obrigatórios: questionText, correctAnswer, studentAnswer.' },
                { status: 400 }
            );
        }

        const alternativesText = alternatives
            ? Object.entries(alternatives as Record<string, string>)
                .map(([key, val]) => key + ') ' + val)
                .join('\n')
            : '';

        const prompt = [
            'MATÉRIA: ' + (subject || 'Não informada'),
            '',
            'ENUNCIADO:',
            questionText,
            '',
            alternativesText ? 'ALTERNATIVAS:\n' + alternativesText : '',
            '',
            'ALTERNATIVA CORRETA: ' + correctAnswer,
            'ALTERNATIVA DO ALUNO (ERRADA): ' + studentAnswer,
        ].join('\n');

        const aiResponse = await runAiText({
            task: 'explain-answer',
            systemInstruction: SYSTEM_INSTRUCTION,
            prompt,
            preferJson: true,
            temperature: 0.3,
            maxOutputTokens: 512,
        });

        const text = aiResponse.text?.trim() || '{}';
        const jsonStr = text.replace(/^```json/g, '').replace(/```$/g, '').trim();

        const usageEvent = {
            route: '/api/explain-answer',
            task: 'explain-answer',
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
                    explanation: parsed.explanation || 'Explicação indisponível.',
                    tip: parsed.tip || '',
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
            console.error('[ExplainAnswer] Falha ao parsear JSON:', jsonStr);
            return NextResponse.json(
                { error: 'A IA retornou formato inválido.' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Erro na rota /explain-answer:', error);
        return NextResponse.json(
            { error: 'Erro interno ao consultar IA.' },
            { status: 500 }
        );
    }
}
