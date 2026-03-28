'use client';

import { FeatureCode } from '@aprovamind/domain';
import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { auth } from '@/lib/firebase/config';
import { getWrongAttempts, getQuestionById, markAttemptAsMastered } from '@/lib/firebase/questions';
import { QuestionAttempt, QuestionBankItem } from '@/types';
import EntitlementUpgradeCard from '@/components/EntitlementUpgradeCard';
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
import { KPICard, ChartCard, Button, Badge } from '@/components';

interface ErrorEntry {
    attempt: QuestionAttempt;
    question: QuestionBankItem;
}

interface GapItem {
    description: string;
    dimension: 'legislacao' | 'jurisprudencia' | 'interpretacao' | 'conceitual';
    severity: number;
    materia: string;
    subtema?: string;
    advice: string;
}

interface Flashcard {
    topic: string;
    front: string;
    back: string;
    source: string;
}

interface DiagnosisResult {
    gaps: GapItem[];
    overallScore: {
        legislacao: number;
        jurisprudencia: number;
        interpretacao: number;
        conceitual: number;
    };
    flashcards: Flashcard[];
    criticalSubjects: string[];
    summary: string;
    // backward compat
    patterns?: string[];
    recommendations?: string[];
}

const DIMENSION_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
    legislacao: { label: 'Legislação', color: 'text-am-brand-primary', emoji: '📜' },
    jurisprudencia: { label: 'Jurisprudência', color: 'text-am-ai-default', emoji: '⚖️' },
    interpretacao: { label: 'Interpretação', color: 'text-am-warning', emoji: '🔍' },
    conceitual: { label: 'Conceitual', color: 'text-am-success', emoji: '📚' },
};

function SeverityBar({ value }: { value: number }) {
    const color = value >= 8 ? 'bg-am-error' : value >= 5 ? 'bg-am-warning' : 'bg-am-success';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-am-surface-subtle/50 rounded-am-full overflow-hidden">
                <div className={`h-full rounded-am-full ${color} transition-all duration-500`} style={{ width: `${value * 10}%` }} />
            </div>
            <span className="text-[10px] text-am-text-tertiary w-6 text-right font-mono">{value}</span>
        </div>
    );
}

function ScoreBar({ label, emoji, value, color }: { label: string; emoji: string; value: number; color: string }) {
    const barColor = value >= 70 ? 'bg-am-success' : value >= 40 ? 'bg-am-warning' : 'bg-am-error';
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-am-caption">
                <span className={`${color} font-medium`}>{emoji} {label}</span>
                <span className="text-am-text-secondary font-mono">{value}%</span>
            </div>
            <div className="h-1.5 bg-am-surface-subtle/50 rounded-am-full overflow-hidden">
                <div className={`h-full rounded-am-full ${barColor} transition-all duration-700`} style={{ width: `${value}%` }} />
            </div>
        </div>
    );
}

function FlashcardItem({ card }: { card: Flashcard }) {
    const [flipped, setFlipped] = useState(false);
    return (
        <div
            onClick={() => setFlipped(prev => !prev)}
            className="cursor-pointer rounded-am-md border border-am-success/20 bg-am-success/5 p-4 min-h-[120px] flex flex-col justify-between hover:border-am-success/40 transition-colors shadow-am-sm"
        >
            <div>
                <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-am-success mb-2">{card.topic}</p>
                {flipped ? (
                    <p className="text-am-body-sm text-am-text-primary font-medium">{card.back}</p>
                ) : (
                    <p className="text-am-body-sm text-am-text-secondary">{card.front}</p>
                )}
            </div>
            <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-am-text-tertiary">{card.source}</span>
                <span className="text-[10px] text-am-success font-medium">
                    {flipped ? '← Voltar' : 'Ver resposta →'}
                </span>
            </div>
        </div>
    );
}

