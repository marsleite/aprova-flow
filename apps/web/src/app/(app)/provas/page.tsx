'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { listExamsByPlan, getAvailableSubjects } from '@/lib/firebase/questions';
import { useEntitlements } from '@/hooks/useEntitlements';
import { ExamMetadata } from '@/types';
import { Clock, BookOpen, Award, Plus, Lock, ArrowLeft, Search, X, Target, Zap, Sparkles, Filter } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

type TabType = 'oficiais' | 'simulados' | 'treino';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.45, delay: i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

export default function ProvasPage() {
  const { user } = useAuthContext();
  const { capabilities } = useEntitlements(user?.uid, user?.email);
  const [activeTab, setActiveTab] = useState<TabType>('oficiais');
  const [exams, setExams] = useState<ExamMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBanca, setSelectedBanca] = useState('todas');
  const [selectedYear, setSelectedYear] = useState('todos');
  const [selectedDuration, setSelectedDuration] = useState('todas');
  const [selectedQuestionCount, setSelectedQuestionCount] = useState('todas');

  useEffect(() => {
    if (!user) return;
    const loadExams = async () => {
      setLoading(true);
      try {
        const data = await listExamsByPlan();
        setExams(data);
      } catch (error) {
        console.error('Erro ao carregar provas:', error);
      } finally {
        setLoading(false);
      }
    };
    loadExams();
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-mono">Faça login para acessar as provas</p>
      </div>
    );
  }

  const tabs: { key: TabType; label: string }[] = [
    { key: 'oficiais', label: 'Provas Oficiais' },
    { key: 'simulados', label: 'Simulados' },
    { key: 'treino', label: 'Treino Rápido' },
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Atmospheric depth */}
      

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6 px-6 border-b border-border bg-card/30 backdrop-blur-md">
        
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <Target className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground font-mono">Centro de Provas</span>
              </div>
              <h1 className="font-sans font-sans text-am-h2 md:text-[42px] font-bold text-foreground tracking-tight leading-[1.1]">Provas & Simulados</h1>
              <p className="mt-1 text-am-body-sm text-muted-foreground mt-4 max-w-xl leading-relaxed">Pratique com provas oficiais e simulados personalizados</p>
            </div>
            
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative border-b border-border px-6">
        <div className="mx-auto max-w-7xl flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative whitespace-nowrap px-5 py-3.5 text-sm font-medium transition-colors ${activeTab === tab.key
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

      {/* Content */}
      <div className="px-6 space-y-6">
        <div>

          {activeTab === 'oficiais' && (
            <div className="space-y-5">
              <div className="flex flex-col gap-2">
                <h2 className="font-sans text-lg font-bold text-foreground">Provas Disponíveis</h2>
                {!loading && exams.length > 0 && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Mostrando {filteredExams.length} de {exams.length} provas
                  </p>
                )}
              </div>

              {/* Filters */}
                <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show"
                  className="rounded-2xl border border-border p-5 bg-card"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground font-mono">Filtros</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar prova..."
                        className="w-full rounded-full border border-border bg-card pl-9 pr-4 py-2.5 text-sm text-foreground placeholder-[#666] outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-[var(--primary)]/30"
                      />
                    </div>
                    <select value={selectedBanca} onChange={(e) => setSelectedBanca(e.target.value)}
                      className="w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-[var(--primary)]/30 appearance-none"
                    >
                      <option value="todas">Todas as bancas</option>
                      {bancaOptions.map((banca) => (<option key={banca} value={banca}>{banca}</option>))}
                    </select>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-[var(--primary)]/30 appearance-none"
                    >
                      <option value="todos">Todos os anos</option>
                      {yearOptions.map((year) => (<option key={year} value={String(year)}>{year}</option>))}
                    </select>
                    <select value={selectedDuration} onChange={(e) => setSelectedDuration(e.target.value)}
                      className="w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-[var(--primary)]/30 appearance-none"
                    >
                      <option value="todas">Qualquer duração</option>
                      <option value="ate120">Até 120 min</option>
                      <option value="121a240">121 a 240 min</option>
                      <option value="mais240">Acima de 240 min</option>
                      <option value="semDuracao">Sem duração definida</option>
                    </select>
                    <div className="flex gap-2">
                      <select value={selectedQuestionCount} onChange={(e) => setSelectedQuestionCount(e.target.value)}
                        className="w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-[var(--primary)]/30 appearance-none"
                      >
                        <option value="todas">Nº questões</option>
                        <option value="ate50">Até 50</option>
                        <option value="51a100">51 a 100</option>
                        <option value="mais100">Mais de 100</option>
                      </select>
                      <button
                        onClick={() => { setSearchTerm(''); setSelectedBanca('todas'); setSelectedYear('todos'); setSelectedDuration('todas'); setSelectedQuestionCount('todas'); }}
                        className="shrink-0 flex items-center justify-center rounded-full border border-border bg-card px-3 py-2 text-muted-foreground transition-all hover:bg-muted-foreground/10 hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full" style={{ background: 'var(--primary)' }}>
                    <Zap className="h-6 w-6 text-foreground" />
                  </div>
                </div>
              ) : exams.length === 0 ? (
                <div className="rounded-2xl border border-border py-16 text-center" >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/10">
                    <BookOpen className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="font-sans text-am-body-sm text-muted-foreground mt-4 max-w-xl leading-relaxed">Nenhuma prova disponível ainda</p>
                </div>
              ) : filteredExams.length === 0 ? (
                <div className="rounded-2xl border border-border py-16 text-center" >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/10">
                    <BookOpen className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="font-sans text-sm text-foreground">Nenhuma prova encontrada</p>
                  <p className="mt-1 text-xs text-muted-foreground font-mono">Ajuste os filtros para ver mais resultados</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredExams.map((exam, i) => (
                    <motion.div key={exam.id} custom={i + 1} variants={fadeUp} initial="hidden" animate="show">
                      <ExamCard exam={exam} />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'simulados' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <h2 className="font-sans text-lg font-bold text-foreground">Meus Simulados</h2>
                {capabilities.canCreateSimulados ? (
                  <Link href="/provas/criar-simulado" className="inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 text-sm font-semibold tracking-wide text-primary-foreground uppercase hover:bg-primary/90 transition-all flex items-center gap-2 px-5 py-2.5 text-sm">
                    <Plus className="h-4 w-4" />
                    Criar Simulado
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-primary/10 px-3 py-2 text-xs text-primary font-mono">
                    <Lock className="h-3.5 w-3.5" />
                    Pro/Premium
                  </span>
                )}
              </div>

              {capabilities.canCreateSimulados ? (
                <div className="rounded-2xl border border-border py-16 text-center" >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--primary)', boxShadow: '0 0 24px rgba(234, 88, 12, 0.15)' }}>
                    <Award className="h-7 w-7 text-foreground" />
                  </div>
                  <p className="text-am-body-sm text-muted-foreground mt-4 max-w-xl leading-relaxed mb-4 max-w-md mx-auto">
                    Crie simulados personalizados com filtros de matéria, banca e dificuldade
                  </p>
                  <Link href="/provas/criar-simulado" className="inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 text-sm font-semibold tracking-wide text-primary-foreground uppercase hover:bg-primary/90 transition-all inline-flex items-center gap-2 px-6 py-3 text-sm">
                    <Sparkles className="h-4 w-4" />
                    Criar Primeiro Simulado
                  </Link>
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--primary)]/20 p-10 text-center" >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
                    <Lock className="h-7 w-7 text-primary" />
                  </div>
                  <p className="font-sans text-sm font-semibold text-foreground mb-2">Simulados personalizados — Pro/Premium</p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Continue praticando nas provas oficiais e desbloqueie simulados para treinos direcionados.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'treino' && (
            capabilities.canUseTreinoRapido ? (
              <TreinoRapidoTab />
            ) : (
              <div className="rounded-2xl border border-[var(--primary)]/20 p-10 text-center" >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
                  <Lock className="h-7 w-7 text-primary" />
                </div>
                <p className="font-sans text-sm font-semibold text-foreground">Treino rápido — Pro/Premium</p>
              </div>
            )
          )}
        </div>
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
    const loadMaterias = async () => {
      setLoading(true);
      try {
        const subjects = await getAvailableSubjects();
        setMaterias(subjects);
      } catch (error) {
        console.error('Erro ao carregar matérias:', error);
      } finally {
        setLoading(false);
      }
    };
    loadMaterias();
  }, []);

  const handleStart = () => {
    console.log('Iniciar treino:', { materia: selectedMateria, count: questionCount });
    alert('Funcionalidade de treino rápido será implementada em breve!');
  };

  return (
    <div className="space-y-5">
      <h2 className="font-sans text-lg font-bold text-foreground">Treino por Matéria</h2>
      <div className="rounded-2xl border border-border p-6 bg-card">
        <p className="text-am-body-sm text-muted-foreground mt-4 max-w-xl leading-relaxed mb-6">
          Selecione os filtros e comece a resolver questões com correção imediata
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="flex h-10 w-10 animate-pulse items-center justify-center rounded-full" style={{ background: 'var(--primary)' }}>
              <Zap className="h-5 w-5 text-foreground" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-mono mb-2">Matéria</label>
              <select
                value={selectedMateria}
                onChange={(e) => setSelectedMateria(e.target.value)}
                className="w-full rounded-full border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-[var(--primary)]/30 appearance-none"
              >
                <option value="">Todas</option>
                {materias.map((materia) => (<option key={materia} value={materia}>{materia}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-mono mb-2">Quantidade de questões</label>
              <input
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                min={1}
                max={50}
                className="w-full rounded-full border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-[var(--primary)]/30"
              />
            </div>
            <button
              onClick={handleStart}
              className="inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 text-sm font-semibold tracking-wide text-primary-foreground uppercase hover:bg-primary/90 transition-all w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm"
            >
              <Target className="h-4 w-4" />
              Começar Treino
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ExamCard({ exam }: { exam: ExamMetadata }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border p-6 transition-all hover:border-primary/30 hover:bg-card bg-card">
      <h3 className="font-sans text-base font-bold text-foreground mb-3">{exam.name}</h3>
      <div className="space-y-2 mb-5">
        {exam.banca && (
          <div className="flex items-center gap-2 text-am-body-sm text-muted-foreground mt-4 max-w-xl leading-relaxed">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">{exam.banca}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-am-body-sm text-muted-foreground mt-4 max-w-xl leading-relaxed">
          <Award className="h-3.5 w-3.5" />
          <span className="font-mono text-xs">{exam.questions?.length || 0} questões</span>
        </div>
        {exam.durationMinutes && (
          <div className="flex items-center gap-2 text-am-body-sm text-muted-foreground mt-4 max-w-xl leading-relaxed">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">{exam.durationMinutes} minutos</span>
          </div>
        )}
      </div>
      <Link
        href={`/provas/${exam.id}/executar`}
        className="inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 text-sm font-semibold tracking-wide text-primary-foreground uppercase hover:bg-primary/90 transition-all block w-full text-center px-4 py-2.5 text-sm"
      >
        Iniciar Prova
      </Link>
    </div>
  );
}
