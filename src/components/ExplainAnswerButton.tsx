'use client';

import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase/config';
import { QuestionBankItem } from '@/types';
import { Sparkles } from 'lucide-react';

interface ExplainAnswerButtonProps {
    question: QuestionBankItem;
    studentAnswer: string;
}

export function ExplainAnswerButton({ question, studentAnswer }: ExplainAnswerButtonProps) {
    const { user } = useAuthContext();
    const [loading, setLoading] = useState(false);
    const [explanation, setExplanation] = useState<{ text: string; tip: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleExplain = async () => {
        if (!user) return;
        try {
            setLoading(true);
            setError(null);

            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('Sessão expirada. Faça login novamente.');

            const alternativesObj: Record<string, string> = {};
            question.alternatives.forEach(alt => {
                alternativesObj[alt.key] = alt.text;
            });

            const response = await fetch('/api/explain-answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    questionText: question.statement,
                    alternatives: alternativesObj,
                    correctAnswer: question.answer,
                    studentAnswer,
                    subject: question.materia
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao gerar explicação.');
            }

            setExplanation({ text: data.explanation, tip: data.tip });
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Ocorreu um erro ao gerar a explicação.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="mt-4">
            {!explanation && !loading && !error && (
                <button
                    onClick={handleExplain}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 rounded-lg transition-colors border border-violet-500/30 text-sm font-medium"
                >
                    <Sparkles className="h-4 w-4" />
                    Explicar erro com IA
                </button>
            )}

            {loading && (
                <div className="flex items-center gap-2 text-violet-400 text-sm">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-violet-500"></div>
                    Analisando questão...
                </div>
            )}

            {error && (
                <div className="mt-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-sm text-red-400 flex flex-col gap-2">
                    <span>{error}</span>
                    <button
                        onClick={handleExplain}
                        className="self-start text-xs underline hover:text-red-300"
                    >
                        Tentar novamente
                    </button>
                </div>
            )}

            {explanation && (
                <div className="mt-4 p-4 bg-gray-900 border border-violet-500/30 rounded-lg relative overflow-hidden">
                    {/* Decorative background glow */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-violet-500/10 blur-3xl rounded-full pointer-events-none"></div>

                    <h4 className="flex items-center gap-2 text-violet-400 font-semibold mb-3">
                        <Sparkles className="h-4 w-4" />
                        Explicação do Professor IA
                    </h4>

                    <div className="space-y-4">
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {explanation.text}
                        </p>

                        {explanation.tip && (
                            <div className="flex gap-3 items-start bg-gray-800/50 p-3 rounded border border-gray-700">
                                <span className="text-xl">💡</span>
                                <div>
                                    <strong className="text-sm text-gray-200 block mb-1">Dica de Ouro</strong>
                                    <p className="text-sm text-gray-400 italic">{explanation.tip}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
