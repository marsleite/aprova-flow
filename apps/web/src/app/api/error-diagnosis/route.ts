import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server/apiGuard';
import { enforceAiTaskQuota } from '@/lib/server/aiRateLimit';
import { runDedicatedAiText } from '@/lib/server/dedicatedAi';
import { searchRelevantLaw } from '@/lib/firebase/legalKnowledge';
import { FeatureCode } from '@aprovamind/domain';
import { requireEntitlementFeature } from '@/lib/server/userEntitlements';
import { resolveAiFailureState } from '@aprovamind/application/use-cases/ai/ResolveAiCapabilityState';

// ── Prompt avançado: Gap Analyzer PhD ──

const SYSTEM_INSTRUCTION = [
    'Você é o **Professor Analista de Performance** do AprovaMind, PhD em preparação para concursos.',
    'Você receberá uma lista de erros que um aluno cometeu em questões de concurso,',
    'junto com estatísticas agregadas por matéria e subtema.',
    '',
    'Sua missão é fazer uma ANÁLISE PROFUNDA e CRUZADA dos erros, identificando:',
    '',
    '1. **GAPS OCULTOS**: Padrões cruzados que o aluno não percebe.',
    '   Ex: "Você acerta 90% de Constitucional, mas erra 80% quando a questão envolve jurisprudência do STF"',
    '   Ex: "Seus erros em Civil são concentrados em prescrição e decadência — confunde prazos"',
    '',
    '2. **SCORING POR DIMENSÃO**: Classifique cada gap como:',
    '   - "legislacao" (erra por não conhecer o artigo/lei)',
    '   - "jurisprudencia" (erra por não conhecer súmula/entendimento dos tribunais)',
    '   - "interpretacao" (erra por má interpretação do enunciado)',
    '   - "conceitual" (erra por desconhecer o conceito doutrinário)',
    '',
    '3. **FICHAS DE REVISÃO**: Para os 3 gaps mais críticos, gere fichas de revisão curtas e diretas,',
    '   com o conceito que o aluno precisa memorizar.',
    '',
    'REGRAS CRÍTICAS:',
    '- Máximo 3 gaps identificados, ordenados por gravidade',
    '- Descrições CURTAS: máximo 1 frase por gap (até 100 caracteres)',
    '- Conselhos CURTOS: máximo 1 frase (até 80 caracteres)',
    '- Gere exatamente 3 fichas de revisão CURTAS para os temas mais errados',
    '- Retorne EXCLUSIVAMENTE um JSON válido. Sem markdown, sem explicações extras.',
    '- IMPORTANTE: O JSON PRECISA estar completo e válido. Seja conciso.',
    '',
    'FORMATO JSON:',
    '{',
    '  "gaps": [',
    '    {',
    '      "description": "Confunde prazos prescricionais do Art. 206 CC",',
    '      "dimension": "legislacao",',
    '      "severity": 9,',
    '      "materia": "Direito Civil",',
    '      "subtema": "Prescrição",',
    '      "advice": "Estude a tabela de prazos: 1, 2, 3, 4 e 5 anos"',
    '    }',
    '  ],',
    '  "overallScore": {',
    '    "legislacao": 65,',
    '    "jurisprudencia": 40,',
    '    "interpretacao": 75,',
    '    "conceitual": 55',
    '  },',
    '  "flashcards": [',
    '    {',
    '      "topic": "Prazos Prescricionais (Art. 206 CC)",',
    '      "front": "Qual o prazo prescricional para reparação civil?",',
    '      "back": "3 anos (Art. 206, § 3º, V do CC/2002)",',
    '      "source": "CC/2002, Art. 206"',
    '    }',
    '  ],',
    '  "criticalSubjects": ["Direito Civil", "Direito Penal"],',
    '  "summary": "Resumo geral de 2 linhas sobre o perfil do aluno"',
    '}',
].join('\n');

// ── Tipos ──

interface ErrorItem {
    materia: string;
    subtema?: string;
    statement: string;
    correctAnswer: string;
    studentAnswer: string;
}

interface SubjectStats {
    materia: string;
    total: number;
    subtemas: Record<string, number>;
}

// ── Funções auxiliares ──

function buildStatistics(errors: ErrorItem[]): SubjectStats[] {
    const statsMap = new Map<string, SubjectStats>();

    for (const e of errors) {
        if (!statsMap.has(e.materia)) {
            statsMap.set(e.materia, { materia: e.materia, total: 0, subtemas: {} });
        }
        const stat = statsMap.get(e.materia)!;
        stat.total++;
        const sub = e.subtema || 'Geral';
        stat.subtemas[sub] = (stat.subtemas[sub] || 0) + 1;
    }

    return [...statsMap.values()].sort((a, b) => b.total - a.total);
}