export default function CadernoErrosPage() {
    const { user } = useAuthContext();
    const { hasFeature } = useEntitlements(user?.uid, user?.email);
    const [errors, setErrors] = useState<ErrorEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [showMastered, setShowMastered] = useState(false);
    const [filterMateria, setFilterMateria] = useState<string>('');
    const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
    const [diagnosisLoading, setDiagnosisLoading] = useState(false);
    const [diagnosisError, setDiagnosisError] = useState<string | null>(null);
    const [diagnosisSample, setDiagnosisSample] = useState<{
        analyzedCount: number;
        availableCount: number;
    } | null>(null);

    const loadErrors = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const attempts = await getWrongAttempts(user.uid, 200, showMastered);

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
        if (!user || filteredErrors.length === 0 || !hasFeature(FeatureCode.ErrorGapAnalyzer)) return;
        try {
            setDiagnosisLoading(true);
            setDiagnosisError(null);

            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('Sessão expirada.');

            const errorsToAnalyze = filteredErrors.slice(0, 15);
            setDiagnosisSample({
                analyzedCount: errorsToAnalyze.length,
                availableCount: filteredErrors.length,
            });

            const errorPayload = errorsToAnalyze.map(e => ({
                materia: e.question.materia,
                subtema: e.question.subtema || '',
                statement: e.question.statement.substring(0, 80),
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
            if (data.gaps) {
                localStorage.setItem('aprovamind_last_gaps', JSON.stringify(data.gaps));
            }
        } catch (err) {
            setDiagnosisError(err instanceof Error ? err.message : 'Erro desconhecido.');
        } finally {
            setDiagnosisLoading(false);
        }
    };

    if (!user) return null;

    const canUseGapAnalyzer = hasFeature(FeatureCode.ErrorGapAnalyzer);

    const allMaterias = [...new Set(errors.map(e => e.question.materia))].sort();
    const filteredErrors = filterMateria
        ? errors.filter(e => e.question.materia === filterMateria)
        : errors;

    const grouped = new Map<string, ErrorEntry[]>();
    filteredErrors.forEach(entry => {
        const key = entry.question.materia;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(entry);
    });

    const sortedGroups = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length);

    const totalErrors = errors.length;
    const activeMaterias = new Set(errors.map(e => e.question.materia)).size;
    const worstMateria = sortedGroups[0]?.[0] || '—';

    return (
        <div className="flex flex-col gap-8 pb-10">
            {/* Topbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-6 border-b border-am-border-default bg-am-surface/30 backdrop-blur-md">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="error"><BookX className="h-3 w-3 mr-1" /> Arquivo Crítico</Badge>
                    </div>
                    <h1 className="font-brand text-am-h3 font-bold text-am-text-primary tracking-tight mt-2">
                        Caderno de Erros
                    </h1>
                    <p className="text-am-caption text-am-text-secondary mt-1 max-w-lg">
                        Seus atritos organizados por matéria e retroalimentados pelo Diagnóstico IA.
                    </p>
                </div>
            </div>

            <div className="px-6 space-y-6">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-am-ai-default"></div>
                    </div>
                ) : (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <KPICard
                                title="Volume de Atrito"
                                value={totalErrors.toString()}
                                icon={AlertTriangle}
                                loading={false}
                            />
                            <KPICard
                                title="Matérias Afetadas"
                                value={activeMaterias.toString()}
                                icon={Filter}
                                loading={false}
                            />
                            <KPICard
                                title="Maior Ameaça"
                                value={worstMateria}
                                icon={TrendingDown}
                                loading={false}
                            />
                        </div>

                        {/* Filters & Actions */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-am-surface-subtle p-3 rounded-am-md border border-am-border-default">
                            <div className="flex items-center gap-2 flex-grow">
                                <Filter className="h-4 w-4 text-am-text-tertiary ml-2" />
                                <select
                                    value={filterMateria}
                                    onChange={(e) => setFilterMateria(e.target.value)}
                                    className="bg-transparent border-none text-am-body-sm text-am-text-primary font-medium focus:outline-none w-full sm:w-auto min-w-[200px]"
                                >
                                    <option value="" className="bg-am-surface-subtle">Todas as matérias</option>
                                    {allMaterias.map(m => <option className="bg-am-surface-subtle" key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            <Button
                                onClick={() => setShowMastered(prev => !prev)}
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto"
                            >
                                {showMastered ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                                {showMastered ? 'Esconder Dominadas' : 'Mostrar Dominadas'}
                            </Button>

                            <Button
                                onClick={handleDiagnosis}
                                disabled={diagnosisLoading || filteredErrors.length === 0 || !canUseGapAnalyzer}
                                variant="premium"
                                size="sm"
                                className="w-full sm:w-auto shadow-[0_0_12px_var(--color-am-ai-glow)]"
                            >
                                {diagnosisLoading ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                ) : (
                                    <Sparkles className="h-4 w-4 mr-2" />
                                )}
                                {filterMateria
                                    ? `Analisar ${filterMateria}`
                                    : `Analisar (${Math.min(filteredErrors.length, 15)} erros)`
                                }
                            </Button>
                        </div>

                        {canUseGapAnalyzer && filteredErrors.length > 0 && (
                            <p className="text-am-caption text-am-text-secondary">
                                O Gap Analyzer usa uma amostra de até 15 erros filtrados por leitura para manter o diagnóstico rápido e comparável.
                                {diagnosisSample && (
                                    <span className="ml-1">
                                        Última análise: {diagnosisSample.analyzedCount} de {diagnosisSample.availableCount} erros filtrados.
                                    </span>
                                )}
                            </p>
                        )}

                        {!canUseGapAnalyzer && (
                            <EntitlementUpgradeCard
                                title="O Gap Analyzer IA fica no Premium"
                                description="O caderno de erros continua disponivel, mas a leitura estrategica dos padroes de erro, gaps ocultos e flashcards gerados por IA faz parte da camada premium."
                                highlight="Diagnostico profundo, gaps por dimensao e transformacao do erro em recuperacao estrategica."
                                recommendedPlan="premium"
                                ctaLabel="Ver beneficios do Premium"
                            />
                        )}

                        {/* Diagnosis Result */}
                        {diagnosisError && (
                            <div className="p-4 bg-am-error/10 border border-am-error/30 rounded-am-md text-am-body-sm text-am-error">
                                {diagnosisError}
                            </div>
                        )}

                        {canUseGapAnalyzer && diagnosis && (
                            <div className="rounded-am-xl border border-am-ai-border/40 bg-am-surface p-6 space-y-6 relative overflow-hidden shadow-am-lg" style={{ background: 'linear-gradient(145deg, var(--color-am-surface) 0%, rgba(139,92,246,0.05) 100%)' }}>
                                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-am-ai-glow/20 blur-[80px] rounded-full pointer-events-none"></div>

                                <div className="flex items-center justify-between relative z-10">
                                    <h3 className="flex items-center gap-2 font-brand text-am-h5 font-bold text-am-text-primary">
                                        <Sparkles className="h-5 w-5 text-am-ai-default" />
                                        Gap Analyzer IA
                                    </h3>
                                </div>

                                {diagnosisSample && (
                                    <div className="relative z-10 rounded-am-md border border-am-ai-border/30 bg-am-surface-subtle px-4 py-3">
                                        <p className="text-am-caption text-am-text-secondary">
                                            Base desta leitura: <span className="font-medium text-am-text-primary">{diagnosisSample.analyzedCount}</span> de{' '}
                                            <span className="font-medium text-am-text-primary">{diagnosisSample.availableCount}</span> erros filtrados.
                                        </p>
                                    </div>
                                )}

                                {/* Summary */}
                                {diagnosis.summary && (
                                    <p className="text-am-body-sm text-am-text-secondary bg-am-surface-subtle rounded-am-md p-4 border border-am-border-subtle relative z-10">
                                        {diagnosis.summary}
                                    </p>
                                )}

                                <div className="grid gap-6 lg:grid-cols-2 relative z-10">
                                    {/* Left: Gaps List */}
                                    <div className="space-y-4">
                                        <h4 className="flex items-center gap-2 text-am-caption font-bold font-mono text-am-error uppercase tracking-wider">
                                            <AlertTriangle className="h-4 w-4" />
                                            Gaps Identificados
                                        </h4>
                                        {diagnosis.gaps.length > 0 ? (
                                            diagnosis.gaps.map((gap, i) => {
                                                const dim = DIMENSION_LABELS[gap.dimension] || DIMENSION_LABELS.conceitual;
                                                return (
                                                    <div key={i} className="rounded-am-md border border-am-border-default bg-am-surface-elevated p-4 space-y-3">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <span className="text-am-body-sm text-am-text-primary">{gap.description}</span>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-am-full border border-current font-medium whitespace-nowrap ${dim.color}`}>
                                                                {dim.emoji} {dim.label}
                                                            </span>
                                                        </div>
                                                        <SeverityBar value={gap.severity} />
                                                        <div className="flex items-start gap-2 mt-2 bg-am-warning/5 p-2.5 rounded border border-am-warning/10">
                                                            <Lightbulb className="h-3.5 w-3.5 text-am-warning flex-shrink-0 mt-0.5" />
                                                            <p className="text-am-caption text-am-text-secondary leading-relaxed">{gap.advice}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : diagnosis.patterns && diagnosis.patterns.length > 0 ? (
                                            /* Backward compat: old format */
                                            diagnosis.patterns.map((p, i) => (
                                                <div key={i} className="rounded-am-md border border-am-border-default bg-am-surface-elevated p-4">
                                                    <div className="flex items-start gap-2">
                                                        <TrendingDown className="h-4 w-4 text-am-error flex-shrink-0 mt-0.5" />
                                                        <span className="text-am-body-sm text-am-text-secondary">{p}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : null}
                                    </div>

                                    {/* Right: Score + Critical */}
                                    <div className="space-y-6">
                                        {/* Dimension Scores */}
                                        {diagnosis.overallScore && (
                                            <div className="rounded-am-md border border-am-border-default bg-am-surface-elevated p-5 space-y-4">
                                                <h4 className="text-am-caption font-bold font-mono text-am-text-primary uppercase tracking-wider">
                                                    Perfil de Retenção
                                                </h4>
                                                {Object.entries(DIMENSION_LABELS).map(([key, dim]) => (
                                                    <ScoreBar
                                                        key={key}
                                                        label={dim.label}
                                                        emoji={dim.emoji}
                                                        value={diagnosis.overallScore[key as keyof typeof diagnosis.overallScore] || 50}
                                                        color={dim.color}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {/* Critical Subjects */}
                                        {diagnosis.criticalSubjects.length > 0 && (
                                            <div className="rounded-am-md border border-am-warning/20 bg-am-warning/5 p-5">
                                                <h4 className="flex items-center gap-2 text-am-caption font-bold font-mono text-am-warning uppercase tracking-wider mb-4">
                                                    <AlertTriangle className="h-4 w-4" />
                                                    Zonas Críticas
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {diagnosis.criticalSubjects.map((s, i) => (
                                                        <Badge key={i} variant="warning" className="text-[10px] tracking-wide">
                                                            {s}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Flashcards */}
                                {diagnosis.flashcards && diagnosis.flashcards.length > 0 && (
                                    <div className="space-y-4 relative z-10 pt-4 border-t border-am-border-default">
                                        <h4 className="flex items-center gap-2 text-am-caption font-bold font-mono text-am-success uppercase tracking-wider">
                                            <Lightbulb className="h-4 w-4" />
                                            Fichas Estratégicas Geradas
                                        </h4>
                                        <div className="grid gap-4 md:grid-cols-3">
                                            {diagnosis.flashcards.map((card, i) => (
                                                <FlashcardItem key={i} card={card} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Error List, Grouped by Subject */}
                        {totalErrors === 0 ? (
                            <div className="text-center py-20 bg-am-surface rounded-am-xl border border-am-border-default shadow-am-md">
                                <div className="mx-auto w-16 h-16 rounded-am-full bg-am-success/10 flex items-center justify-center mb-4">
                                    <CheckCircle2 className="h-8 w-8 text-am-success" />
                                </div>
                                <h2 className="font-brand text-am-h5 font-bold text-am-text-primary mb-2">Registro Limpo!</h2>
                                <p className="text-am-body-sm text-am-text-secondary mb-6 max-w-sm mx-auto">Continue evoluindo na resolução de baterias. O seu algoritmo mapeará atritos automaticamente.</p>
                                <Button asChild variant="primary">
                                    <a href="/simulations">Realizar Bateria</a>
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {sortedGroups.map(([materia, entries]) => (
                                    <div key={materia} className="rounded-am-xl border border-am-border-default bg-am-surface shadow-am-sm overflow-hidden">
                                        {/* Group Header */}
                                        <div className="flex items-center justify-between px-5 py-3 bg-am-surface-subtle border-b border-am-border-default">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="error" className="h-7 w-7 p-0 flex items-center justify-center rounded-am-md">
                                                    {entries.length}
                                                </Badge>
                                                <h3 className="font-brand text-am-body font-bold text-am-text-primary">{materia}</h3>
                                            </div>
                                        </div>

                                        {/* Error Cards */}
                                        <div className="divide-y divide-am-border-default">
                                            {entries.map(({ attempt, question }) => {
                                                const isExpanded = expandedIds.has(attempt.id!);
                                                return (
                                                    <div key={attempt.id} className="px-5 py-4 transition-colors hover:bg-am-surface-elevated">
                                                        {/* Collapsed Row */}
                                                        <div
                                                            className="flex items-start gap-4 cursor-pointer"
                                                            onClick={() => toggleExpanded(attempt.id!)}
                                                        >
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-am-body-sm text-am-text-primary line-clamp-2 leading-relaxed">
                                                                    {question.statement}
                                                                </p>
                                                                <div className="flex items-center gap-3 mt-3 flex-wrap">
                                                                    {question.subtema && (
                                                                        <Badge variant="outline" className="text-[10px] text-am-text-tertiary">
                                                                            {question.subtema}
                                                                        </Badge>
                                                                    )}
                                                                    <span className="text-am-caption text-am-error bg-am-error/10 px-2 py-0.5 rounded">
                                                                        Alvo: <strong>{attempt.selectedOption}</strong>
                                                                    </span>
                                                                    <span className="text-am-caption text-am-success bg-am-success/10 px-2 py-0.5 rounded">
                                                                        Gabarito: <strong>{question.answer}</strong>
                                                                    </span>
                                                                    {attempt.mastered && (
                                                                        <Badge variant="success" className="text-[10px] font-mono uppercase tracking-wider">
                                                                            Dominado
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex-shrink-0 text-am-text-tertiary">
                                                                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                                            </div>
                                                        </div>

                                                        {/* Expanded Content */}
                                                        {isExpanded && (
                                                            <div className="mt-5 space-y-4 border-t border-am-border-default pt-4">
                                                                {/* Full Statement */}
                                                                <div className="bg-am-surface-subtle rounded-am-md p-4 border border-am-border-subtle">
                                                                    <p className="text-am-body-sm text-am-text-primary whitespace-pre-wrap leading-relaxed">{question.statement}</p>
                                                                </div>

                                                                {/* Alternatives */}
                                                                <div className="space-y-2">
                                                                    {question.alternatives.map(alt => {

                                                                        const isCorrect = alt.key === question.answer;
                                                                        const isWrongSelected = alt.key === attempt.selectedOption;

                                                                        let wrapperClass = "bg-am-surface-subtle border-am-border-subtle text-am-text-secondary";
                                                                        let keyClass = "bg-am-surface-subtle text-am-text-tertiary";

                                                                        if (isCorrect) {
                                                                            wrapperClass = "bg-am-success/10 border-am-success/30 text-am-success";
                                                                            keyClass = "bg-am-success/20 text-am-success";
                                                                        } else if (isWrongSelected) {
                                                                            wrapperClass = "bg-am-error/10 border-am-error/30 text-am-error";
                                                                            keyClass = "bg-am-error/20 text-am-error";
                                                                        }

                                                                        return (
                                                                            <div
                                                                                key={alt.key}
                                                                                className={`flex items-start gap-3 p-3 rounded-am-md border text-am-body-sm ${wrapperClass}`}
                                                                            >
                                                                                <span className={`flex-shrink-0 w-6 h-6 rounded-am-full flex items-center justify-center text-xs font-bold ${keyClass}`}>
                                                                                    {alt.key}
                                                                                </span>
                                                                                <span className="flex-1 mt-0.5">{alt.text}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {/* Actions */}
                                                                <div className="flex flex-wrap items-center gap-3 pt-2">
                                                                    {!attempt.mastered ? (
                                                                        <Button
                                                                            onClick={(e) => { e.stopPropagation(); handleMastered(attempt.id!); }}
                                                                            size="sm"
                                                                            className="bg-am-success/20 hover:bg-am-success/30 text-am-success border border-am-success/30"
                                                                        >
                                                                            <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar Revisada
                                                                        </Button>
                                                                    ) : (
                                                                        <Button
                                                                            onClick={(e) => { e.stopPropagation(); handleUnmaster(attempt.id!); }}
                                                                            size="sm"
                                                                            variant="outline"
                                                                        >
                                                                            <RotateCcw className="h-4 w-4 mr-2" /> Revogar
                                                                        </Button>
                                                                    )}
                                                                    <ExplainAnswerButton question={question} studentAnswer={attempt.selectedOption} />
                                                                </div>
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
