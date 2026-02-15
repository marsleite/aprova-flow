/**
 * Card do Mentor AprovaFlow — Motor de regras local
 *
 * Análise 100% local (zero chamadas à IA):
 * - Equilíbrio de matérias (plano vs real)
 * - Detecção de fadiga (queda de horas)
 * - Cruzamento constância × precisão
 * - Ação imediata personalizada
 * - Frases motivacionais rotativas
 *
 * A UI permanece idêntica à versão anterior.
 */

'use client';

import { useMemo } from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Zap,
  Quote,
  ChevronDown,
  ChevronUp,
  Coffee,
  Target,
} from 'lucide-react';
import {
  StudyConsistency,
  SubjectHours,
  PlanVsActual,
  DailyHours,
  StudySession,
  SubjectAccuracy,
} from '@/types';

// ============================================================
// Tipos
// ============================================================

interface MentorCardProps {
  userName: string;
  consistency: StudyConsistency | null;
  subjectHours: SubjectHours[];
  planVsActual: PlanVsActual[];
  totalTodaySeconds: number;
  todayDominantSubject: string | null;
  weeklyData: DailyHours[];
  recentSessions: StudySession[];
  accuracyData?: SubjectAccuracy[];
  activePlanName?: string | null;
  loading?: boolean;
}

interface MentorAnalysis {
  analysis: string;
  performanceInsight: string | null;
  fatigueAlert: string | null;
  immediateAction: string;
  motivationalQuote: string;
}

// ============================================================
// Frases motivacionais (rotativas por dia/streak)
// ============================================================

const MOTIVATIONAL_QUOTES = [
  'Constância bate talento. Sua vaga está sendo construída agora.',
  'Cada hora de estudo é um tijolo na parede da sua aprovação.',
  'O edital não perdoa quem para. Continue.',
  'Quem estuda todo dia já está à frente de 80% dos concorrentes.',
  'A posse não é sorte — é consequência de disciplina.',
  'Seu futuro eu está orgulhoso do esforço de hoje.',
  'Não existe dia desperdiçado quando se estuda com propósito.',
  'A prova cobra o que você praticou, não o que você leu uma vez.',
  'O segredo da aprovação é simples: não parar.',
  'Disciplina é escolher entre o que você quer agora e o que você mais quer.',
  'Matéria difícil é matéria que te diferencia dos outros candidatos.',
  'Cada questão errada é um aprendizado que seu concorrente não teve.',
  'A constância transforma esforço em resultado. Continue firme.',
  'Aprovação não é destino — é construção diária.',
  'Quem domina o edital, domina a prova.',
  'O concurso é uma maratona. Ritmo constante vence corrida rápida.',
  'Estude como se a vaga dependesse de hoje. Porque depende.',
  'A dor da disciplina é leve perto da dor do arrependimento.',
  'Grandes aprovações nascem de pequenas sessões diárias.',
  'O cronômetro não mente. Cada minuto conta.',
];

// ============================================================
// Motor de regras local
// ============================================================

