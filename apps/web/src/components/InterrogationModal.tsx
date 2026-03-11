import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Loader2, Target, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';
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

    const handleSubmit = async () => {
        if (summaryText.length < 15) {
            setError('Escreva um pouco mais para a IA conseguir avaliar seu aprendizado de forma justa.');
            return;
        }

        setStep('evaluating');
        setError(null);

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

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro na avaliação. A IA está indisponível no momento.');
            }

            setResult(data.evaluation);
            setStep('result');
        } catch (err) {
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
                className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-indigo-500/20 bg-gray-950 p-6 shadow-2xl"
            >
                {/* Glow Effects */}
                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#3150AA]/10 blur-[80px]" />
                <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-600/10 blur-[80px]" />

                {/* Header */}
                <div className="relative z-10 mb-6 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-400 border border-indigo-500/20 shadow-inner">
                            <Brain className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-am-text-primary tracking-tight">O Interrogatório</h2>
                            <p className="text-sm font-medium text-indigo-300">Residência de {subjectName}</p>
                        </div>
                    </div>

                    {step === 'input' && (
                        <button onClick={onSkip} className="rounded-full bg-am-surface-subtle p-2 text-gray-400 hover:bg-am-surface-subtle hover:text-am-text-primary transition-colors">
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
                                        className="h-32 w-full resize-none rounded-xl border border-am-border-default bg-gray-900/50 p-4 text-sm text-am-text-primary placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>

                                {error && (
                                    <p className="mb-4 mt-2 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                                        <AlertTriangle className="h-4 w-4" /> {error}
                                    </p>
                                )}

                                <div className="mt-6 flex items-center justify-end gap-3">
                                    <button
                                        onClick={onSkip}
                                        className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-400 hover:bg-am-surface-subtle hover:text-am-text-primary transition-colors"
                                    >
                                        Pular Avaliação
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-am-text-primary shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500"
                                    >
                                        Enviar para Mentoria
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'evaluating' && (
                            <motion.div key="evaluating" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-12 text-center">
                                <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-6" />
                                <h3 className="text-lg font-bold text-am-text-primary mb-2">Analisando Retenção</h3>
                                <p className="text-sm text-gray-400 max-w-xs mx-auto">
                                    O Mentor IA está avaliando seu resumo contra a base de conhecimento de {subjectName}...
                                </p>
                            </motion.div>
                        )}

                        {step === 'result' && result && (
                            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

                                {/* Circle Score */}
                                <div className="flex justify-center">
                                    <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 border-indigo-500/20 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                                        <span className="text-3xl font-extrabold text-am-text-primary tracking-tighter">{result.score}</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mt-1">Focus Score</span>
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
