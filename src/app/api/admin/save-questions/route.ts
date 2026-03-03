import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/server/apiGuard';
import { isAdminIdentity } from '@/lib/admin';
import { db } from '@/lib/firebase/config';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { QuestionBankItem, ExamMetadata } from '@/types';

const QUESTIONS_COLLECTION = 'questions_bank';
const EXAMS_COLLECTION = 'exams';
const BATCH_SIZE = 500;

interface SaveQuestionInput {
    statement: string;
    alternatives: { key: string; text: string }[];
    answer: string;
    materia: string;
    subtema?: string;
    difficulty?: string;
    explanation?: string;
}

interface SaveQuestionsBody {
    examName: string;
    banca?: string;
    year?: number;
    planId?: string;
    questions: SaveQuestionInput[];
}

function hashStatement(statement: string): string {
    // Simple hash of first 120 chars for deduplication
    const normalized = statement.trim().toLowerCase().replace(/\s+/g, ' ').substring(0, 120);
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return `h_${Math.abs(hash).toString(36)}`;
}

function validateQuestion(q: SaveQuestionInput, idx: number): string | null {
    if (!q.statement || q.statement.trim().length < 10) {
        return `Questão ${idx + 1}: enunciado muito curto ou vazio.`;
    }
    if (!q.alternatives || q.alternatives.length < 2) {
        return `Questão ${idx + 1}: precisa de pelo menos 2 alternativas.`;
    }
    if (!q.answer) {
        return `Questão ${idx + 1}: gabarito não informado.`;
    }
    if (!q.materia || q.materia.trim().length === 0) {
        return `Questão ${idx + 1}: matéria não informada.`;
    }
    return null;
}

// Firestore does not accept undefined values — strip them before writing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripUndefined(obj: Record<string, any>): Record<string, any> {
    return Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v !== undefined)
    );
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

        // 2. Parse body
        const body = (await request.json()) as SaveQuestionsBody;
        const { examName, banca, year, planId, questions } = body;

        if (!examName || !questions || !Array.isArray(questions) || questions.length === 0) {
            return NextResponse.json(
                { error: 'examName e questions[] são obrigatórios.' },
                { status: 400 }
            );
        }

        // 3. Validate all questions
        const errors: string[] = [];
        for (let i = 0; i < questions.length; i++) {
            const err = validateQuestion(questions[i], i);
            if (err) errors.push(err);
        }
        if (errors.length > 0) {
            return NextResponse.json(
                { error: 'Validação falhou.', details: errors },
                { status: 400 }
            );
        }

        // 4. Batch write questions
        const questionIds: string[] = [];
        const now = new Date().toISOString();
        const dedupeSet = new Set<string>();
        let duplicateCount = 0;

        for (let i = 0; i < questions.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            const chunk = questions.slice(i, i + BATCH_SIZE);

            for (const q of chunk) {
                const hash = hashStatement(q.statement);
                if (dedupeSet.has(hash)) {
                    duplicateCount++;
                    continue;
                }
                dedupeSet.add(hash);

                const qRef = doc(collection(db, QUESTIONS_COLLECTION));
                const validDifficulties = ['fácil', 'médio', 'difícil', 'extremo'];
                const difficulty = validDifficulties.includes(q.difficulty || '')
                    ? q.difficulty
                    : 'médio';

                const questionData: Omit<QuestionBankItem, 'id'> = {
                    statement: q.statement.trim(),
                    alternatives: q.alternatives.map(a => ({
                        key: a.key.toUpperCase(),
                        text: a.text.trim(),
                    })),
                    answer: q.answer.toUpperCase(),
                    materia: q.materia.trim(),
                    subtema: q.subtema?.trim() || undefined,
                    banca: banca || undefined,
                    year: year || undefined,
                    difficulty: difficulty as QuestionBankItem['difficulty'],
                    explanation: q.explanation?.trim() || undefined,
                    sourceExamId: null, // will be updated after exam creation
                    createdBy: auth.uid,
                    createdAt: now,
                    updatedAt: now,
                };

                batch.set(qRef, stripUndefined(questionData));
                questionIds.push(qRef.id);
            }

            await batch.commit();
        }

        // 5. Create ExamMetadata
        const examBatch = writeBatch(db);
        const examRef = doc(collection(db, EXAMS_COLLECTION));
        const examData: Omit<ExamMetadata, 'id'> = {
            name: examName.trim(),
            planId: planId || null,
            banca: banca || undefined,
            year: year || undefined,
            questions: questionIds,
            createdAt: now,
            updatedAt: now,
        };
        examBatch.set(examRef, stripUndefined(examData));

        await examBatch.commit();

        return NextResponse.json({
            success: true,
            examId: examRef.id,
            totalSaved: questionIds.length,
            duplicatesSkipped: duplicateCount,
        });
    } catch (error) {
        console.error('Erro em /api/admin/save-questions:', error);
        return NextResponse.json(
            { error: 'Erro interno ao salvar questões.' },
            { status: 500 }
        );
    }
}
