'use client';

import Link from 'next/link';
import { CalendarDays, Gauge, Play } from 'lucide-react';

type StudyJourneyStep = 'planner' | 'dashboard' | 'engine';

interface StudyJourneyCardProps {
  current: StudyJourneyStep;
}

const STEP_ORDER: StudyJourneyStep[] = ['planner', 'dashboard', 'engine'];

const STEP_META: Record<
  StudyJourneyStep,
  {
    label: string;
    title: string;
    description: string;
    href: string;
    icon: typeof Gauge;
  }
> = {
  planner: {
    label: '1. Macro',
    title: 'Planner',
    description: 'Prazo, carga e viabilidade do edital',
    href: '/planner',
    icon: Gauge,
  },
  dashboard: {
    label: '2. Semana',
    title: 'Dashboard',
    description: 'Ritmo semanal e distribuição de foco',
    href: '/dashboard',
    icon: CalendarDays,
  },
  engine: {
    label: '3. Hoje',
    title: 'Engine',
    description: 'Execução do dia e registro real',
    href: '/engine',
    icon: Play,
  },
};

const HELPER_COPY: Record<StudyJourneyStep, string> = {
  planner:
    'Começamos no macro: aqui você define se o edital cabe no prazo e na sua rotina. Depois, o Dashboard distribui isso na semana.',
  dashboard:
    'Aqui o plano macro vira ritmo semanal. Depois, o Engine transforma essa leitura na melhor sessão para hoje.',
  engine:
    'Aqui você executa o dia com contexto do plano. Se precisar recalibrar prazo ou foco, volte ao Planner; se quiser revisar a semana, abra o Dashboard.',
};

export default function StudyJourneyCard({ current }: StudyJourneyCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-am-sm">
      <div className="mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Jornada Guiada
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{HELPER_COPY[current]}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {STEP_ORDER.map((step) => {
          const meta = STEP_META[step];
          const Icon = meta.icon;
          const isCurrent = step === current;

          return (
            <Link
              key={step}
              href={meta.href}
              className={`rounded-lg border px-4 py-3 transition-colors ${
                isCurrent
                  ? 'border-am-brand-primary/30 bg-primary/10'
                  : 'border-border bg-muted hover:border-am-brand-primary/20 hover:bg-card'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 rounded-md p-2 ${
                    isCurrent
                      ? 'bg-primary/15 text-primary'
                      : 'bg-card text-muted-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {meta.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{meta.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
