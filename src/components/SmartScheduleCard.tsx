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
            className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-gray-900 to-gray-950 p-6 shadow-2xl relative overflow-hidden"
        >
            {/* Glow de fundo AI */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="relative mb-6 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-indigo-500/20 p-2.5">
                        <Brain className="h-6 w-6 text-indigo-300" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">GPS do Estudo</h2>
                        <p className="text-sm text-indigo-200/70">Cronograma da semana gerado por IA</p>
                    </div>
                </div>

                <button
                    onClick={generateSchedule}
                    disabled={loading || !hasContext}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 hover:shadow-indigo-500/40 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : schedule ? (
                        <RefreshCw className="h-4 w-4" />
                    ) : (
                        <Sparkles className="h-4 w-4" />
                    )}
                    {schedule ? 'Recalcular Rota' : 'Gerar Rota'}
                </button>
            </div>

            {!hasContext && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <p>Defina as matérias e seus pesos no 'Edital' para a IA poder calcular sua rota ideal.</p>
                </div>
            )}

            {error && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    <AlertTriangle className="h-5 w-5" />
                    {error}
                </div>
            )}

            {schedule && (
                <div className="space-y-3 relative z-10">
                    {schedule.map((dayItem, idx) => {
                        const isExpanded = expandedDay === dayItem.day;
                        return (
                            <div key={idx} className="rounded-xl border border-white/10 bg-gray-900/60 overflow-hidden transition-all hover:border-white/20">
                                <button
                                    onClick={() => setExpandedDay(isExpanded ? null : dayItem.day)}
                                    className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${isExpanded ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-gray-400'}`}>
                                            <CalendarDays className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-100">{dayItem.day}</p>
                                            <p className="text-xs text-indigo-300 font-medium">{dayItem.totalHours} horas sugeridas</p>
                                        </div>
                                    </div>
                                    {isExpanded ? <ChevronUp className="text-gray-400 h-5 w-5" /> : <ChevronDown className="text-gray-400 h-5 w-5" />}
                                </button>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="px-4 pb-4 pt-1 border-t border-white/5"
                                        >
                                            <div className="space-y-3">
                                                {dayItem.subjects.map((sub, sIdx) => (
                                                    <div key={sIdx} className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <span className="text-sm font-medium text-gray-200 flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                                                {sub.name}
                                                            </span>
                                                            <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 font-mono border border-indigo-500/20">
                                                                {sub.hours}h
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-400 ml-3.5 leading-relaxed">
                                                            <strong className="text-gray-300/80 font-medium">Motivo:</strong> {sub.reason}
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
