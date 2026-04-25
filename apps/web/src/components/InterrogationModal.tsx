import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Loader2, Target, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';
import AiQuotaNotice from '@/components/AiQuotaNotice';
import { readAiErrorResponse, type AiQuotaNoticeData } from '@/lib/ai/quota-feedback';
import { auth } from '@/lib/firebase/config';

interface InterrogationModalProps {
    isOpen: boolean;
    subjectName: string;
    onSkip: () => void;
    onEvaluationComplete: (score: number) => void;
}

export default function InterrogationModal({
    isOpen,
    subjectName,
    onSkip,
    onEvaluationComplete,
}: InterrogationModalProps) {
    const [summaryText, setSummaryText] = useState('');
    const [step, setStep] = useState<'input' | 'evaluating' | 'result'>('input');
    const [result, setResult] = useState<{ score: number; strengths: string; weaknesses: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [quotaNotice, setQuotaNotice] = useState<AiQuotaNoticeData | null>(null);

    const handleSubmit = async () => {
        if (summaryText.length < 15) {
            setError('Escreva um pouco mais para a IA conseguir avaliar seu aprendizado de forma justa.');
            return;
        }

        setStep('evaluating');
        setError(null);
        setQuotaNotice(null);

        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('Sessão expirada. Faça login novamente.');

            const res = await fetch('/api/interrogation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ subject: subjectName, summaryText })
            });

            if (!res.ok) {
                const failure = await readAiErrorResponse({
                    response: res,
                    fallbackMessage: 'Erro na avaliação. A IA está indisponível no momento.',
                });
                setError(failure.message);
                setQuotaNotice(failure.quotaNotice);
                setStep('input');
                return;
            }

            const data = await res.json();

            setResult(data.evaluation);
            setStep('result');
        } catch (err) {
            setQuotaNotice(null);
            setError((err as Error).message);
            setStep('input');
        }
    };

    const finishProcess = () => {
        if (result) {
            onEvaluationComplete(result.score);
        } else {
            onSkip();
        }
        // Reset after closing is handled cleanly if re-mounted, but let's be safe
        setTimeout(() => {
            setSummaryText('');
            setStep('input');
            setResult(null);
        }, 500);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 pt-[10vh] backdrop-blur-2xl">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-primary/20 bg-background p-6 shadow-2xl"
            >
                {/* Glow Effects */}
                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--primary)]/10 blur-[80px]" />
                <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />

                {/* Header */}
                <div className="relative z-10 mb-6 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20/20 to-primary/20/20 text-primary border border-primary/20 shadow-inner">
                            <Brain className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground tracking-tight">O Interrogatório</h2>
                            <p className="text-sm font-medium text-indigo-300">Residência de {subjectName}</p>
                        </div>
                    </div>

                    {step === 'input' && (
                        <button onClick={onSkip} className="rounded-full bg-muted p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                <div className="relative z-10">
                    <AnimatePresence mode="wait">
                        {step === 'input' && (
                            <motion.div key="input" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                <p className="mb-4 text-sm text-gray-300">
                                    Excelente trabalho finalizando a sessão! Para reforçar a sua retenção (active recall), <strong>como você resumiria o que acabou de aprender?</strong>
                                </p>

                                <div className="relative mb-2">
                                    <textarea
                                        value={summaryText}
                                        onChange={(e) => setSummaryText(e.target.value)}
                                        placeholder="Digite aqui os conceitos chaves, artigos da lei ou principais conclusões do tópico estudado..."
                                        className="h-32 w-full resize-none rounded-xl border border-border bg-card/50 p-4 text-sm text-foreground placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                </div>

                                {quotaNotice ? (
                                    <AiQuotaNotice
                                        notice={quotaNotice}
                                        className="mb-4"
                                        surface="interrogation_modal"
                                        eventMetadata={{ subject: subjectName }}
                                    />
                                ) : error && (
                                    <p className="mb-4 mt-2 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                                        <AlertTriangle className="h-4 w-4" /> {error}
                                    </p>
                                )}

                                <div className="mt-6 flex items-center justify-end gap-3">
                                    <button
                                        onClick={onSkip}
                                        className="rounded-xl px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                    >
                                        Pular Avaliação
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-foreground shadow-lg shadow-primary/20/25 transition-all hover:bg-primary"
                                    >
                                        Enviar para Mentoria
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'evaluating' && (
                            <motion.div key="evaluating" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-12 text-center">
                                <Loader2 className="h-10 w-10 animate-spin text-primary mb-6" />
                                <h3 className="text-lg font-bold text-foreground mb-2">Analisando Retenção</h3>
                                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                    O Mentor IA está avaliando seu resumo contra a base de conhecimento de {subjectName}...
                                </p>
                            </motion.div>
                        )}

                        {step === 'result' && result && (
                            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

                                {/* Circle Score */}
                                <div className="flex justify-center">
                                    <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 border-primary/20 bg-primary/20 shadow-lg shadow-primary/20">
                                        <span className="text-3xl font-extrabold text-foreground tracking-tighter">{result.score}</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mt-1">Score de Retenção</span>
                                    </div>
                                </div>

                                {/* Feedback Cards */}
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">O que foi bem</h4>
                                        </div>
                                        <p className="text-xs text-gray-300 leading-relaxed">{result.strengths}</p>
                                    </div>

                                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Target className="h-4 w-4 text-amber-400" />
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Pontos Cegos</h4>
                                        </div>
                                        <p className="text-xs text-gray-300 leading-relaxed">{result.weaknesses}</p>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        onClick={finishProcess}
                                        className="w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-gray-900 transition-colors hover:bg-gray-200"
                                    >
                                        Finalizar e Salvar
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
