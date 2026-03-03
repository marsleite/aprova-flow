import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server/apiGuard';
import { isAdminIdentity } from '@/lib/admin';
import { runAiPdf } from '@/lib/ai/gateway';
import { logAiUsageEvent } from '@/lib/ai';
import { saveAiUsageEvent } from '@/lib/server/aiUsageStore';

// Use require for pdf-parse as it has inconsistent ESM exports
const { PDFParse } = require('pdf-parse');

const SYSTEM_INSTRUCTION = [
    'Você é um especialista em extração de dados de provas de concursos públicos.',
    'Você receberá o PDF de uma prova e o texto extraído desse PDF.',
    'Sua tarefa é retornar um JSON estruturado com TODAS as questões.',
    '',
    'INSTRUÇÕES DE GABARITO:',
    '- Se o texto do gabarito for fornecido, use-o como fonte única de verdade para o campo "answer".',
    '- Se uma questão no gabarito estiver marcada como anulada (X), use "?" no campo "answer".',
    '',
    'ESTRUTURA POR QUESTÃO:',
    '- statement: Enunciado completo. Se houver um texto base comum (Ex: "Considere o texto abaixo para as questões 1 a 5"), repita esse texto no statement de cada uma das questões relacionadas.',
    '- alternatives: Array de objetos {key: string, text: string}. Ex: [{"key":"A","text":"Opção 1"}, ...].',
    '- answer: A letra da alternativa correta (A-E).',
    '- materia: Disciplina da questão. ATENÇÃO: Procure no texto por cabeçalhos que agrupam as questões (ex: "DIREITO ADMINISTRATIVO", "CONHECIMENTOS ESPECÍFICOS"). Use esse cabeçalho como a matéria.',
    '- subtema: Assunto específico dentro da matéria (ex: "Licitações", se identificável pelo contexto, senão use "Geral").',
    '- difficulty: "fácil", "médio", "difícil" ou "extremo".',
    '',
    'REGRAS CRÍTICAS:',
    '- O GABARITO OFICIAL (se fornecido) deve prevalecer sobre qualquer outra interpretação para o campo "answer". Muitas vezes o gabarito vem em formato de matriz/tabela (ex: linha com números das questões, linha abaixo com as respostas). Tenha extrema atenção no mapeamento Número -> Letra.',
    '- Retorne APENAS o array JSON, sem explicações ou markdown.',
    '- Não pule nenhuma questão. Se a prova tem 100 questões, extraia as 100.',
    '- Preserve a formatação original do texto o máximo possível no statement.',
    '',
    'FORMATO:',
    '[',
    '  {',
    '    "statement": "...",',
    '    "alternatives": [...],',
    '    "answer": "...",',
    '    "materia": "...",',
    '    "subtema": "...",',
    '    "difficulty": "..."',
    '  }',
    ']',
].join('\n');

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        return result.text || '';
    } catch (err) {
        console.error('[PDF-PARSE] Error extracting text:', err);
        return '';
    }
}

