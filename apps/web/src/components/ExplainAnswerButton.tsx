'use client';

import { FeatureCode } from '@aprovamind/domain';
import Link from 'next/link';
import { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { auth } from '@/lib/firebase/config';
import { QuestionBankItem } from '@/types';
import { Sparkles, BookOpen, Lightbulb, Scale, Lock, Crown } from 'lucide-react';

interface ExplainAnswerButtonProps {
    question: QuestionBankItem;
    studentAnswer: string;
}

interface ExplanationData {
    text: string;
    legalBasis: string | null;
    tip: string;
}

export function ExplainAnswerButton({ question, studentAnswer }: ExplainAnswerButtonProps) {
    const { user } = useAuthContext();
    const { hasFeature } = useEntitlements(user?.uid, user?.email);
    const [loading, setLoading] = useState(false);
    const [explanation, setExplanation] = useState<ExplanationData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const canUseAiExplanations = hasFeature(FeatureCode.AiExplanations);

    const handleExplain = async () => {
        if (!user || !canUseAiExplanations) return;
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
                    subject: question.materia,
                    subtema: question.subtema,
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao gerar explicação.');
            }

            setExplanation({
                text: data.explanation,
                legalBasis: data.legalBasis || null,
                tip: data.tip,
            });
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
            {!canUseAiExplanations && !explanation && (
                <div className="rounded-lg border border-primary/20 bg-primary/20 p-3 text-sm">
                    <div className="flex items-start gap-2">
                        <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--primary)]" />
                        <div className="space-y-2">
                            <p className="text-[var(--primary)] font-medium">
                                A explicação por IA de cada erro entra no Pro.
                            </p>
                            <p className="text-gray-300/80 text-xs leading-relaxed">
                                No Free você continua praticando e revisando seus erros. No Pro,
                                desbloqueia a explicação fundamentada, base legal e dica prática por questão.
                            </p>
                            <Link
                                href="/settings"
                                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] underline underline-offset-4 hover:text-[#ffb18d]"
                            >
                                <Crown className="h-3.5 w-3.5" />
                                Ver benefícios do Pro
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {canUseAiExplanations && !explanation && !loading && !error && (
                <button
                    onClick={handleExplain}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-[var(--primary)] rounded-lg transition-colors border border-primary/30 text-sm font-medium"
                >
                    <Sparkles className="h-4 w-4" />
                    Explicar erro com IA
                </button>
            )}

            {canUseAiExplanations && loading && (
                <div className="flex items-center gap-3 text-[var(--primary)] text-sm p-3 bg-[var(--primary)]/10 rounded-lg border border-[var(--primary)]/20">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    <div>
                        <span className="font-medium">Analisando questão...</span>
                        <p className="text-xs text-[var(--primary)]/60 mt-0.5">Consultando legislação e fundamentação jurídica</p>
                    </div>
                </div>
            )}

            {canUseAiExplanations && error && (
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

            {canUseAiExplanations && explanation && (
                <div className="mt-4 p-5 bg-card border border-primary/30 rounded-xl relative overflow-hidden">
                    {/* Decorative background glow */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-[var(--primary)]/10 blur-3xl rounded-full pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-primary/20 blur-3xl rounded-full pointer-events-none"></div>

                    <h4 className="flex items-center gap-2 text-[var(--primary)] font-semibold mb-4">
                        <Sparkles className="h-4 w-4" />
                        Professor IA — Explicação Fundamentada
                    </h4>

                    <div className="space-y-4">
                        {/* Explicação principal */}
                        <div className="flex gap-3 items-start">
                            <BookOpen className="h-5 w-5 text-[var(--primary)] mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {explanation.text}
                            </p>
                        </div>

                        {/* Base legal */}
                        {explanation.legalBasis && (
                            <div className="flex gap-3 items-start bg-primary/20/20 p-3.5 rounded-lg border border-[var(--primary)]/20">
                                <Scale className="h-5 w-5 text-[var(--primary)] mt-0.5 flex-shrink-0" />
                                <div>
                                    <strong className="text-sm text-[var(--primary)]/80 block mb-1">📜 Base Legal</strong>
                                    <p className="text-sm text-blue-200/80 leading-relaxed">{explanation.legalBasis}</p>
                                </div>
                            </div>
                        )}

                        {/* Dica prática */}
                        {explanation.tip && (
                            <div className="flex gap-3 items-start bg-amber-900/15 p-3.5 rounded-lg border border-amber-500/20">
                                <Lightbulb className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <strong className="text-sm text-amber-300 block mb-1">💡 Dica de Ouro</strong>
                                    <p className="text-sm text-amber-200/70 italic leading-relaxed">{explanation.tip}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
