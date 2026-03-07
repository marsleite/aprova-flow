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
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <p className="text-[#666] font-mono">Faça login para acessar as provas</p>
      </div>
    );
  }

  const tabs: { key: TabType; label: string }[] = [
    { key: 'oficiais', label: 'Provas Oficiais' },
    { key: 'simulados', label: 'Simulados' },
    { key: 'treino', label: 'Treino Rápido' },
  ];

  return (
    <div className="relative min-h-screen bg-[#0A0A0A]">
      {/* Atmospheric depth */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-[400px] w-[400px] rounded-full bg-[#3150AA]/8 blur-[140px]" />
        <div className="absolute bottom-1/3 -left-40 h-[350px] w-[350px] rounded-full bg-[#F59768]/5 blur-[120px]" />
      </div>

      {/* Hero Header */}
      <div className="relative border-b border-white/[0.07] px-6 py-8"
        style={{ background: 'linear-gradient(180deg, rgba(14,17,27,0.9) 0%, rgba(10,10,10,0.95) 100%)' }}
      >
        <div className="rds-grid-bg absolute inset-0 pointer-events-none" />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F59768] opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F59768]" style={{ boxShadow: '0 0 10px rgba(245,151,104,0.6)' }} />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#666] font-mono">Centro de Provas</span>
              </div>
              <h1 className="font-brand text-3xl font-bold tracking-tight text-white">Provas & Simulados</h1>
              <p className="mt-1 text-sm text-[#666]">Pratique com provas oficiais e simulados personalizados</p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.03] px-4 py-2 text-sm text-[#666] transition-all hover:bg-white/[0.06] hover:text-slate-300 font-mono"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative border-b border-white/[0.07] px-6">
        <div className="mx-auto max-w-7xl flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative whitespace-nowrap px-5 py-3.5 text-sm font-medium transition-colors ${activeTab === tab.key
                ? 'text-[#F59768]'
                : 'text-[#666] hover:text-slate-300'
                }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="provas-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: 'var(--identity-grad)' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative px-6 py-6">
        <div className="mx-auto max-w-7xl">

          {activeTab === 'oficiais' && (
            <div className="space-y-5">
              <div className="flex flex-col gap-2">
                <h2 className="font-brand text-lg font-bold text-white">Provas Disponíveis</h2>
                {!loading && exams.length > 0 && (
                  <p className="text-xs text-[#666] font-mono">
                    Mostrando {filteredExams.length} de {exams.length} provas
                  </p>
                )}
              </div>

              {/* Filters */}
              {!loading && exams.length > 0 && (
                <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show"
                  className="rounded-2xl border border-white/[0.10] p-5"
                  style={{ background: 'linear-gradient(160deg, #0E111B 0%, #0A0A10 100%)', boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)' }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-[#F59768]" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#666] font-mono">Filtros</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#666]" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar prova..."
                        className="w-full rounded-full border border-white/[0.10] bg-white/[0.04] pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#666] outline-none transition-all focus:border-[#3150AA]/50 focus:ring-1 focus:ring-[#3150AA]/30"
                      />
                    </div>
                    <select value={selectedBanca} onChange={(e) => setSelectedBanca(e.target.value)}
                      className="w-full rounded-full border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition-all focus:border-[#3150AA]/50 focus:ring-1 focus:ring-[#3150AA]/30 appearance-none"
                    >
                      <option value="todas">Todas as bancas</option>
                      {bancaOptions.map((banca) => (<option key={banca} value={banca}>{banca}</option>))}
                    </select>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full rounded-full border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition-all focus:border-[#3150AA]/50 focus:ring-1 focus:ring-[#3150AA]/30 appearance-none"
                    >
                      <option value="todos">Todos os anos</option>
                      {yearOptions.map((year) => (<option key={year} value={String(year)}>{year}</option>))}
                    </select>
                    <select value={selectedDuration} onChange={(e) => setSelectedDuration(e.target.value)}
                      className="w-full rounded-full border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition-all focus:border-[#3150AA]/50 focus:ring-1 focus:ring-[#3150AA]/30 appearance-none"
                    >
                      <option value="todas">Qualquer duração</option>
                      <option value="ate120">Até 120 min</option>
                      <option value="121a240">121 a 240 min</option>
                      <option value="mais240">Acima de 240 min</option>
                      <option value="semDuracao">Sem duração definida</option>
                    </select>
                    <div className="flex gap-2">
                      <select value={selectedQuestionCount} onChange={(e) => setSelectedQuestionCount(e.target.value)}
                        className="w-full rounded-full border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition-all focus:border-[#3150AA]/50 focus:ring-1 focus:ring-[#3150AA]/30 appearance-none"
                      >
                        <option value="todas">Nº questões</option>
                        <option value="ate50">Até 50</option>
                        <option value="51a100">51 a 100</option>
                        <option value="mais100">Mais de 100</option>
                      </select>
                      <button
                        onClick={() => { setSearchTerm(''); setSelectedBanca('todas'); setSelectedYear('todos'); setSelectedDuration('todas'); setSelectedQuestionCount('todas'); }}
                        className="shrink-0 flex items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.04] px-3 py-2 text-[#666] transition-all hover:bg-white/[0.06] hover:text-slate-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full" style={{ background: 'var(--identity-grad)' }}>
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                </div>
              ) : exams.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.10] py-16 text-center" style={{ background: 'linear-gradient(160deg, #0E111B 0%, #0A0A10 100%)' }}>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3150AA]/10">
                    <BookOpen className="h-7 w-7 text-[#666]" />
                  </div>
                  <p className="font-brand text-sm text-[#666]">Nenhuma prova disponível ainda</p>
                </div>
              ) : filteredExams.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.10] py-16 text-center" style={{ background: 'linear-gradient(160deg, #0E111B 0%, #0A0A10 100%)' }}>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3150AA]/10">
                    <BookOpen className="h-7 w-7 text-[#666]" />
                  </div>
                  <p className="font-brand text-sm text-white">Nenhuma prova encontrada</p>
                  <p className="mt-1 text-xs text-[#666] font-mono">Ajuste os filtros para ver mais resultados</p>
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
                <h2 className="font-brand text-lg font-bold text-white">Meus Simulados</h2>
                {capabilities.canCreateSimulados ? (
                  <Link href="/provas/criar-simulado" className="rds-btn-identity flex items-center gap-2 px-5 py-2.5 text-sm">
                    <Plus className="h-4 w-4" />
                    Criar Simulado
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#F59768]/20 bg-[#F59768]/10 px-3 py-2 text-xs text-[#F59768] font-mono">
                    <Lock className="h-3.5 w-3.5" />
                    Pro/Premium
                  </span>
                )}
              </div>

              {capabilities.canCreateSimulados ? (
                <div className="rounded-2xl border border-white/[0.10] py-16 text-center" style={{ background: 'linear-gradient(160deg, #0E111B 0%, #0A0A10 100%)' }}>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--identity-grad)', boxShadow: '0 0 24px rgba(245,151,104,0.15)' }}>
                    <Award className="h-7 w-7 text-white" />
                  </div>
                  <p className="text-sm text-[#666] mb-4 max-w-md mx-auto">
                    Crie simulados personalizados com filtros de matéria, banca e dificuldade
                  </p>
                  <Link href="/provas/criar-simulado" className="rds-btn-identity inline-flex items-center gap-2 px-6 py-3 text-sm">
                    <Sparkles className="h-4 w-4" />
                    Criar Primeiro Simulado
                  </Link>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#F59768]/20 p-10 text-center" style={{ background: 'linear-gradient(135deg, rgba(245,151,104,0.05), rgba(49,80,170,0.05))' }}>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F59768]/15">
                    <Lock className="h-7 w-7 text-[#F59768]" />
                  </div>
                  <p className="font-brand text-sm font-semibold text-white mb-2">Simulados personalizados — Pro/Premium</p>
                  <p className="text-xs text-[#666] max-w-md mx-auto">
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
              <div className="rounded-2xl border border-[#F59768]/20 p-10 text-center" style={{ background: 'linear-gradient(135deg, rgba(245,151,104,0.05), rgba(49,80,170,0.05))' }}>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F59768]/15">
                  <Lock className="h-7 w-7 text-[#F59768]" />
                </div>
                <p className="font-brand text-sm font-semibold text-white">Treino rápido — Pro/Premium</p>
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
      <h2 className="font-brand text-lg font-bold text-white">Treino por Matéria</h2>
      <div className="rounded-2xl border border-white/[0.10] p-6"
        style={{ background: 'linear-gradient(160deg, #0E111B 0%, #0A0A10 100%)', boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)' }}
      >
        <p className="text-sm text-[#666] mb-6">
          Selecione os filtros e comece a resolver questões com correção imediata
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="flex h-10 w-10 animate-pulse items-center justify-center rounded-full" style={{ background: 'var(--identity-grad)' }}>
              <Zap className="h-5 w-5 text-white" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#666] font-mono mb-2">Matéria</label>
              <select
                value={selectedMateria}
                onChange={(e) => setSelectedMateria(e.target.value)}
                className="w-full rounded-full border border-white/[0.10] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-all focus:border-[#3150AA]/50 focus:ring-1 focus:ring-[#3150AA]/30 appearance-none"
              >
                <option value="">Todas</option>
                {materias.map((materia) => (<option key={materia} value={materia}>{materia}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#666] font-mono mb-2">Quantidade de questões</label>
              <input
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                min={1}
                max={50}
                className="w-full rounded-full border border-white/[0.10] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-all focus:border-[#3150AA]/50 focus:ring-1 focus:ring-[#3150AA]/30"
              />
            </div>
            <button
              onClick={handleStart}
              className="rds-btn-identity w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm"
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
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.10] p-6 transition-all hover:border-[#F59768]/30 hover:bg-white/[0.02]"
      style={{ background: 'linear-gradient(160deg, #0E111B 0%, #0A0A10 100%)', boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)' }}
    >
      <div className="pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full bg-[#3150AA]/5 blur-[30px] transition-all group-hover:bg-[#F59768]/8" />
      <h3 className="font-brand text-base font-bold text-white mb-3">{exam.name}</h3>
      <div className="space-y-2 mb-5">
        {exam.banca && (
          <div className="flex items-center gap-2 text-sm text-[#666]">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">{exam.banca}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-[#666]">
          <Award className="h-3.5 w-3.5" />
          <span className="font-mono text-xs">{exam.questions?.length || 0} questões</span>
        </div>
        {exam.durationMinutes && (
          <div className="flex items-center gap-2 text-sm text-[#666]">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">{exam.durationMinutes} minutos</span>
          </div>
        )}
      </div>
      <Link
        href={`/provas/${exam.id}/executar`}
        className="rds-btn-identity block w-full text-center px-4 py-2.5 text-sm"
      >
        Iniciar Prova
      </Link>
    </div>
  );
}
