'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, Loader2, RefreshCw, AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components';
import { StudyConsistency, SubjectWeight, SubjectAccuracy, StudyCapacityHours } from '@/types';
import { auth } from '@/lib/firebase/config';
import {
    buildAvailableStudyDays,
    getStudyPlanCoverageProjection,
} from '@/lib/plans/studyCapacity';

interface SmartScheduleItem {
    day: string;
    totalHours: number;
    subjects: { name: string; hours: number; reason: string }[];
}

interface SmartScheduleCardProps {
    userId: string;
    userName: string;
    activePlanName?: string | null;
    consistency: StudyConsistency | null;
    planWeights: SubjectWeight[];
    accuracyData?: SubjectAccuracy[];
    examDate?: string | null;
    materialWorkloadHours?: number | null;
    studyCapacityHours?: StudyCapacityHours | null;
}

export default function SmartScheduleCard({
    userId,
    userName,
    activePlanName,
    consistency,
    planWeights,
    accuracyData,
    examDate,
    materialWorkloadHours,
    studyCapacityHours,
}: SmartScheduleCardProps) {
    const [loading, setLoading] = useState(false);
    const [schedule, setSchedule] = useState<SmartScheduleItem[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedDay, setExpandedDay] = useState<string | null>(null);

    const hasContext = (planWeights?.length || 0) > 0 && (consistency?.weeklyGoalHours || 0) > 0;
    const availableSchedule = buildAvailableStudyDays(
        studyCapacityHours,
        consistency?.weeklyGoalHours ?? 10
    );
    const projection = getStudyPlanCoverageProjection({
        weeklyGoalHours: consistency?.weeklyGoalHours ?? 10,
        examDate: examDate ?? null,
        materialWorkloadHours: materialWorkloadHours ?? null,
        studyCapacityHours: studyCapacityHours ?? null,
    });

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

            const payload = {
                userName,
                activePlanName: activePlanName || null,
                weeklyGoalHours: consistency?.weeklyGoalHours ?? 10,
                examDate: examDate ?? null,
                materialWorkloadHours: materialWorkloadHours ?? null,
                requiredWeeklyHours: projection.requiredWeeklyHours,
                coverageStatus: projection.status,
                availableSchedule: availableSchedule.length > 0
                    ? availableSchedule.map((day) => ({
                        day: day.fullLabel,
                        availableHours: day.availableHours,
                    }))
                    : [{ day: 'Segunda', availableHours: consistency?.weeklyGoalHours ?? 10 }],
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
    }, [loading, userName, activePlanName, consistency, examDate, materialWorkloadHours, projection.requiredWeeklyHours, projection.status, availableSchedule, planWeights, accuracyData]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="rounded-xl border border-border/50 border-t-2 border-t-am-ai-border/40 bg-card/40 backdrop-blur-2xl p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ring-1 ring-white/5 relative overflow-hidden h-full flex flex-col"
        >

            <div className="relative mb-8 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="rounded-md border border-border/50 bg-card p-2 ring-1 ring-white/5 shadow-sm">
                        <CalendarDays className="h-4 w-4 text-foreground" />
                    </div>
                    <div>
                        <h2 className="font-sans text-am-body-lg font-bold text-foreground tracking-tight">Cronograma de Foco</h2>
                        <p className="text-am-caption text-muted-foreground mt-0.5 font-mono uppercase tracking-widest">Alocação Semanal AI</p>
                    </div>
                </div>

                <Button
                    onClick={generateSchedule}
                    disabled={loading || !hasContext}
                    variant="outline"
                    size="sm"
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : schedule ? (
                        <RefreshCw className="h-4 w-4" />
                    ) : (
                        <Sparkles className="h-4 w-4 text-primary" />
                    )}
                    {schedule ? 'Recalcular' : 'Gerar'}
                </Button>
            </div>

            {!hasContext && (
                <div className="rounded-xl border border-am-warning/30 bg-am-warning/10 px-4 py-3 text-sm text-am-warning flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <p>Defina as matérias e seus pesos no &apos;Edital&apos; para a IA poder calcular sua rota ideal.</p>
                </div>
            )}

            {hasContext && (
                <div className="mb-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-border bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                        Capacidade da semana: <strong className="text-foreground">{projection.weeklyCapacityHours.toFixed(1)}h</strong>
                    </span>
                    <span className="rounded-full border border-border bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                        Meta do plano: <strong className="text-foreground">{(consistency?.weeklyGoalHours ?? 10).toFixed(1)}h</strong>
                    </span>
                    {projection.requiredWeeklyHours != null && (
                        <span className="rounded-full border border-border bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                            Ritmo necessário: <strong className="text-foreground">{projection.requiredWeeklyHours.toFixed(1)}h</strong>
                        </span>
                    )}
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
                            <div key={idx} className="rounded-lg border border-border/50 bg-muted overflow-hidden transition-all hover:border-border ring-1 ring-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                                <button
                                    onClick={() => setExpandedDay(isExpanded ? null : dayItem.day)}
                                    className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-md ring-1 ring-white/5 ${isExpanded ? 'bg-am-ai-subtle/40 text-primary' : 'bg-background text-muted-foreground'}`}>
                                            <CalendarDays className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">{dayItem.day}</p>
                                            <p className="text-xs text-primary font-medium">{dayItem.totalHours} horas sugeridas</p>
                                        </div>
                                    </div>
                                    {isExpanded ? <ChevronUp className="text-muted-foreground h-5 w-5" /> : <ChevronDown className="text-muted-foreground h-5 w-5" />}
                                </button>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="px-4 pb-4 pt-1 border-t border-border"
                                        >
                                            <div className="space-y-3">
                                                {dayItem.subjects.map((sub, sIdx) => (
                                                    <div key={sIdx} className="bg-card rounded-md p-3 border border-border/50 shadow-sm ring-1 ring-white/5">
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                                                {sub.name}
                                                            </span>
                                                            <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-md bg-am-ai-subtle/50 text-primary font-mono border border-border/50/30">
                                                                {sub.hours}h
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground ml-3.5 leading-relaxed">
                                                            <strong className="text-foreground font-medium">Motivo:</strong> {sub.reason}
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
