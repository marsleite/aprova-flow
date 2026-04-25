'use client';

import { startTransition, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  AlertTriangle,
  Award,
  BarChart2,
  BookOpen,
  ChevronRight,
  Clock,
  Filter,
  Lock,
  Search,
  Sparkles,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { getAccuracyAnalytics, getAvailableSubjects, listExamsByPlan } from '@/lib/firebase/questions';
import { getBetaUpgradeNarrative } from '@/lib/beta-plan-presentation';
import { useEntitlements } from '@/hooks/useEntitlements';
import { buildSimulationOverview, resolveProvasTab, type ProvasTab } from '@/lib/provas/overview';
import TrackedUpgradeLink from '@/components/TrackedUpgradeLink';
import type { ExamMetadata, SubjectAccuracy } from '@/types';
import { Badge, Button, ChartCard, KPICard } from '@/components';
import { FeatureCode } from '@aprovamind/domain';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      delay: i * 0.07,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
};

function getAccuracyColor(acc: number) {
  if (acc >= 80) {
    return {
      text: 'text-green-500',
      bar: 'bg-green-500',
      label: 'Excelente',
    };
  }

  if (acc >= 65) {
    return {
      text: 'text-primary',
      bar: 'bg-primary',
      label: 'Bom',
    };
  }

  if (acc >= 50) {
    return {
      text: 'text-am-warning',
      bar: 'bg-am-warning',
      label: 'Regular',
    };
  }

  return {
    text: 'text-am-error',
    bar: 'bg-am-error',
    label: 'Critico',
  };
}

function buildNextSimulationStep(params: {
  canCreateSimulados: boolean;
  hasTreinoData: boolean;
  weakestSubject: SubjectAccuracy | null;
  criticalSubjects: number;
}) {
  if (!params.hasTreinoData) {
    return {
      title: 'Comece por uma prova oficial',
      description:
        'As leituras desta aba aparecem quando voce resolve provas oficiais, treinos rapidos ou simulados. Gere a primeira base antes de cobrar uma analise mais sofisticada.',
      ctaLabel: 'Abrir banco oficial',
      ctaTab: 'oficiais' as ProvasTab,
      ctaHref: null,
    };
  }

  if (params.canCreateSimulados) {
    if (params.criticalSubjects > 0 && params.weakestSubject) {
      return {
        title: `Recalibre ${params.weakestSubject.subject}`,
        description:
          'Seu proximo melhor movimento e revisar o ponto de maior atrito e, em seguida, montar um simulado direcionado para verificar se a correcao segurou.',
        ctaLabel: 'Criar simulado',
        ctaTab: null,
        ctaHref: '/provas/criar-simulado',
      };
    }

    return {
      title: 'Hora de um simulado direcionado',
      description:
        'Voce ja tem massa critica suficiente para sair do banco oficial e transformar essa leitura em treino mais focado por materia, banca ou dificuldade.',
      ctaLabel: 'Criar simulado',
      ctaTab: null,
      ctaHref: '/provas/criar-simulado',
    };
  }

  return {
    title: 'O Pro libera o treino direcionado',
    description:
      'Seu historico ja permite uma leitura mais seria. O proximo passo comercial natural e destravar simulados personalizados para transformar diagnostico em treino.',
    ctaLabel: getBetaUpgradeNarrative('pro').ctaLabel,
    ctaTab: null,
    ctaHref: '/settings',
  };
}