function buildFallbackDiagnosis(errors: ErrorItem[]) {
    const stats = buildStatistics(errors);
    const criticalSubjects = stats.slice(0, 2).map((s) => s.materia);
    const first = stats[0];
    const topSubtema = first ? Object.entries(first.subtemas).sort((a, b) => b[1] - a[1])[0]?.[0] : 'Geral';
    return {
        gaps: first
            ? [{
                description: `Erros concentrados em ${first.materia}${topSubtema ? ` > ${topSubtema}` : ''}`,
                dimension: 'conceitual',
                severity: Math.min(10, Math.max(5, first.total)),
                materia: first.materia,
                subtema: topSubtema || 'Geral',
                advice: 'Revise a teoria curta e faça uma bateria de questões.',
            }]
            : [],
        overallScore: { legislacao: 50, jurisprudencia: 50, interpretacao: 50, conceitual: 50 },
        flashcards: first
            ? [{
                topic: `${first.materia} - ${topSubtema || 'Geral'}`,
                front: 'Qual ponto revisar antes da próxima bateria?',
                back: `Revisar ${topSubtema || first.materia} e refazer questões erradas.`,
                source: 'Fallback local AprovaMind',
            }]
            : [],
        criticalSubjects,
        summary: 'Diagnóstico resiliente gerado sem depender da IA ao vivo.',
        patterns: first ? [`Erros concentrados em ${first.materia}`] : [],
        recommendations: ['Faça revisão ativa curta e registre novas questões para recalibrar o diagnóstico.'],
        fallbackUsed: true,
    };
}

