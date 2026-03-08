'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, Loader2, RefreshCw, AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { StudyConsistency, SubjectWeight, SubjectAccuracy } from '@/types';
import { auth } from '@/lib/firebase/config';

interface SmartScheduleItem {
    day: string;
    totalHours: number;
    subjects: { name: string; hours: number; reason: string }[];
}

interface SmartScheduleCardProps {
    userId: string;
    userName: string;
    consistency: StudyConsistency | null;
    planWeights: SubjectWeight[];
    accuracyData?: SubjectAccuracy[];
}

export default function SmartScheduleCard({
    userId,
    userName,
    consistency,
    planWeights,
    accuracyData,
}: SmartScheduleCardProps) {
    const [loading, setLoading] = useState(false);
    const [schedule, setSchedule] = useState<SmartScheduleItem[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedDay, setExpandedDay] = useState<string | null>(null);

    const hasContext = (planWeights?.length || 0) > 0 && (consistency?.weeklyGoalHours || 0) > 0;

    const generateSchedule = useCallback(async () => {
        if (loading) return;
        setLoading(true);
        setError(null);

        try {
            const idToken = await auth.currentUser?.getIdToken();
            if (!idToken) {
                setError('Sessão expirada. Faça login novamente.');
                return;
            }

            // Prepara dados de entrada baseados no contexto atual do aluno
            const availableDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

            const payload = {
                userName,
                weeklyGoalHours: consistency?.weeklyGoalHours ?? 10,
                availableDays,
                planSubjects: planWeights.map(p => {
                    const accData = accuracyData?.find(a => a.subject === p.subject);
                    return {
                        subject: p.subject,
                        weight: p.weight,
                        hoursStudied: 0, // Poderia ser preenchido real
                        accuracy: accData ? Math.round(accData.accuracy) : 0,
                    };
                })
            };

            const res = await fetch('/api/smart-schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error || 'Não foi possível gerar a rota.');
                return;
            }

            const data = await res.json();
            setSchedule(data.schedule);

            // Expande o dia hoje por padrão (Simplificado: só pega primeiro do array)
            if (data.schedule && data.schedule.length > 0) {
                setExpandedDay(data.schedule[0].day);
            }

        } catch {
            setError('Erro de conexão ao gerar o cronograma.');
        } finally {
            setLoading(false);
        }
    }, [loading, userName, consistency, planWeights, accuracyData]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="rounded-am-xl border border-am-border-default border-t border-t-am-ai-default/30 bg-am-surface p-8 shadow-am-md relative overflow-hidden h-full flex flex-col"
        >

            <div className="relative mb-8 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="rounded-am-md border border-am-border-default bg-am-surface-deep p-2">
                        <CalendarDays className="h-4 w-4 text-am-text-tertiary" />
                    </div>
                    <div>
                        <h2 className="font-brand text-am-body-lg font-bold text-am-text-primary tracking-tight">Cronograma de Foco</h2>
                        <p className="text-am-caption text-am-text-secondary mt-0.5 font-mono uppercase tracking-widest">Alocação Semanal AI</p>
                    </div>
                </div>

                <button
                    onClick={generateSchedule}
                    disabled={loading || !hasContext}
                    className="inline-flex items-center gap-2 rounded-am-md border border-am-border-default bg-am-surface-elevated px-4 py-2 text-am-caption font-medium text-am-text-primary shadow-am-sm transition-colors hover:bg-am-surface-subtle hover:border-am-border-strong disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : schedule ? (
                        <RefreshCw className="h-4 w-4" />
                    ) : (
                        <Sparkles className="h-4 w-4 text-am-ai-default" />
                    )}
                    {schedule ? 'Recalcular' : 'Gerar'}
                </button>
            </div>

            {!hasContext && (
                <div className="rounded-xl border border-am-warning/30 bg-am-warning/10 px-4 py-3 text-sm text-am-warning flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <p>Defina as matérias e seus pesos no 'Edital' para a IA poder calcular sua rota ideal.</p>
                </div>
            )}

            {error && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-am-error/30 bg-am-error/10 px-4 py-3 text-sm text-am-error">
                    <AlertTriangle className="h-5 w-5" />
                    {error}
                </div>
            )}

            {schedule && (
                <div className="space-y-3 relative z-10">
                    {schedule.map((dayItem, idx) => {
                        const isExpanded = expandedDay === dayItem.day;
                        return (
                            <div key={idx} className="rounded-xl border border-am-border-default bg-am-surface-subtle overflow-hidden transition-all hover:border-am-border-strong">
                                <button
                                    onClick={() => setExpandedDay(isExpanded ? null : dayItem.day)}
                                    className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${isExpanded ? 'bg-am-brand-primary/10 text-am-brand-primary' : 'bg-am-surface-deep text-am-text-tertiary'}`}>
                                            <CalendarDays className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-am-text-primary">{dayItem.day}</p>
                                            <p className="text-xs text-am-brand-primary font-medium">{dayItem.totalHours} horas sugeridas</p>
                                        </div>
                                    </div>
                                    {isExpanded ? <ChevronUp className="text-am-text-tertiary h-5 w-5" /> : <ChevronDown className="text-am-text-tertiary h-5 w-5" />}
                                </button>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="px-4 pb-4 pt-1 border-t border-am-border-default"
                                        >
                                            <div className="space-y-3">
                                                {dayItem.subjects.map((sub, sIdx) => (
                                                    <div key={sIdx} className="bg-am-surface rounded-lg p-3 border border-am-border-default">
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <span className="text-sm font-medium text-am-text-primary flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-am-brand-primary"></span>
                                                                {sub.name}
                                                            </span>
                                                            <span className="text-xs px-2 py-0.5 rounded-md bg-am-brand-primary/10 text-am-brand-primary font-mono border border-am-brand-primary/20">
                                                                {sub.hours}h
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-am-text-secondary ml-3.5 leading-relaxed">
                                                            <strong className="text-am-text-primary font-medium">Motivo:</strong> {sub.reason}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )
                    })}
                </div>
            )}
        </motion.div>
    );
}