function buildLocalAnalysis(props: {
  userName: string;
  consistency: StudyConsistency;
  subjectHours: SubjectHours[];
  planVsActual: PlanVsActual[];
  totalTodaySeconds: number;
  todayDominantSubject: string | null;
  weeklyData: DailyHours[];
  recentSessions: StudySession[];
  accuracyData?: SubjectAccuracy[];
  activePlanName?: string | null;
}): MentorAnalysis {
  const {
    consistency,
    subjectHours,
    planVsActual,
    weeklyData,
    accuracyData,
    totalTodaySeconds,
    todayDominantSubject,
  } = props;

  // ---- 1. Análise de equilíbrio ----
  const neglected = planVsActual.filter((p) => p.status === 'neglected');
  const over = planVsActual.filter((p) => p.status === 'over');
  const weeklyHours = consistency.weeklyTotalSeconds / 3600;
  const progressPct = consistency.weeklyProgressPercent;
  const todayMin = Math.round(totalTodaySeconds / 60);

  const analysisParts: string[] = [];

  // Progresso da meta semanal
  if (progressPct >= 100) {
    analysisParts.push(
      `Parabéns! Você já atingiu ${progressPct}% da meta semanal (${weeklyHours.toFixed(1)}h de ${consistency.weeklyGoalHours}h).`
    );
  } else if (progressPct >= 70) {
    analysisParts.push(
      `Bom ritmo — ${progressPct}% da meta semanal alcançada (${weeklyHours.toFixed(1)}h de ${consistency.weeklyGoalHours}h). Faltam ${((consistency.weeklyGoalHours - weeklyHours)).toFixed(1)}h.`
    );
  } else if (progressPct > 0) {
    analysisParts.push(
      `Atenção: apenas ${progressPct}% da meta semanal (${weeklyHours.toFixed(1)}h de ${consistency.weeklyGoalHours}h). Acelere o ritmo para não ficar para trás.`
    );
  } else {
    analysisParts.push(
      `Nenhum estudo registrado esta semana ainda. A meta é ${consistency.weeklyGoalHours}h — comece agora.`
    );
  }

  // Streak
  if (consistency.currentStreak >= 7) {
    analysisParts.push(`Streak impressionante de ${consistency.currentStreak} dias consecutivos!`);
  } else if (consistency.currentStreak >= 3) {
    analysisParts.push(`${consistency.currentStreak} dias seguidos de estudo — bom ritmo.`);
  }

  // Matérias negligenciadas
  if (neglected.length > 0) {
    const names = neglected.slice(0, 3).map((n) => n.subject).join(', ');
    analysisParts.push(
      `${neglected.length === 1 ? 'Matéria negligenciada' : 'Matérias negligenciadas'}: ${names}. Concurso se ganha nas matérias que incomodam.`
    );
  }

  // Matérias com excesso
  if (over.length > 0 && neglected.length > 0) {
    const overName = over[0].subject;
    analysisParts.push(
      `Você está dedicando tempo demais a ${overName}. Redistribua para as matérias defasadas.`
    );
  }

  const analysis = analysisParts.join(' ');

  // ---- 2. Detecção de fadiga ----
  let fatigueAlert: string | null = null;
  const pastDays = weeklyData.filter((d) => !d.isToday && d.hours > 0);
  if (pastDays.length >= 3) {
    const recent3 = pastDays.slice(-3);
    const earlier = pastDays.slice(0, Math.max(1, pastDays.length - 3));
    const recentAvg = recent3.reduce((a, b) => a + b.hours, 0) / recent3.length;
    const earlierAvg = earlier.reduce((a, b) => a + b.hours, 0) / earlier.length;

    if (earlierAvg > 0 && recentAvg < earlierAvg * 0.7) {
      fatigueAlert =
        `Suas horas caíram nos últimos dias (média de ${recentAvg.toFixed(1)}h vs ${earlierAvg.toFixed(1)}h antes). Considere uma sessão leve de revisão ou descanse para recarregar.`;
    }
  }

  // Sessão longa hoje (>3h)
  if (todayMin > 180 && !fatigueAlert) {
    fatigueAlert =
      `Você já estudou ${Math.round(todayMin / 60)}h hoje. Pausas estratégicas preservam a qualidade do estudo — considere um intervalo.`;
  }

  // ---- 3. Cruzamento constância × precisão ----
  let performanceInsight: string | null = null;

  if (accuracyData && accuracyData.length > 0 && subjectHours.length > 0) {
    // Mapeia horas por matéria para lookup rápido
    const hoursMap = new Map(subjectHours.map((s) => [s.subject, s.hours]));

    // Encontra matéria mais crítica
    let critical: {
      subject: string;
      hours: number;
      accuracy: number;
      type: 'high-hours-low-acc' | 'low-hours-high-acc' | 'low-both' | 'high-both' | 'no-questions';
    } | null = null;

    for (const acc of accuracyData) {
      const hours = hoursMap.get(acc.subject) ?? 0;
      const isHighHours = hours >= 2;
      const isHighAcc = acc.accuracy >= 70;
      const isLowAcc = acc.accuracy < 60;

      if (isHighHours && isLowAcc) {
        if (!critical || critical.type !== 'high-hours-low-acc' || acc.accuracy < critical.accuracy) {
          critical = { subject: acc.subject, hours, accuracy: acc.accuracy, type: 'high-hours-low-acc' };
        }
      } else if (!isHighHours && isHighAcc && (!critical || critical.type === 'low-hours-high-acc')) {
        critical = { subject: acc.subject, hours, accuracy: acc.accuracy, type: 'low-hours-high-acc' };
      } else if (!isHighHours && isLowAcc && !critical) {
        critical = { subject: acc.subject, hours, accuracy: acc.accuracy, type: 'low-both' };
      }
    }

    // Matérias com muitas horas mas sem questões
    const subjectsWithQuestions = new Set(accuracyData.map((a) => a.subject));
    const noQuestions = subjectHours
      .filter((s) => s.hours >= 3 && !subjectsWithQuestions.has(s.subject))
      .sort((a, b) => b.hours - a.hours);

    if (critical?.type === 'high-hours-low-acc') {
      performanceInsight =
        `${critical.subject}: ${critical.hours.toFixed(1)}h de estudo mas apenas ${critical.accuracy}% de acerto. O esforço não está se convertendo em resultado — foque em questões comentadas e revise a teoria.`;
    } else if (critical?.type === 'low-both') {
      performanceInsight =
        `Sinal vermelho em ${critical.subject}: poucas horas e acerto de ${critical.accuracy}%. Aumente as horas e revise a teoria desta matéria urgentemente.`;
    } else if (critical?.type === 'low-hours-high-acc') {
      performanceInsight =
        `${critical.subject}: bom acerto (${critical.accuracy}%), mas poucas horas (${critical.hours.toFixed(1)}h). Aumente o volume para cobrir todos os tópicos do edital.`;
    } else if (noQuestions.length > 0) {
      performanceInsight =
        `Você tem ${noQuestions[0].hours.toFixed(1)}h em ${noQuestions[0].subject} mas nenhuma questão registrada. Faça questões para validar se o estudo está se convertendo em aprendizado.`;
    } else {
      // Tudo ok
      const bestAcc = accuracyData.reduce((best, a) => (a.accuracy > best.accuracy ? a : best), accuracyData[0]);
      if (bestAcc.accuracy >= 80) {
        performanceInsight =
          `Domínio em ${bestAcc.subject} (${bestAcc.accuracy}% de acerto). Avance para questões mais complexas ou simulados cronometrados.`;
      }
    }
  } else if (subjectHours.length > 0 && (!accuracyData || accuracyData.length === 0)) {
    performanceInsight =
      'Você tem horas de estudo registradas mas nenhuma questão resolvida. Comece a fazer questões para validar seu aprendizado.';
  }

  // ---- 4. Ação imediata ----
  let immediateAction: string;

  if (neglected.length > 0 && accuracyData) {
    const neglectedWithAcc = neglected.map((n) => {
      const acc = accuracyData.find((a) => a.subject === n.subject);
      return { ...n, accuracy: acc?.accuracy ?? null };
    });
    // Prioriza negligenciada com pior acerto
    neglectedWithAcc.sort((a, b) => (a.accuracy ?? 999) - (b.accuracy ?? 999));
    const target = neglectedWithAcc[0];
    if (target.accuracy !== null && target.accuracy < 60) {
      immediateAction = `Abra ${target.subject} e faça 30 min de questões comentadas. Acerto atual: ${target.accuracy}% — foque na teoria antes de avançar.`;
    } else {
      immediateAction = `Dedique 45 min a ${target.subject} agora. Esta matéria está ${Math.abs(target.deviation)}% abaixo do planejado.`;
    }
  } else if (neglected.length > 0) {
    immediateAction = `Dedique 45 min a ${neglected[0].subject} agora. Esta matéria está negligenciada no seu plano.`;
  } else if (todayMin === 0) {
    const suggestion = todayDominantSubject
      ? todayDominantSubject
      : subjectHours.length > 0
        ? subjectHours[subjectHours.length - 1].subject
        : 'sua matéria mais fraca';
    immediateAction = `Você ainda não estudou hoje. Comece com 30 min de ${suggestion} para manter o streak.`;
  } else if (todayMin < 30) {
    immediateAction = `Boa — ${todayMin} min hoje. Faça mais 20 min para consolidar o dia.`;
  } else {
    immediateAction = `${todayMin} min hoje — bom trabalho. Finalize com uma revisão rápida de 15 min em flashcards ou questões.`;
  }

  // ---- 5. Frase motivacional (rotativa por dia do ano + streak) ----
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const quoteIndex =
    (dayOfYear + (consistency.currentStreak || 0)) % MOTIVATIONAL_QUOTES.length;
  const motivationalQuote = MOTIVATIONAL_QUOTES[quoteIndex];

  return {
    analysis,
    performanceInsight,
    fatigueAlert,
    immediateAction,
    motivationalQuote,
  };
}

