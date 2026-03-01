'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase/config';
import { getWrongAttempts, getQuestionById, markAttemptAsMastered } from '@/lib/firebase/questions';
import { QuestionAttempt, QuestionBankItem } from '@/types';
import { ExplainAnswerButton } from '@/components/ExplainAnswerButton';
import {
    BookX,
    Sparkles,
    CheckCircle2,
    Filter,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    TrendingDown,
    Lightbulb,
    RotateCcw,
    Eye,
    EyeOff,
} from 'lucide-react';

interface ErrorEntry {
    attempt: QuestionAttempt;
    question: QuestionBankItem;
}

interface DiagnosisResult {
    patterns: string[];
    recommendations: string[];
    criticalSubjects: string[];
}

export default function CadernoErrosPage() {
    const { user } = useAuthContext();
    const [errors, setErrors] = useState<ErrorEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [showMastered, setShowMastered] = useState(false);
    const [filterMateria, setFilterMateria] = useState<string>('');
    const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
    const [diagnosisLoading, setDiagnosisLoading] = useState(false);
    const [diagnosisError, setDiagnosisError] = useState<string | null>(null);

    const loadErrors = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const attempts = await getWrongAttempts(user.uid, 200, showMastered);

            // Load question data for each attempt
            const entries: ErrorEntry[] = [];
            const questionCache = new Map<string, QuestionBankItem | null>();

            for (const attempt of attempts) {
                if (!questionCache.has(attempt.questionId)) {
                    const q = await getQuestionById(attempt.questionId);
                    questionCache.set(attempt.questionId, q);
                }
                const question = questionCache.get(attempt.questionId);
                if (question) {
                    entries.push({ attempt, question });
                }
            }

            setErrors(entries);
        } catch (err) {
            console.error('Erro ao carregar caderno de erros:', err);
            setErrors([]);
        } finally {
            setLoading(false);
        }
    }, [user, showMastered]);

    useEffect(() => { loadErrors(); }, [loadErrors]);

    const toggleExpanded = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleMastered = async (attemptId: string) => {
        try {
            await markAttemptAsMastered(attemptId, true);
            setErrors(prev => prev.filter(e => e.attempt.id !== attemptId));
        } catch (err) {
            console.error('Erro ao marcar como dominado:', err);
        }
    };

    const handleUnmaster = async (attemptId: string) => {
        try {
            await markAttemptAsMastered(attemptId, false);
            loadErrors();
        } catch (err) {
            console.error('Erro ao desmarcar como dominado:', err);
        }
    };

    const handleDiagnosis = async () => {
        if (!user || errors.length === 0) return;
        try {
            setDiagnosisLoading(true);
            setDiagnosisError(null);

            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('Sessão expirada.');

            const errorPayload = errors.slice(0, 50).map(e => ({
                materia: e.question.materia,
                subtema: e.question.subtema || '',
                statement: e.question.statement,
                correctAnswer: e.question.answer,
                studentAnswer: e.attempt.selectedOption,
            }));

            const res = await fetch('/api/error-diagnosis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ errors: errorPayload }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao gerar diagnóstico.');
            setDiagnosis(data);
        } catch (err) {
            setDiagnosisError(err instanceof Error ? err.message : 'Erro desconhecido.');
        } finally {
            setDiagnosisLoading(false);
        }
    };

    if (!user) return null;

    // Get unique materias for filter
    const allMaterias = [...new Set(errors.map(e => e.question.materia))].sort();
    const filteredErrors = filterMateria
        ? errors.filter(e => e.question.materia === filterMateria)
        : errors;

    // Group by materia
    const grouped = new Map<string, ErrorEntry[]>();
    filteredErrors.forEach(entry => {
        const key = entry.question.materia;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(entry);
    });

    // Sort groups by error count (most errors first)
    const sortedGroups = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length);

    // KPIs
    const totalErrors = errors.length;
    const activeMaterias = new Set(errors.map(e => e.question.materia)).size;
    const worstMateria = sortedGroups[0]?.[0] || '—';

    return (
        <div className="min-h-screen bg-[#080c14]">
            {/* Header */}
            <div className="border-b border-white/[0.05] bg-[#0b1120]/60 px-6 py-5 backdrop-blur-sm">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <BookX className="h-6 w-6 text-red-400" />
                            <h1 className="text-2xl font-bold text-white">Caderno de Erros</h1>
                        </div>
                        <p className="mt-0.5 text-sm text-slate-500">
                            Seus erros organizados com diagnóstico IA para nunca mais repetir
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-6 py-6 space-y-6">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500"></div>
                    </div>
                ) : (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400">Total de Erros</p>
                                <p className="mt-1 text-3xl font-bold text-white">{totalErrors}</p>
                                <p className="text-xs text-slate-500 mt-1">{showMastered ? 'incluindo dominados' : 'não dominados'}</p>
                            </div>
                            <div className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Matérias Afetadas</p>
                                <p className="mt-1 text-3xl font-bold text-white">{activeMaterias}</p>
                                <p className="text-xs text-slate-500 mt-1">matérias com erros</p>
                            </div>
                            <div className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">Matéria Mais Fraca</p>
                                <p className="mt-1 text-lg font-bold text-white truncate">{worstMateria}</p>
                                <p className="text-xs text-slate-500 mt-1">{sortedGroups[0]?.[1]?.length || 0} erros</p>
                            </div>
                        </div>

                        {/* Filters & Actions */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-slate-500" />
                                <select
                                    value={filterMateria}
                                    onChange={(e) => setFilterMateria(e.target.value)}
                                    className="bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-2 focus:border-violet-500 focus:outline-none"
                                >
                                    <option value="">Todas as matérias</option>
                                    {allMaterias.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            <button
                                onClick={() => setShowMastered(prev => !prev)}
                                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                            >
                                {showMastered ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                {showMastered ? 'Ocultar Dominados' : 'Mostrar Dominados'}
                            </button>

                            <div className="flex-1" />

                            <button
                                onClick={handleDiagnosis}
                                disabled={diagnosisLoading || errors.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                                {diagnosisLoading ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                    <Sparkles className="h-4 w-4" />
                                )}
                                Diagnóstico IA
                            </button>
                        </div>

                        {/* Diagnosis Result */}
                        {diagnosisError && (
                            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-sm text-red-400">
                                {diagnosisError}
                            </div>
                        )}

                        {diagnosis && (
                            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-6 space-y-5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-violet-500/10 blur-3xl rounded-full pointer-events-none"></div>

                                <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                                    <Sparkles className="h-5 w-5 text-violet-400" />
                                    Diagnóstico do Mentor IA
                                </h3>

                                <div className="grid gap-4 md:grid-cols-3">
                                    {/* Patterns */}
                                    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <AlertTriangle className="h-4 w-4 text-red-400" />
                                            <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider">Padrões de Erro</h4>
                                        </div>
                                        <ul className="space-y-2">
                                            {diagnosis.patterns.map((p, i) => (
                                                <li key={i} className="text-sm text-gray-300 flex gap-2">
                                                    <TrendingDown className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                                                    {p}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Recommendations */}
                                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Lightbulb className="h-4 w-4 text-emerald-400" />
                                            <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Recomendações</h4>
                                        </div>
                                        <ul className="space-y-2">
                                            {diagnosis.recommendations.map((r, i) => (
                                                <li key={i} className="text-sm text-gray-300 flex gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                                    {r}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Critical Subjects */}
                                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                                            <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Matérias Críticas</h4>
                                        </div>
                                        <ul className="space-y-2">
                                            {diagnosis.criticalSubjects.map((s, i) => (
                                                <li key={i} className="text-sm text-gray-300 font-medium">{s}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error List, Grouped by Subject */}
                        {totalErrors === 0 ? (
                            <div className="text-center py-20">
                                <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                                <h2 className="text-xl font-bold text-white mb-2">Nenhum erro encontrado!</h2>
                                <p className="text-sm text-slate-500">Continue praticando nos simulados. Seus erros aparecerão aqui.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {sortedGroups.map(([materia, entries]) => (
                                    <div key={materia} className="rounded-xl border border-white/[0.06] bg-[#0f1825] overflow-hidden">
                                        {/* Group Header */}
                                        <div className="flex items-center justify-between px-5 py-3 bg-white/[0.02] border-b border-white/[0.05]">
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400 text-sm font-bold">
                                                    {entries.length}
                                                </span>
                                                <h3 className="font-semibold text-white">{materia}</h3>
                                            </div>
                                        </div>

                                        {/* Error Cards */}
                                        <div className="divide-y divide-white/[0.03]">
                                            {entries.map(({ attempt, question }) => {
                                                const isExpanded = expandedIds.has(attempt.id!);
                                                return (
                                                    <div key={attempt.id} className="px-5 py-4">
                                                        {/* Collapsed Row */}
                                                        <div
                                                            className="flex items-start gap-3 cursor-pointer"
                                                            onClick={() => toggleExpanded(attempt.id!)}
                                                        >
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm text-gray-300 line-clamp-2">
                                                                    {question.statement}
                                                                </p>
                                                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                                    {question.subtema && (
                                                                        <span className="text-[10px] px-2 py-0.5 bg-gray-800 rounded text-gray-400">
                                                                            {question.subtema}
                                                                        </span>
                                                                    )}
                                                                    <span className="text-xs text-red-400">
                                                                        Sua: <strong>{attempt.selectedOption}</strong>
                                                                    </span>
                                                                    <span className="text-xs text-emerald-400">
                                                                        Correta: <strong>{question.answer}</strong>
                                                                    </span>
                                                                    {attempt.mastered && (
                                                                        <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 rounded text-emerald-400 uppercase tracking-wider font-semibold">
                                                                            Dominado
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex-shrink-0 text-slate-500">
                                                                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                                            </div>
                                                        </div>

                                                        {/* Expanded Content */}
                                                        {isExpanded && (
                                                            <div className="mt-4 pl-0 space-y-3 border-t border-white/[0.04] pt-4">
                                                                {/* Full Statement */}
                                                                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                                                                    <p className="text-sm text-gray-200 whitespace-pre-wrap">{question.statement}</p>
                                                                </div>

                                                                {/* Alternatives */}
                                                                <div className="space-y-2">
                                                                    {question.alternatives.map(alt => (
                                                                        <div
                                                                            key={alt.key}
                                                                            className={`flex items-start gap-2 p-3 rounded-lg text-sm ${alt.key === question.answer
                                                                                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                                                                                    : alt.key === attempt.selectedOption
                                                                                        ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                                                                                        : 'bg-gray-900/30 border border-gray-800 text-gray-400'
                                                                                }`}
                                                                        >
                                                                            <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${alt.key === question.answer
                                                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                                                    : alt.key === attempt.selectedOption
                                                                                        ? 'bg-red-500/20 text-red-400'
                                                                                        : 'bg-gray-800 text-gray-500'
                                                                                }`}>{alt.key}</span>
                                                                            <span className="flex-1">{alt.text}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Actions */}
                                                                <div className="flex flex-wrap gap-2 pt-2">
                                                                    {!attempt.mastered ? (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleMastered(attempt.id!); }}
                                                                            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg transition-colors border border-emerald-500/30 font-medium"
                                                                        >
                                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                                            Marcar como Dominado
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleUnmaster(attempt.id!); }}
                                                                            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gray-700/50 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors border border-gray-600/30 font-medium"
                                                                        >
                                                                            <RotateCcw className="h-3.5 w-3.5" />
                                                                            Desmarcar
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {/* Explain with AI */}
                                                                <ExplainAnswerButton question={question} studentAnswer={attempt.selectedOption} />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