export default function ProvasPage() {
  const { user } = useAuthContext();
  const { capabilities, planTier } = useEntitlements(user?.uid, user?.email);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = resolveProvasTab(searchParams.get('tab'));
  const [exams, setExams] = useState<ExamMetadata[]>([]);
  const [accuracyData, setAccuracyData] = useState<SubjectAccuracy[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingSimulationInsights, setLoadingSimulationInsights] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBanca, setSelectedBanca] = useState('todas');
  const [selectedYear, setSelectedYear] = useState('todos');
  const [selectedDuration, setSelectedDuration] = useState('todas');
  const [selectedQuestionCount, setSelectedQuestionCount] = useState('todas');

  useEffect(() => {
    if (!user) {
      setExams([]);
      setAccuracyData([]);
      setLoadingExams(false);
      setLoadingSimulationInsights(false);
      return;
    }

    let cancelled = false;

    async function loadPageData() {
      setLoadingExams(true);
      setLoadingSimulationInsights(true);

      try {
        const [nextExams, analytics] = await Promise.all([
          listExamsByPlan(),
          getAccuracyAnalytics(user.uid),
        ]);

        if (!cancelled) {
          setExams(nextExams);
          setAccuracyData(analytics.month);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Erro ao carregar provas ou sinais de simulados:', error);
          setExams([]);
          setAccuracyData([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingExams(false);
          setLoadingSimulationInsights(false);
        }
      }
    }

    void loadPageData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const bancaOptions = Array.from(
    new Set(exams.map((exam) => exam.banca).filter((banca): banca is string => !!banca))
  ).sort();

  const yearOptions = Array.from(
    new Set(exams.map((exam) => exam.year).filter((year): year is number => typeof year === 'number'))
  ).sort((a, b) => b - a);

  const filteredExams = exams.filter((exam) => {
    const nameMatch = exam.name.toLowerCase().includes(searchTerm.trim().toLowerCase());
    const bancaMatch = selectedBanca === 'todas' || exam.banca === selectedBanca;
    const yearMatch = selectedYear === 'todos' || String(exam.year) === selectedYear;
    const duration = exam.durationMinutes ?? null;
    const durationMatch =
      selectedDuration === 'todas'
      || (selectedDuration === 'ate120' && duration !== null && duration <= 120)
      || (selectedDuration === '121a240' && duration !== null && duration > 120 && duration <= 240)
      || (selectedDuration === 'mais240' && duration !== null && duration > 240)
      || (selectedDuration === 'semDuracao' && duration === null);
    const count = exam.questions?.length || 0;
    const questionMatch =
      selectedQuestionCount === 'todas'
      || (selectedQuestionCount === 'ate50' && count <= 50)
      || (selectedQuestionCount === '51a100' && count > 50 && count <= 100)
      || (selectedQuestionCount === 'mais100' && count > 100);

    return nameMatch && bancaMatch && yearMatch && durationMatch && questionMatch;
  });

  const simulationOverview = buildSimulationOverview(accuracyData);
  const nextSimulationStep = buildNextSimulationStep({
    canCreateSimulados: capabilities.canCreateSimulados,
    hasTreinoData: simulationOverview.hasData,
    weakestSubject: simulationOverview.weakestSubject,
    criticalSubjects: simulationOverview.criticalSubjects,
  });

  function handleTabChange(tab: ProvasTab) {
    if (tab === activeTab) return;

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (tab === 'oficiais') {
        params.delete('tab');
      } else {
        params.set('tab', tab);
      }

      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    });
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="font-mono text-muted-foreground">Faca login para acessar as provas</p>
      </div>
    );
  }

  const tabs: { key: ProvasTab; label: string }[] = [
    { key: 'oficiais', label: 'Provas Oficiais' },
    { key: 'simulados', label: 'Simulados' },
    { key: 'treino', label: 'Treino Rapido' },
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-4 border-b border-border bg-card/30 px-6 py-6 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2.5">
            <Target className="h-3.5 w-3.5" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
              Centro de Provas
            </span>
          </div>
          <h1 className="font-sans text-am-h2 font-bold leading-[1.1] tracking-tight text-foreground md:text-[42px]">
            Provas, Simulados e Treino Rapido
          </h1>
          <p className="mt-4 max-w-2xl text-am-body-sm leading-relaxed text-muted-foreground">
            Um unico hub para banco oficial, leitura de desempenho e simulados customizados.
            O objetivo aqui e sair da descoberta para a execucao sem depender de memoria de rotas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Hub canonico</Badge>
          <Badge variant="outline">
            {simulationOverview.hasData ? 'Leitura ativa' : 'Leitura em construicao'}
          </Badge>
        </div>
      </div>

      <div className="relative border-b border-border px-6">
        <div className="mx-auto flex max-w-7xl gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`relative whitespace-nowrap px-5 py-3.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="provas-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: 'var(--primary)' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6 px-6">
        {activeTab === 'oficiais' && (
          <div className="space-y-5">
            <div className="flex flex-col gap-2">
              <h2 className="font-sans text-lg font-bold text-foreground">Provas Disponiveis</h2>
              {!loadingExams && exams.length > 0 && (
                <p className="font-mono text-xs text-muted-foreground">
                  Mostrando {filteredExams.length} de {exams.length} provas
                </p>
              )}
            </div>

            <motion.div
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Filtros
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar prova..."
                    className="w-full rounded-full border border-border bg-card py-2.5 pl-9 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-[#666] focus:border-primary/50 focus:ring-1 focus:ring-[var(--primary)]/30"
                  />
                </div>

                <select
                  value={selectedBanca}
                  onChange={(event) => setSelectedBanca(event.target.value)}
                  className="w-full appearance-none rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-[var(--primary)]/30"
                >
                  <option value="todas">Todas as bancas</option>
                  {bancaOptions.map((banca) => (
                    <option key={banca} value={banca}>
                      {banca}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(event) => setSelectedYear(event.target.value)}
                  className="w-full appearance-none rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-[var(--primary)]/30"
                >
                  <option value="todos">Todos os anos</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedDuration}
                  onChange={(event) => setSelectedDuration(event.target.value)}
                  className="w-full appearance-none rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-[var(--primary)]/30"
                >
                  <option value="todas">Qualquer duracao</option>
                  <option value="ate120">Ate 120 min</option>
                  <option value="121a240">121 a 240 min</option>
                  <option value="mais240">Acima de 240 min</option>
                  <option value="semDuracao">Sem duracao definida</option>
                </select>

                <div className="flex gap-2">
                  <select
                    value={selectedQuestionCount}
                    onChange={(event) => setSelectedQuestionCount(event.target.value)}
                    className="w-full appearance-none rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-[var(--primary)]/30"
                  >
                    <option value="todas">N de questoes</option>
                    <option value="ate50">Ate 50</option>
                    <option value="51a100">51 a 100</option>
                    <option value="mais100">Mais de 100</option>
                  </select>

                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedBanca('todas');
                      setSelectedYear('todos');
                      setSelectedDuration('todas');
                      setSelectedQuestionCount('todas');
                    }}
                    className="flex shrink-0 items-center justify-center rounded-full border border-border bg-card px-3 py-2 text-muted-foreground transition-all hover:bg-muted-foreground/10 hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>

            {loadingExams ? (
              <div className="flex items-center justify-center py-16">
                <div
                  className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full"
                  style={{ background: 'var(--primary)' }}
                >
                  <Zap className="h-6 w-6 text-foreground" />
                </div>
              </div>
            ) : exams.length === 0 ? (
              <div className="rounded-2xl border border-border py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/10">
                  <BookOpen className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-am-body-sm leading-relaxed text-muted-foreground">
                  Nenhuma prova disponivel ainda.
                </p>
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="rounded-2xl border border-border py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/10">
                  <BookOpen className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="font-sans text-sm text-foreground">Nenhuma prova encontrada</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  Ajuste os filtros para ver mais resultados.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredExams.map((exam, index) => (
                  <motion.div
                    key={exam.id}
                    custom={index + 1}
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                  >
                    <ExamCard exam={exam} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'simulados' && (
          <div className="space-y-6">
            <motion.div
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="rounded-2xl border border-border bg-card p-6"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <div className="mb-3 flex items-center gap-2">
                    <Badge variant="outline">Simulados</Badge>
                    <Badge variant="outline">Fluxo unificado</Badge>
                  </div>
                  <h2 className="font-sans text-2xl font-bold tracking-tight text-foreground">
                    O treino agora parte do mesmo hub
                  </h2>
                  <p className="mt-3 text-am-body-sm leading-relaxed text-muted-foreground">
                    Resolva provas oficiais, leia os sinais do seu desempenho aqui e avance
                    para simulados customizados sem sair da mesma area.
                  </p>
                  <p className="mt-3 text-am-body-sm leading-relaxed text-muted-foreground">
                    {simulationOverview.hasData
                      ? 'Esta leitura usa sua atividade recente para mostrar onde o simulado deve entrar como treino direcionado.'
                      : 'As leituras abaixo aparecem quando voce acumula historico suficiente em provas e questoes. Ate la, o banco oficial e o melhor primeiro passo.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => handleTabChange('oficiais')}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Banco Oficial
                  </Button>
                  {capabilities.canCreateSimulados ? (
                    <Button asChild size="sm">
                      <Link href="/provas/criar-simulado">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Criar Simulado
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild variant="outline" size="sm">
                      <TrackedUpgradeLink
                        href="/settings"
                        surface="provas_simulado_locked_cta"
                        recommendedPlan="pro"
                        currentPlan={planTier}
                        featureCode={FeatureCode.SimulationsCustom}
                        eventMetadata={{ title: 'Entender acesso beta' }}
                      >
                        <Lock className="mr-2 h-4 w-4" />
                        Entender acesso beta
                      </TrackedUpgradeLink>
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-4 lg:grid-cols-4"
            >
              <KPICard
                title="Precisao no mes"
                value={`${simulationOverview.avgAccuracy}%`}
                icon={Target}
                loading={loadingSimulationInsights}
              />
              <KPICard
                title="Materias mapeadas"
                value={simulationOverview.trackedSubjects}
                icon={BookOpen}
                loading={loadingSimulationInsights}
              />
              <KPICard
                title="Questoes recentes"
                value={simulationOverview.totalQuestions.toLocaleString()}
                icon={BarChart2}
                loading={loadingSimulationInsights}
              />
              <KPICard
                title="Alertas criticos"
                value={simulationOverview.criticalSubjects}
                icon={AlertTriangle}
                loading={loadingSimulationInsights}
              />
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-3">
              <motion.div
                custom={2}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="lg:col-span-2"
              >
                <ChartCard
                  title="Leitura de treino"
                  subtitle="volume recente e foco para o proximo simulado"
                  loading={loadingSimulationInsights}
                  height="auto"
                >
                  {simulationOverview.hasData ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-md border border-border bg-muted/50 p-4">
                          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                            Maior atencao
                          </p>
                          <p className="mt-2 font-sans text-am-body font-bold text-foreground">
                            {simulationOverview.weakestSubject?.subject || 'Sem sinal'}
                          </p>
                          <p className="mt-1 text-am-body-sm text-muted-foreground">
                            {simulationOverview.weakestSubject
                              ? `${simulationOverview.weakestSubject.accuracy}% de acerto em ${simulationOverview.weakestSubject.totalQuestions} questoes.`
                              : 'Ainda nao ha volume suficiente para apontar atrito recorrente.'}
                          </p>
                        </div>

                        <div className="rounded-md border border-border bg-muted/50 p-4">
                          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                            Melhor base atual
                          </p>
                          <p className="mt-2 font-sans text-am-body font-bold text-foreground">
                            {simulationOverview.strongestSubject?.subject || 'Sem sinal'}
                          </p>
                          <p className="mt-1 text-am-body-sm text-muted-foreground">
                            {simulationOverview.strongestSubject
                              ? `${simulationOverview.strongestSubject.accuracy}% de acerto com leitura mais estavel para treino cronometrado.`
                              : 'Quando houver historico, esta area destaca onde voce ja tem base mais confiavel.'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {simulationOverview.topSubjects.map((subject) => {
                          const color = getAccuracyColor(subject.accuracy);

                          return (
                            <div key={subject.subject} className="group">
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-am-body-sm font-medium text-foreground">
                                    {subject.subject}
                                  </p>
                                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                                    {subject.totalQuestions} questoes recentes
                                  </p>
                                </div>
                                <span className={`text-sm font-bold ${color.text}`}>
                                  {subject.accuracy}%
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${subject.accuracy}%` }}
                                  transition={{ duration: 0.8, delay: 0.1 }}
                                  className={`h-full rounded-full ${color.bar}`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-border bg-muted/30 p-6 text-center">
                      <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                      <p className="text-am-body-sm text-foreground">
                        Ainda nao ha leitura suficiente para simulados orientados.
                      </p>
                      <p className="mt-2 text-am-body-sm leading-relaxed text-muted-foreground">
                        Resolva uma prova oficial ou use o treino rapido para popular este quadro
                        com dados reais antes de cobrar um diagnostico mais forte.
                      </p>
                    </div>
                  )}
                </ChartCard>
              </motion.div>

              <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show">
                <ChartCard
                  title="Proximo melhor movimento"
                  subtitle="o que fazer agora"
                  loading={loadingSimulationInsights}
                  height="auto"
                >
                  <div className="space-y-4">
                    <div className="rounded-md border border-border bg-muted/50 p-4">
                      <p className="font-sans text-am-body font-bold text-foreground">
                        {nextSimulationStep.title}
                      </p>
                      <p className="mt-2 text-am-body-sm leading-relaxed text-muted-foreground">
                        {nextSimulationStep.description}
                      </p>
                    </div>

                    {nextSimulationStep.ctaHref ? (
                      <Button asChild className="w-full">
                        <Link href={nextSimulationStep.ctaHref}>
                          {nextSimulationStep.ctaLabel}
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    ) : (
                      <Button className="w-full" onClick={() => handleTabChange(nextSimulationStep.ctaTab || 'oficiais')}>
                        {nextSimulationStep.ctaLabel}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}

                    <div className="rounded-md border border-border bg-card p-4">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                        Regra de leitura
                      </p>
                      <p className="mt-2 text-am-body-sm leading-relaxed text-muted-foreground">
                        Banco oficial gera a base. Simulado entra quando a leitura ja consegue
                        apontar onde vale testar ritmo, foco ou recuperacao.
                      </p>
                    </div>
                  </div>
                </ChartCard>
              </motion.div>
            </div>
          </div>
        )}

        {activeTab === 'treino' && (
          capabilities.canUseTreinoRapido ? (
            <TreinoRapidoTab />
          ) : (
            <div className="rounded-2xl border border-[var(--primary)]/20 p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <p className="font-sans text-sm font-semibold text-foreground">
                Treino rapido — Pro/Premium
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function TreinoRapidoTab() {
  const [materias, setMaterias] = useState<string[]>([]);
  const [selectedMateria, setSelectedMateria] = useState<string>('');
  const [questionCount, setQuestionCount] = useState(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadMaterias() {
      setLoading(true);

      try {
        const subjects = await getAvailableSubjects();
        if (!cancelled) {
          setMaterias(subjects);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Erro ao carregar materias:', error);
          setMaterias([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMaterias();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleStart = () => {
    console.log('Iniciar treino:', { materia: selectedMateria, count: questionCount });
    alert('Funcionalidade de treino rapido sera implementada em breve!');
  };

  return (
    <div className="space-y-5">
      <h2 className="font-sans text-lg font-bold text-foreground">Treino por Materia</h2>
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="mb-6 text-am-body-sm leading-relaxed text-muted-foreground">
          Selecione os filtros e comece a resolver questoes com correcao imediata.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div
              className="flex h-10 w-10 animate-pulse items-center justify-center rounded-full"
              style={{ background: 'var(--primary)' }}
            >
              <Zap className="h-5 w-5 text-foreground" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                Materia
              </label>
              <select
                value={selectedMateria}
                onChange={(event) => setSelectedMateria(event.target.value)}
                className="w-full appearance-none rounded-full border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-[var(--primary)]/30"
              >
                <option value="">Todas</option>
                {materias.map((materia) => (
                  <option key={materia} value={materia}>
                    {materia}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                Quantidade de questoes
              </label>
              <input
                type="number"
                value={questionCount}
                onChange={(event) => setQuestionCount(Number(event.target.value))}
                min={1}
                max={50}
                className="w-full rounded-full border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-[var(--primary)]/30"
              />
            </div>

            <button
              onClick={handleStart}
              className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-6 py-3.5 text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-all hover:bg-primary/90"
            >
              <Target className="h-4 w-4" />
              Comecar treino
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ExamCard({ exam }: { exam: ExamMetadata }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:bg-card">
      <h3 className="mb-3 font-sans text-base font-bold text-foreground">{exam.name}</h3>

      <div className="mb-5 space-y-2">
        {exam.banca && (
          <div className="mt-4 flex items-center gap-2 text-am-body-sm leading-relaxed text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">{exam.banca}</span>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 text-am-body-sm leading-relaxed text-muted-foreground">
          <Award className="h-3.5 w-3.5" />
          <span className="font-mono text-xs">{exam.questions?.length || 0} questoes</span>
        </div>

        {exam.durationMinutes && (
          <div className="mt-4 flex items-center gap-2 text-am-body-sm leading-relaxed text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">{exam.durationMinutes} minutos</span>
          </div>
        )}
      </div>

      <Link
        href={`/provas/${exam.id}/executar`}
        className="block w-full rounded-sm bg-primary px-4 py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-all hover:bg-primary/90"
      >
        Iniciar prova
      </Link>
    </div>
  );
}