// ============================================================
// Componente
// ============================================================

export default function MentorCard({
  userName,
  consistency,
  subjectHours,
  planVsActual,
  totalTodaySeconds,
  todayDominantSubject,
  weeklyData,
  recentSessions,
  accuracyData,
  activePlanName,
  loading: parentLoading,
}: MentorCardProps) {
  const [expanded, setExpanded] = useState(true);

  // Detecta se o usuário tem algum dado de estudo significativo
  const hasStudyData =
    (consistency?.weeklyTotalSeconds ?? 0) > 0 ||
    subjectHours.length > 0 ||
    recentSessions.length > 0;

  // Motor de regras local — recalcula quando props mudam
  const data = useMemo<MentorAnalysis | null>(() => {
    if (!consistency || !hasStudyData) return null;
    return buildLocalAnalysis({
      userName,
      consistency,
      subjectHours,
      planVsActual,
      totalTodaySeconds,
      todayDominantSubject,
      weeklyData,
      recentSessions,
      accuracyData,
      activePlanName,
    });
  }, [
    userName,
    consistency,
    subjectHours,
    planVsActual,
    totalTodaySeconds,
    todayDominantSubject,
    weeklyData,
    recentSessions,
    accuracyData,
    activePlanName,
    hasStudyData,
  ]);

  // ---- Skeleton ----
  if (parentLoading) {
    return (
      <div className="animate-pulse rounded-2xl border border-white/10 bg-gray-900/70 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gray-800" />
          <div className="h-5 w-40 rounded bg-gray-800" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-gray-800" />
          <div className="h-4 w-3/4 rounded bg-gray-800" />
          <div className="h-4 w-5/6 rounded bg-gray-800" />
        </div>
        <div className="mt-4 h-10 w-full rounded-xl bg-gray-800" />
      </div>
    );
  }

  // ---- Sem dados de estudo — mensagem de boas-vindas ----
  if (!hasStudyData || !data) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-gray-900 to-gray-950 p-5 shadow-2xl"
      >
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/5 blur-2xl" />
        <div className="mb-4 flex items-center gap-2.5">
          <div className="rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/20 p-2.5">
            <Shield className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <span className="text-sm font-semibold text-white">Mentor AprovaFlow</span>
            <p className="text-[11px] text-gray-500">Análise estratégica dos seus estudos</p>
          </div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
          <p className="text-sm leading-relaxed text-gray-300">
            Comece sua primeira sessão de estudo e eu vou analisar seu desempenho, identificar matérias que precisam de atenção e traçar a melhor estratégia para sua aprovação.
          </p>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-gray-800/30 px-3.5 py-3">
          <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <p className="text-xs text-gray-400">
            Inicie o cronômetro acima para registrar sua primeira sessão. Sua jornada até a posse começa agora.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-gray-900 to-gray-950 p-5 shadow-2xl"
    >
      {/* Decoração de fundo */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/5 blur-2xl" />
      <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-violet-500/5 blur-xl" />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/20 p-2.5">
              <Shield className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white">Mentor AprovaFlow</span>
              <p className="text-[11px] text-gray-500">Análise estratégica dos seus estudos</p>
            </div>
          </div>

          {/* Expand/Collapse */}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="rounded-lg p-1.5 text-gray-600 transition hover:bg-gray-800 hover:text-gray-400"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {/* Análise Estratégica */}
              <div className="mb-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                <p className="text-sm leading-relaxed text-gray-300">{data.analysis}</p>
              </div>

              {/* Performance Insight — Constância × Precisão */}
              {data.performanceInsight && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-3 flex items-start gap-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3.5 py-3"
                >
                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <div>
                    <span className="text-xs font-semibold text-cyan-300">Constância vs Precisão</span>
                    <p className="mt-0.5 text-sm leading-relaxed text-cyan-200/80">
                      {data.performanceInsight}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Alerta de Fadiga */}
              {data.fatigueAlert && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-3 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-3"
                >
                  <Coffee className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <div>
                    <span className="text-xs font-semibold text-amber-300">Alerta de Fadiga</span>
                    <p className="mt-0.5 text-sm leading-relaxed text-amber-200/80">
                      {data.fatigueAlert}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Ação Imediata */}
              <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3.5 py-3">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                <div>
                  <span className="text-xs font-semibold text-violet-300">Ação Imediata</span>
                  <p className="mt-0.5 text-sm leading-relaxed text-violet-200/80">
                    {data.immediateAction}
                  </p>
                </div>
              </div>

              {/* Frase Motivacional */}
              <div className="flex items-start gap-2 rounded-xl bg-gray-800/30 px-3.5 py-3">
                <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500" />
                <p className="text-xs italic leading-relaxed text-gray-400">
                  {data.motivationalQuote}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Frase motivacional compacta quando colapsado */}
        {!expanded && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs italic text-gray-500"
          >
            &ldquo;{data.motivationalQuote}&rdquo;
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
