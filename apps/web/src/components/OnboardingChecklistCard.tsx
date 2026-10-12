'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Sparkles,
  FileText,
  Smartphone,
  Play,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  X,
  Trophy,
  Brain,
  UploadCloud,
  Check,
} from 'lucide-react';
import { Button, Badge } from '@/components';
import { StudyPlanEdital, StudySummary } from '@/types';

interface OnboardingChecklistCardProps {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  plans: StudyPlanEdital[];
  summary: StudySummary;
  recentSessionsCount?: number;
  onOpenPlanManager?: () => void;
  onOpenWhatsAppModal: () => void;
}

export default function OnboardingChecklistCard({
  userId,
  userEmail,
  userName,
  plans,
  summary,
  recentSessionsCount = 0,
  onOpenPlanManager,
  onOpenWhatsAppModal,
}: OnboardingChecklistCardProps) {
  const [isWhatsAppLinked, setIsWhatsAppLinked] = useState<boolean>(false);
  const [loadingWhatsApp, setLoadingWhatsApp] = useState<boolean>(true);
  const [minimized, setMinimized] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  // Check WhatsApp pairing status
  useEffect(() => {
    if (!userId) return;
    let isMounted = true;

    async function checkStatus() {
      try {
        const res = await fetch(`/api/whatsapp/pairing?uid=${userId}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setIsWhatsAppLinked(Boolean(data.is_linked));
          }
        }
      } catch (err) {
        console.warn('Erro ao checar status do WhatsApp no checklist:', err);
      } finally {
        if (isMounted) setLoadingWhatsApp(false);
      }
    }

    checkStatus();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Load minimized preference
  useEffect(() => {
    if (!userId) return;
    const isMin = localStorage.getItem(`aprovamind_checklist_min_${userId}`);
    if (isMin === 'true') {
      setMinimized(true);
    }
    const isDismiss = localStorage.getItem(`aprovamind_checklist_dismiss_${userId}`);
    if (isDismiss === 'true') {
      setDismissed(true);
    }
  }, [userId]);

  const toggleMinimized = () => {
    const next = !minimized;
    setMinimized(next);
    if (userId) {
      localStorage.setItem(`aprovamind_checklist_min_${userId}`, String(next));
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (userId) {
      localStorage.setItem(`aprovamind_checklist_dismiss_${userId}`, 'true');
    }
  };

  // Step 1: Edital definido (ter plano com matérias ou ter editado o plano default)
  const hasConfiguredPlan = plans.some(
    (p) => p.subjects && p.subjects.length > 0 && (p.name !== 'Geral' || p.subjects.length >= 2)
  );

  // Step 2: WhatsApp conectado
  const hasLinkedWhatsApp = isWhatsAppLinked;

  // Step 3: Primeira sessão de estudo ou interação
  const hasStudied = summary.totalToday > 0 || summary.totalWeek > 0 || recentSessionsCount > 0;

  // Calculate progress
  const steps = [
    {
      id: 'edital',
      title: 'Definir Concurso e Matérias do Edital',
      description: 'Suba o PDF do edital para extração automática via IA ou cadastre suas disciplinas.',
      completed: hasConfiguredPlan,
      icon: FileText,
      badge: '+50 XP',
      actionLabel: 'Subir Edital em PDF',
      actionIcon: UploadCloud,
      action: onOpenPlanManager ? onOpenPlanManager : undefined,
      href: onOpenPlanManager ? undefined : '/planner',
    },
    {
      id: 'whatsapp',
      title: 'Conectar Tutor de IA no WhatsApp',
      description: 'Receba simulados de almoço às 12h e tire dúvidas jurídicas no celular.',
      completed: hasLinkedWhatsApp,
      icon: Smartphone,
      badge: '+30 XP',
      actionLabel: 'Conectar em 1 Clique',
      actionIcon: Smartphone,
      action: onOpenWhatsAppModal,
      href: undefined,
    },
    {
      id: 'study',
      title: 'Fazer 1ª Sessão de Foco ou Pergunta à IA',
      description: 'Cronometre seu primeiro ciclo de horas líquidas ou consulte o Mentor IA.',
      completed: hasStudied,
      icon: Play,
      badge: '+20 XP',
      actionLabel: 'Iniciar Estudo',
      actionIcon: Play,
      href: '/engine',
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const isAllCompleted = completedCount === steps.length;

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-card via-card to-primary/5 p-5 shadow-lg shadow-primary/5 transition-all">
      {/* Decorative ambient light */}
      <div className="absolute top-0 right-0 -mr-12 -mt-12 h-36 w-36 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 border border-primary/25 text-primary">
            {isAllCompleted ? <Trophy className="h-5 w-5 text-amber-400" /> : <Sparkles className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                {isAllCompleted
                  ? 'Parabéns! Sua rotina está 100% pronta 🎯'
                  : 'Primeiros Passos: Ative sua Preparação de Alta Performance'}
              </h2>
              <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {completedCount} de {steps.length} concluídos
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAllCompleted
                ? 'Todos os módulos integrados. Bons estudos e foco na aprovação!'
                : 'Complete os 3 passos para desbloquear o ciclo de estudos e o tutor no celular.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMinimized}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={minimized ? 'Expandir checklist' : 'Minimizar checklist'}
          >
            {minimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          {isAllCompleted && (
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Dispensar aviso"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span className="font-medium text-foreground">Progresso de Ativação</span>
          <span className="font-mono font-bold text-primary">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-primary to-amber-500 shadow-sm"
          />
        </div>
      </div>

      {/* Steps List */}
      <AnimatePresence>
        {!minimized && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 space-y-3"
          >
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const ActionIcon = step.actionIcon;

              return (
                <div
                  key={step.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 transition-all ${
                    step.completed
                      ? 'border-emerald-500/20 bg-emerald-500/5'
                      : 'border-border/80 bg-card/60 hover:border-primary/30 hover:bg-card'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {step.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/60" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-semibold ${
                            step.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`}
                        >
                          {step.title}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-amber-400/90 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                          {step.badge}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 self-end sm:self-center">
                    {step.completed ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <Check className="h-3.5 w-3.5" /> Concluído
                      </span>
                    ) : step.action ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={step.action}
                        className="gap-1.5 text-xs font-semibold shadow-sm active:scale-95 transition-all"
                      >
                        <ActionIcon className="h-3.5 w-3.5" />
                        {step.actionLabel}
                      </Button>
                    ) : step.href ? (
                      <Link href={step.href}>
                        <Button
                          size="sm"
                          variant="primary"
                          className="gap-1.5 text-xs font-semibold shadow-sm active:scale-95 transition-all"
                        >
                          <ActionIcon className="h-3.5 w-3.5" />
                          {step.actionLabel}
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