export async function POST(request: NextRequest) {
    try {
        // 1. Auth + Admin check
        const auth = await requireAuthenticatedUser(request);
        if ('response' in auth) return auth.response;

        if (!isAdminIdentity({ uid: auth.uid, email: auth.email })) {
            return NextResponse.json(
                { error: 'Acesso restrito a administradores.' },
                { status: 403 }
            );
        }

        // 2. Parse multipart form data
        console.log('[ExtractQuestions] Parsing form data...');
        const formData = await request.formData();
        const file = formData.get('pdf') as File | null;
        const gabaritoFile = formData.get('gabarito') as File | null;
        const examName = (formData.get('examName') as string) || '';
        const banca = (formData.get('banca') as string) || '';
        const year = parseInt((formData.get('year') as string) || '0', 10) || undefined;

        if (!file || file.type !== 'application/pdf') {
            console.warn('[ExtractQuestions] Invalid file type:', file?.type);
            return NextResponse.json(
                { error: 'Envie um arquivo PDF válido da prova.' },
                { status: 400 }
            );
        }

        // 3. Extract Text and prepare Base64
        console.log('[ExtractQuestions] Extracting exam text...');
        const examArrayBuffer = await file.arrayBuffer();
        const examBuffer = Buffer.from(examArrayBuffer);
        const examText = await extractTextFromPdf(examBuffer);
        console.log('[ExtractQuestions] Exam text extracted, length:', examText.length);
        const pdfBase64 = examBuffer.toString('base64');

        const extraPdfs: string[] = [];
        let gabaritoText = '';
        let gabaritoMapping = '';

        if (gabaritoFile && gabaritoFile.type === 'application/pdf') {
            console.log('[ExtractQuestions] Extracting gabarito text...');
            const gabArrayBuffer = await gabaritoFile.arrayBuffer();
            const gabBuffer = Buffer.from(gabArrayBuffer);
            gabaritoText = await extractTextFromPdf(gabBuffer);
            console.log('[ExtractQuestions] Gabarito text extracted, length:', gabaritoText.length);

            // Auto-parse gabarito to prevent AI hallucinations
            const letters: string[] = [];
            const lines = gabaritoText.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || /^[\d\s]+$/.test(trimmed)) continue;
                // Match isolated letters A-E or X (anulada)
                const matches = trimmed.match(/\b([A-EX])\b/g);
                if (matches && matches.length > 5) {
                    letters.push(...matches);
                }
            }

            if (letters.length > 0) {
                console.log(`[ExtractQuestions] Auto-parsed ${letters.length} answers from Gabarito.`);
                gabaritoMapping = letters.map((letter, idx) => `Questão ${idx + 1}: ${letter}`).join('\n');
            }

            extraPdfs.push(gabBuffer.toString('base64'));
        }

        // 4. Build enhanced prompt
        console.log('[ExtractQuestions] Sending to Gemini...');
        const prompt = [
            `Analise esta prova e extraia todas as questões.`,
            `NOME DA PROVA: ${examName || 'Não informado'}`,
            `BANCA: ${banca || 'Não informada'}`,
            `ANO: ${year || 'Não informado'}`,
            '',
            '--- TEXTO EXTRAÍDO DO PDF DA PROVA ---',
            examText.substring(0, 50000), // Safety limit for text part
            '',
            gabaritoMapping ? '--- GABARITO OFICIAL MAPEADO ---' : '',
            gabaritoMapping ? gabaritoMapping : '',
            '',
            'Use tanto o PDF visual quanto o texto extraído acima para garantir que nenhuma questão seja cortada e que o enunciado esteja completo.',
            gabaritoMapping ? 'IMPORTANTE: Siga rigorosamente a lista do GABARITO OFICIAL MAPEADO acima para marcar a resposta correta de cada questão.' : 'Nota: Nenhum gabarito fornecido. Use "?" no campo "answer".',
        ].filter(Boolean).join('\n');

        // 5. Send to Gemini
        const aiResponse = await runAiPdf({
            task: 'parse-edital',
            pdfBase64,
            extraPdfsBase64: extraPdfs.length > 0 ? extraPdfs : undefined,
            prompt,
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.1,
            maxOutputTokens: 65536,
        });
        console.log('[ExtractQuestions] Gemini response received.');

        // 6. Log usage
        const usageEvent = {
            route: '/api/admin/extract-questions',
            task: 'parse-edital' as const,
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
        };
        logAiUsageEvent(usageEvent);
        void saveAiUsageEvent(usageEvent, auth.idToken);

        // 7. Parse Result
        const rawText = aiResponse.text?.trim() || '';
        let jsonStr = rawText.replace(/^```(?:json)?\s*/gi, '').replace(/```\s*$/g, '');

        const arrayStart = jsonStr.indexOf('[');
        const arrayEnd = jsonStr.lastIndexOf(']');
        if (arrayStart !== -1 && arrayEnd > arrayStart) {
            jsonStr = jsonStr.substring(arrayStart, arrayEnd + 1);
        }

        try {
            const questions = JSON.parse(jsonStr);
            return NextResponse.json({
                questions: Array.isArray(questions) ? questions : [],
                metadata: {
                    examName,
                    banca,
                    year,
                    totalExtracted: Array.isArray(questions) ? questions.length : 0,
                    provider: aiResponse.provider,
                    model: aiResponse.model,
                    latencyMs: aiResponse.latencyMs,
                },
            });
        } catch (err) {
            console.error('[ExtractQuestions] JSON Parse Error:', err);
            return NextResponse.json(
                {
                    error: 'Erro de formato na resposta da IA. Use a importação manual se persistir.',
                    details: err instanceof Error ? err.message : String(err),
                    preview: rawText.substring(0, 500),
                },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Erro em /api/admin/extract-questions:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Erro interno.',
                stack: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}
