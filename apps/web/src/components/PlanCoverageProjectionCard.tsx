'use client';

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  Gauge,
  PencilLine,
  Target,
} from 'lucide-react';
import type { StudyPlanEdital } from '@/types';
import { getStudyPlanCoverageProjection } from '@/lib/plans/studyCapacity';

interface PlanCoverageProjectionCardProps {
  plan: StudyPlanEdital | null;
  onEdit?: () => void;
}

const STATUS_STYLE = {
  missing_deadline: {
    label: 'Falta prazo',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  missing_workload: {
    label: 'Falta carga',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  healthy: {
    label: 'Viavel',
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  },
  attention: {
    label: 'Ajustar meta',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  critical: {
    label: 'Critico',
    badge: 'bg-red-500/10 text-red-300 border-red-500/30',
  },
} as const;

function formatDate(dateISO: string | null | undefined): string {
  if (!dateISO) return 'Nao definida';
  const [year, month, day] = dateISO.split('-');
  if (!year || !month || !day) return dateISO;
  return `${day}/${month}/${year}`;
}

function formatHours(value: number | null | undefined): string {
  if (value == null) return '--';
  return `${value.toFixed(1)}h`;
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return '--';
  return `${Math.round(value)}%`;
}

export default function PlanCoverageProjectionCard({
  plan,
  onEdit,
}: PlanCoverageProjectionCardProps) {
  const projection = getStudyPlanCoverageProjection(plan);
  const statusStyle = STATUS_STYLE[projection.status];

  const helperMessage =
    projection.status === 'missing_deadline'
      ? 'Defina a data da prova para o app projetar quanto precisa caber por semana.'
      : projection.status === 'missing_workload'
        ? 'Defina a carga estimada do material para saber se o plano fecha ate a prova.'
        : projection.status === 'critical'
          ? 'Mesmo com a sua disponibilidade atual, a cobertura fica curta. Precisamos reduzir escopo ou aumentar horas.'
          : projection.status === 'attention'
            ? 'A sua disponibilidade comporta o plano, mas a meta semanal atual ainda esta abaixo do ritmo necessario.'
            : 'O ritmo planejado esta coerente com a disponibilidade e o prazo atual.';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="rounded-xl border border-border bg-card p-6 shadow-am-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            <h3 className="font-sans text-am-h5 font-bold tracking-tight text-foreground">
              Viabilidade do Plano
            </h3>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {plan
              ? `Projecao macro do edital ${plan.name}, combinando prazo, capacidade real e carga de material.`
              : 'Selecione um edital para projetar se o plano atual cabe no prazo e na sua rotina.'}
          </p>
        </div>

        {plan && (
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle.badge}`}
            >
              {statusStyle.label}
            </span>
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              >
                <PencilLine className="h-3.5 w-3.5" />
                Ajustar plano
              </button>
            )}
          </div>
        )}
      </div>

      {!plan ? (
        <div className="mt-5 rounded-xl border border-border bg-muted px-4 py-5 text-sm text-muted-foreground">
          Ative um edital para ver a projeção. A partir daqui vamos usar a disponibilidade real do aluno, o prazo da prova e a carga estimada do material para montar um plano mais inteligente.
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted p-4">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <Clock3 className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Capacidade semanal</span>
              </div>
              <p className="text-2xl font-semibold text-foreground">
                {formatHours(projection.weeklyCapacityHours)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Hoje voce declarou {formatHours(projection.todayAvailableHours)} disponiveis.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted p-4">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <Target className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Ritmo necessario</span>
              </div>
              <p className="text-2xl font-semibold text-foreground">
                {formatHours(projection.requiredWeeklyHours)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Meta atual do plano: {formatHours(projection.plannedWeeklyHours)} por semana.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted p-4">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Prazo</span>
              </div>
              <p className="text-2xl font-semibold text-foreground">
                {projection.daysUntilExam != null ? `${projection.daysUntilExam}d` : '--'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Prova em {formatDate(plan.examDate)}.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted p-4">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Cobertura</span>
              </div>
              <p className="text-2xl font-semibold text-foreground">
                {formatPercent(projection.plannedCoveragePercent)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Maximo com sua disponibilidade: {formatPercent(projection.maximumCoveragePercent)}.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-muted p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-card px-3 py-1">
                Material: <strong className="text-foreground">{formatHours(projection.materialWorkloadHours)}</strong>
              </span>
              <span className="rounded-full bg-card px-3 py-1">
                Horas planejadas ate a prova: <strong className="text-foreground">{formatHours(projection.plannedHoursUntilExam)}</strong>
              </span>
              <span className="rounded-full bg-card px-3 py-1">
                Horas maximas disponiveis: <strong className="text-foreground">{formatHours(projection.availableHoursUntilExam)}</strong>
              </span>
              <span className="rounded-full bg-card px-3 py-1">
                Meta recomendada: <strong className="text-foreground">{formatHours(projection.recommendedWeeklyHours)}</strong>
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{helperMessage}</p>
          </div>
        </>
      )}
    </motion.div>
  );
}
