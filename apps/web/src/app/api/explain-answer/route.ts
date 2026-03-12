import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server/apiGuard';
import { enforceAiTaskQuota } from '@/lib/server/aiRateLimit';
import { logAiUsageEvent, runAiText } from '@/lib/ai';
import { saveAiUsageEvent } from '@/lib/server/aiUsageStore';
import { searchRelevantLaw } from '@/lib/firebase/legalKnowledge';

const SYSTEM_INSTRUCTION = [
    'Você é um professor de Direito para concursos públicos com nível de doutorado.',
    'O aluno acabou de ERRAR uma questão de prova. Seu trabalho é dar uma explicação completa, didática e fundamentada.',
    '',
    'MÉTODO DE ANÁLISE (siga esta ordem):',
    '1. Identifique o tema jurídico central da questão',
    '2. Consulte a BASE LEGAL fornecida no contexto (se houver)',
    '3. Explique por que a alternativa CORRETA é a certa, citando artigos/súmulas',
    '4. Explique por que a alternativa do ALUNO está errada',
    '5. Dê uma dica prática para nunca mais errar',
    '',
    'REGRAS:',
    '- Cite APENAS artigos de lei, súmulas ou jurisprudência que estejam no contexto fornecido ou que você tenha CERTEZA ABSOLUTA que existem.',
    '- Se não tiver certeza de um artigo específico, diga "conforme a legislação vigente" em vez de inventar números.',
    '- Seja didático mas completo. Pode usar até 6-8 frases na explicação.',
    '- A dica deve ser um macete prático, mnemônico ou resumo para fixação.',
    '- Retorne EXCLUSIVAMENTE um JSON válido, sem markdown, sem ```.',
    '',
    'FORMATO JSON:',
    '{',
    '  "explanation": "<explicação completa e fundamentada>",',
    '  "legalBasis": "<artigo(s) de lei, súmula(s) ou jurisprudência citados — ou null se não houver>",',
    '  "tip": "<macete ou dica prática para fixação>"',
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
        const { questionText, alternatives, correctAnswer, studentAnswer, subject, subtema } = body;

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

        // ── RAG: buscar contexto jurídico relevante ──
        let legalContext = '';
        try {
            const relevantDocs = await searchRelevantLaw(
                questionText,
                subject || 'Geral',
                5
            );
            if (relevantDocs.length > 0) {
                legalContext = '\n\nBASE LEGAL (use para fundamentar sua explicação):\n' +
                    relevantDocs.map((doc: { title: string; content: string; source: string }, i: number) =>
                        `[${i + 1}] ${doc.title} (${doc.source})\n${doc.content}`
                    ).join('\n\n');
            }
        } catch (ragError) {
            console.warn('[ExplainAnswer] RAG search failed, continuing without context:', ragError);
        }

        const prompt = [
            'MATÉRIA: ' + (subject || 'Não informada'),
            subtema ? 'SUBTEMA: ' + subtema : '',
            '',
            'ENUNCIADO:',
            questionText,
            '',
            alternativesText ? 'ALTERNATIVAS:\n' + alternativesText : '',
            '',
            'ALTERNATIVA CORRETA: ' + correctAnswer,
            'ALTERNATIVA DO ALUNO (ERRADA): ' + studentAnswer,
            legalContext,
        ].filter(Boolean).join('\n');

        const aiResponse = await runAiText({
            task: 'explain-answer',
            systemInstruction: SYSTEM_INSTRUCTION,
            prompt,
            preferJson: true,
            temperature: 0.3,
            maxOutputTokens: 2048,
        });

        const text = aiResponse.text?.trim() || '{}';
        // Strip markdown code fences if Gemini wraps the JSON
        const jsonStr = text
            .replace(/^```(?:json)?\s*/gi, '')
            .replace(/\s*```\s*$/gi, '')
            .trim();

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
                    legalBasis: parsed.legalBasis || null,
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
            // Fallback: try to extract useful text even from malformed JSON
            const explanationMatch = jsonStr.match(/"explanation"\s*:\s*"([^"]+)"/);
            if (explanationMatch) {
                return NextResponse.json({
                    explanation: explanationMatch[1],
                    legalBasis: null,
                    tip: '',
                });
            }
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
