'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { saveSimulatedConfig, getRandomQuestions, getPredictiveQuestions, getAccuracyBySubject } from '@/lib/firebase/questions';
import { useEntitlements } from '@/hooks/useEntitlements';
import { QuestionDifficulty, DEFAULT_SUBJECTS } from '@/types';
import { ArrowLeft, Play, Lock, Brain, Shuffle, Zap, Sparkles, Target } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.45, delay: i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

export default function CriarSimuladoPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { capabilities } = useEntitlements(user?.uid, user?.email);

  const [questionCount, setQuestionCount] = useState(20);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [selectedMaterias, setSelectedMaterias] = useState<string[]>([]);
  const [selectedDificuldades, setSelectedDificuldades] = useState<QuestionDifficulty[]>([]);
  const [selectedBancas, setSelectedBancas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [smartMode, setSmartMode] = useState(true);

  const bancasDisponiveis = ['FGV', 'CESPE/CEBRASPE', 'FCC', 'VUNESP', 'IBFC'];
  const dificuldades: QuestionDifficulty[] = ['fácil', 'médio', 'difícil', 'extremo'];

  const toggleMateria = (materia: string) => {
    setSelectedMaterias(prev =>
      prev.includes(materia) ? prev.filter(m => m !== materia) : [...prev, materia]
    );
  };
  const toggleDificuldade = (dif: QuestionDifficulty) => {
    setSelectedDificuldades(prev =>
      prev.includes(dif) ? prev.filter(d => d !== dif) : [...prev, dif]
    );
  };
  const toggleBanca = (banca: string) => {
    setSelectedBancas(prev =>
      prev.includes(banca) ? prev.filter(b => b !== banca) : [...prev, banca]
    );
  };

  const handleStart = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const filters: Record<string, string[]> = {};
      if (selectedMaterias.length > 0) filters.materias = selectedMaterias;
      if (selectedDificuldades.length > 0) filters.dificuldades = selectedDificuldades;
      if (selectedBancas.length > 0) filters.bancas = selectedBancas;

      let questions;
      if (smartMode) {
        const accuracyData = await getAccuracyBySubject(user.uid);
        const planWeights = (selectedMaterias.length > 0 ? selectedMaterias : DEFAULT_SUBJECTS as unknown as string[])
          .map(m => ({ subject: m, weight: 1.0 }));
        questions = await getPredictiveQuestions(accuracyData, planWeights, questionCount, {
          bancas: selectedBancas.length > 0 ? selectedBancas : undefined,
          dificuldades: selectedDificuldades.length > 0 ? selectedDificuldades : undefined,
        });
      } else {
        questions = await getRandomQuestions(
          {
            materias: selectedMaterias.length > 0 ? selectedMaterias : undefined,
            bancas: selectedBancas.length > 0 ? selectedBancas : undefined,
            dificuldades: selectedDificuldades.length > 0 ? selectedDificuldades : undefined,
          },
          questionCount
        );
      }

      if (questions.length === 0) {
        alert('Nenhuma questão encontrada com os filtros selecionados. Tente ajustar os critérios.');
        setLoading(false);
        return;
      }

      const questionIds = questions.map(q => q.id).filter(Boolean) as string[];
      const configId = await saveSimulatedConfig({
        userId: user.uid,
        planId: null,
        questionCount: questionIds.length,
        ...(durationMinutes > 0 ? { durationMinutes } : {}),
        questionIds,
        smartMode,
        filters,
      });

      router.push('/provas/' + configId + '/executar');
    } catch (error) {
      console.error('Erro ao criar simulado:', error);
      alert('Erro ao criar simulado. Tente novamente.');
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-am-canvas">
        <p className="text-am-text-secondary font-mono">Faça login para criar simulados</p>
      </div>
    );
  }

  if (!capabilities.canCreateSimulados) {
    return (
      <div className="relative min-h-screen bg-am-canvas">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 right-1/4 h-[400px] w-[400px] rounded-full bg-am-brand-secondary/8 blur-[140px]" />
        </div>
        <div className="relative px-6 py-8">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-center gap-4">
              <Link href="/provas" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.03] text-am-text-secondary transition-all hover:bg-white/[0.06] hover:text-slate-300">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="font-brand text-2xl font-bold text-white">Criar Simulado</h1>
                <p className="text-sm text-am-text-secondary font-mono">Recurso Pro/Premium</p>
              </div>
            </div>
            <div className="rounded-2xl border border-[#F59768]/20 p-10 text-center" style={{ background: 'linear-gradient(135deg, rgba(245,151,104,0.05), rgba(49,80,170,0.05))' }}>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-am-brand-primary/15">
                <Lock className="h-7 w-7 text-am-brand-primary" />
              </div>
              <p className="font-brand text-lg font-semibold text-white">Simulados personalizados — Pro/Premium</p>
              <p className="mt-2 text-sm text-am-text-secondary max-w-md mx-auto">
                Você pode continuar usando provas oficiais na seção Provas &amp; Simulados.
              </p>
              <Link href="/provas" className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.03] px-5 py-2.5 text-sm text-am-text-secondary transition-all hover:bg-white/[0.06] hover:text-slate-300 font-mono">
                <ArrowLeft className="h-4 w-4" />
                Voltar para Provas
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-am-canvas">
      {/* Atmospheric depth */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[400px] w-[400px] rounded-full bg-am-brand-secondary/8 blur-[140px]" />
        <div className="absolute bottom-1/4 -right-40 h-[350px] w-[350px] rounded-full bg-am-brand-primary/5 blur-[120px]" />
      </div>

      {/* Hero Header */}
      <div className="relative border-b border-white/[0.07] px-6 py-8"
        style={{ background: 'linear-gradient(180deg, rgba(14,17,27,0.9) 0%, rgba(10,10,10,0.95) 100%)' }}
      >
        <div className="rds-grid-bg absolute inset-0 pointer-events-none" />
        <div className="relative mx-auto max-w-4xl flex items-center gap-4">
          <Link href="/provas" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.03] text-am-text-secondary transition-all hover:bg-white/[0.06] hover:text-slate-300">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-am-brand-primary opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-am-brand-primary" style={{ boxShadow: '0 0 10px rgba(245,151,104,0.6)' }} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-am-text-secondary font-mono">Configuração</span>
            </div>
            <h1 className="font-brand text-2xl font-bold text-white">Criar Simulado</h1>
            <p className="text-sm text-am-text-secondary">Configure seu simulado personalizado</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative px-6 py-6">
        <div className="mx-auto max-w-4xl space-y-5">

          {/* Configurações Básicas */}
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show"
            className="relative overflow-hidden rounded-2xl border border-white/[0.10] p-6"
            style={{ background: 'linear-gradient(160deg, #0E111B 0%, #0A0A10 100%)', boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)' }}
          >
            <h2 className="font-brand text-lg font-bold text-white mb-5">Configurações</h2>

            {/* Smart Mode Toggle */}
            <div className="flex items-center gap-4 rounded-2xl border border-[#F59768]/20 p-5 mb-5"
              style={{ background: smartMode ? 'rgba(245,151,104,0.05)' : 'rgba(255,255,255,0.02)' }}
            >
              <button
                onClick={() => setSmartMode(!smartMode)}
                className={'relative inline-flex h-7 w-12 items-center rounded-full transition-colors'}
                style={{ background: smartMode ? 'var(--identity-grad)' : 'rgba(255,255,255,0.1)' }}
              >
                <span className={'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ' + (smartMode ? 'translate-x-6' : 'translate-x-1')} />
              </button>
              <div className="flex items-center gap-2.5">
                {smartMode
                  ? <Brain className="h-5 w-5 text-am-brand-primary" />
                  : <Shuffle className="h-5 w-5 text-am-text-secondary" />
                }
                <div>
                  <p className="text-sm font-semibold text-white">
                    {smartMode ? 'Simulado Inteligente (IA)' : 'Simulado Clássico'}
                  </p>
                  <p className="text-xs text-am-text-secondary font-mono">
                    {smartMode
                      ? 'Questões priorizadas pelos seus pontos fracos e peso do edital'
                      : 'Questões selecionadas aleatoriamente'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-am-text-secondary font-mono mb-2">
                  Número de questões
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full rounded-full border border-white/[0.10] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-all focus:border-[#3150AA]/50 focus:ring-1 focus:ring-[#3150AA]/30"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-am-text-secondary font-mono mb-2">
                  Duração (min) — 0 para ilimitado
                </label>
                <input
                  type="number"
                  min={0}
                  max={300}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full rounded-full border border-white/[0.10] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-all focus:border-[#3150AA]/50 focus:ring-1 focus:ring-[#3150AA]/30"
                />
              </div>
            </div>
          </motion.div>

          {/* Matérias */}
          <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show"
            className="relative overflow-hidden rounded-2xl border border-white/[0.10] p-6"
            style={{ background: 'linear-gradient(160deg, #0E111B 0%, #0A0A10 100%)', boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)' }}
          >
            <h2 className="font-brand text-lg font-bold text-white mb-2">Matérias</h2>
            <p className="text-xs text-am-text-secondary font-mono mb-5">Deixe vazio para incluir todas</p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {DEFAULT_SUBJECTS.map((materia) => (
                <button
                  key={materia}
                  onClick={() => toggleMateria(materia)}
                  className={`px-4 py-2.5 rounded-full border-2 transition-all text-sm font-medium ${selectedMaterias.includes(materia)
                    ? 'border-[#F59768]/50 text-am-brand-primary'
                    : 'border-white/[0.10] text-am-text-secondary hover:border-white/[0.20] hover:text-slate-300'
                    }`}
                  style={selectedMaterias.includes(materia) ? { background: 'rgba(245,151,104,0.1)' } : { background: 'rgba(255,255,255,0.02)' }}
                >
                  {materia}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Bancas */}
          <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show"
            className="relative overflow-hidden rounded-2xl border border-white/[0.10] p-6"
            style={{ background: 'linear-gradient(160deg, #0E111B 0%, #0A0A10 100%)', boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)' }}
          >
            <h2 className="font-brand text-lg font-bold text-white mb-2">Bancas</h2>
            <p className="text-xs text-am-text-secondary font-mono mb-5">Deixe vazio para incluir todas</p>
            <div className="flex flex-wrap gap-2.5">
              {bancasDisponiveis.map((banca) => (
                <button
                  key={banca}
                  onClick={() => toggleBanca(banca)}
                  className={`px-5 py-2.5 rounded-full border-2 transition-all text-sm font-medium ${selectedBancas.includes(banca)
                    ? 'border-[#3150AA]/50 text-am-brand-primary'
                    : 'border-white/[0.10] text-am-text-secondary hover:border-white/[0.20] hover:text-slate-300'
                    }`}
                  style={selectedBancas.includes(banca) ? { background: 'rgba(49,80,170,0.15)' } : { background: 'rgba(255,255,255,0.02)' }}
                >
                  {banca}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Dificuldade */}
          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show"
            className="relative overflow-hidden rounded-2xl border border-white/[0.10] p-6"
            style={{ background: 'linear-gradient(160deg, #0E111B 0%, #0A0A10 100%)', boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)' }}
          >
            <h2 className="font-brand text-lg font-bold text-white mb-2">Dificuldade</h2>
            <p className="text-xs text-am-text-secondary font-mono mb-5">Deixe vazio para incluir todas</p>
            <div className="flex flex-wrap gap-2.5">
              {dificuldades.map((dif) => (
                <button
                  key={dif}
                  onClick={() => toggleDificuldade(dif)}
                  className={`px-5 py-2.5 rounded-full border-2 transition-all text-sm font-medium capitalize ${selectedDificuldades.includes(dif)
                    ? 'border-[#F59768]/50 text-am-brand-primary'
                    : 'border-white/[0.10] text-am-text-secondary hover:border-white/[0.20] hover:text-slate-300'
                    }`}
                  style={selectedDificuldades.includes(dif) ? { background: 'rgba(245,151,104,0.1)' } : { background: 'rgba(255,255,255,0.02)' }}
                >
                  {dif}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Start button */}
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show">
            <button
              onClick={handleStart}
              disabled={loading}
              className="rds-btn-identity w-full flex items-center justify-center gap-3 px-6 py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Preparando...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  Iniciar Simulado
                </>
              )}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