// ── POST Handler ──

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAuthenticatedUser(request);
        if ('response' in auth) return auth.response;

        const entitlement = await requireEntitlementFeature({
            identity: {
                uid: auth.uid,
                email: auth.email,
                idToken: auth.idToken,
            },
            featureCode: FeatureCode.ErrorGapAnalyzer,
        });
        if (!entitlement.allowed) return entitlement.response;

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

        // ── 1. Gerar estatísticas agregadas ──
        const stats = buildStatistics(errors);
        const topMateria = stats[0]?.materia || '';

        // ── 2. RAG: buscar contexto jurídico para os temas mais errados ──
        let ragContext = '';
        try {
            const topSubtemas = stats.slice(0, 2).flatMap(s =>
                Object.entries(s.subtemas)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 2)
                    .map(([sub]) => sub)
            );

            const ragQuery = `${topMateria} ${topSubtemas.join(' ')}`;
            const relevantDocs = await searchRelevantLaw(ragQuery, topMateria, 5);

            if (relevantDocs.length > 0) {
                ragContext = '\n\nCONTEXTO JURÍDICO RELEVANTE (use para gerar fichas de revisão precisas):\n' +
                    relevantDocs.map((doc: { title: string; content: string; source: string }, i: number) =>
                        `[${i + 1}] ${doc.title} (${doc.source}): ${doc.content}`
                    ).join('\n');
            }
        } catch (ragErr) {
            console.warn('[GapAnalyzer] RAG failed, continuing without context:', ragErr);
        }

        // ── 3. Montar prompt com estatísticas + erros ──
        const statsBlock = stats.map(s => {
            const subtemaDetails = Object.entries(s.subtemas)
                .sort((a, b) => b[1] - a[1])
                .map(([sub, count]) => `    - ${sub}: ${count} erros`)
                .join('\n');
            return `📊 ${s.materia}: ${s.total} erros\n${subtemaDetails}`;
        }).join('\n\n');

        const errorsSummary = errors.slice(0, 50).map((e, i) =>
            `${i + 1}. [${e.materia}${e.subtema ? ' > ' + e.subtema : ''}] "${e.statement.substring(0, 150)}..." → Resposta: ${e.studentAnswer} (Correta: ${e.correctAnswer})`
        ).join('\n');

        const prompt = [
            `O aluno errou ${errors.length} questões. Aqui está a análise estatística:`,
            '',
            statsBlock,
            '',
            '--- DETALHAMENTO DOS ERROS ---',
            '',
            errorsSummary,
            ragContext,
            '',
            'Faça a análise profunda de gaps seguindo o formato JSON especificado.',
        ].join('\n');

        // ── 4. Chamar IA ──
        const aiResponse = await runDedicatedAiText({
            idToken: auth.idToken,
            payload: {
                task: 'error-diagnosis',
                systemInstruction: SYSTEM_INSTRUCTION,
                prompt: prompt.substring(0, 6000),
                preferJson: true,
                temperature: 0.4,
                maxOutputTokens: 4096,
                thinkingBudget: 0,
            },
        });

        if (aiResponse.budgetBlocked) {
            return NextResponse.json(buildFallbackDiagnosis(errors), {
                headers: { ...quota.headers, 'x-ai-fallback': 'true' },
            });
        }

        const text = aiResponse.text?.trim() || '{}';
        // Extrair JSON mesmo que venha com markdown
        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        } else {
            jsonStr = text.replace(/^```json/g, '').replace(/```$/g, '').trim();
        }

        // Robust JSON repair for truncated output
        try {
            JSON.parse(jsonStr);
        } catch {
            console.warn('[GapAnalyzer] JSON inválido, tentando reparar...');
            let repaired = jsonStr;
            // Remove trailing incomplete string value (e.g., truncated mid-sentence)
            repaired = repaired.replace(/,\s*"[^"]*":\s*"[^"]*$/, '');
            repaired = repaired.replace(/,\s*"[^"]*$/, '');
            // Remove trailing comma
            repaired = repaired.replace(/,\s*$/, '');
            // Close any open brackets/braces
            const open = (s: string, c: string) => (s.match(new RegExp('\\' + c, 'g')) || []).length;
            let openBrackets = open(repaired, '[') - open(repaired, ']');
            let openBraces = open(repaired, '{') - open(repaired, '}');
            for (let i = 0; i < openBrackets; i++) repaired += ']';
            for (let i = 0; i < openBraces; i++) repaired += '}';
            try {
                JSON.parse(repaired);
                jsonStr = repaired;
                console.log('[GapAnalyzer] JSON reparado com sucesso');
            } catch {
                // Last resort: truncate to last complete structure
                const lastGood = Math.max(repaired.lastIndexOf('}'), repaired.lastIndexOf(']'));
                if (lastGood > 0) {
                    repaired = repaired.substring(0, lastGood + 1);
                    openBrackets = open(repaired, '[') - open(repaired, ']');
                    openBraces = open(repaired, '{') - open(repaired, '}');
                    for (let i = 0; i < openBrackets; i++) repaired += ']';
                    for (let i = 0; i < openBraces; i++) repaired += '}';
                    try {
                        JSON.parse(repaired);
                        jsonStr = repaired;
                        console.log('[GapAnalyzer] JSON reparado (fallback)');
                    } catch {
                        console.error('[GapAnalyzer] Reparação falhou completamente');
                    }
                }
            }
        }

        // ── 5. Parse e retorno ──
        try {
            const parsed = JSON.parse(jsonStr);

            // Backward-compat: se a IA retornar no formato antigo, converte
            if (parsed.patterns && !parsed.gaps) {
                return NextResponse.json(
                    {
                        gaps: [],
                        overallScore: { legislacao: 50, jurisprudencia: 50, interpretacao: 50, conceitual: 50 },
                        flashcards: [],
                        criticalSubjects: parsed.criticalSubjects || [],
                        summary: parsed.patterns?.join('. ') || '',
                        // backward compat
                        patterns: parsed.patterns || [],
                        recommendations: parsed.recommendations || [],
                    },
                    { headers: { ...quota.headers, 'x-ai-provider': aiResponse.provider, 'x-ai-model': aiResponse.model } }
                );
            }

            return NextResponse.json(
                {
                    gaps: parsed.gaps || [],
                    overallScore: parsed.overallScore || { legislacao: 50, jurisprudencia: 50, interpretacao: 50, conceitual: 50 },
                    flashcards: parsed.flashcards || [],
                    criticalSubjects: parsed.criticalSubjects || [],
                    summary: parsed.summary || '',
                    // backward compat
                    patterns: (parsed.gaps || []).map((g: { description: string }) => g.description),
                    recommendations: (parsed.gaps || []).map((g: { advice: string }) => g.advice),
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
            console.error('[GapAnalyzer] Falha ao parsear JSON:', jsonStr);
            const failure = resolveAiFailureState({
                capability: 'error_diagnosis',
                error: new Error('invalid_json'),
            });
            return NextResponse.json(
                { ...buildFallbackDiagnosis(errors), aiCapability: failure },
                { headers: { ...quota.headers, 'x-ai-fallback': 'true' } }
            );
        }
    } catch (error) {
        console.error('Erro na rota /error-diagnosis:', error);
        const failure = resolveAiFailureState({
            capability: 'error_diagnosis',
            error,
        });
        return NextResponse.json(
            { error: failure.message, aiCapability: failure },
            { status: 500 }
        );
    }
}
