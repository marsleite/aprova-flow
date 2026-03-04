'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Zap, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RecoveryBannerProps {
    consistency: {
        currentStreak: number;
        daysStudiedThisWeek: number;
        weeklyGoalHours: number;
        weeklyTotalSeconds: number;
    } | null;
    onActivateRecovery: () => void;
}

export default function RecoveryBanner({ consistency, onActivateRecovery }: RecoveryBannerProps) {
    const [dismissed, setDismissed] = useState(false);
    const router = useRouter();

    if (!consistency || dismissed) return null;

    const today = new Date().getDay(); // 0(Sun) - 6(Sat)
    const isLateInWeek = today >= 3 && today <= 6; // Wed to Sat
    const hasLowFrequency = consistency.daysStudiedThisWeek <= 1;
    const zeroStreak = consistency.currentStreak === 0;
    const lowHours = consistency.weeklyTotalSeconds / 3600 < consistency.weeklyGoalHours * 0.3;

    // Mostra modo recuperação se estiver caindo a frequência no meio/fim da semana, 
    // ou se o streak quebrou e estudou muito pouco.
    const needsRecovery = (isLateInWeek && hasLowFrequency) || (zeroStreak && lowHours);

    if (!needsRecovery) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                className="mx-6 mb-5 overflow-hidden"
            >
                <div className="relative flex flex-col items-start gap-4 rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-600/20 via-orange-500/10 to-transparent p-5 sm:flex-row sm:items-center sm:justify-between shadow-[0_0_30px_rgba(239,68,68,0.1)]">

                    <div className="flex items-start gap-3 sm:items-center">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Semana em Risco!</h3>
                            <p className="mt-0.5 text-xs text-red-200/80">
                                Notamos uma queda no seu ritmo de estudo. Ative o modo recuperação para a IA recalcular uma
                                rota cirúrgica focada apenas nos seus Gaps Críticos.
                            </p>
                        </div>
                    </div>

                    <div className="flex w-full items-center gap-2 sm:w-auto">
                        <button
                            onClick={() => {
                                setDismissed(true);
                                onActivateRecovery();
                            }}
                            className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-red-600 to-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition-all hover:scale-105 hover:shadow-red-500/40 sm:flex-none active:scale-95"
                        >
                            <Zap className="h-4 w-4" />
                            Modo Recuperação
                        </button>
                        <button
                            onClick={() => setDismissed(true)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
