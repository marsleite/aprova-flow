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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-mono">Faça login para criar simulados</p>
      </div>
    );
  }

  if (!capabilities.canCreateSimulados) {
    return (
      <div className="flex flex-col gap-8 pb-10">
        
        <div className="relative px-6 py-8">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-center gap-4">
              <Link href="/provas" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-all hover:bg-muted-foreground/10 hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="font-sans font-sans text-am-h3 md:text-3xl font-bold text-foreground tracking-tight leading-[1.1]">Criar Simulado</h1>
                <p className="text-am-body-sm text-muted-foreground mt-4 max-w-xl leading-relaxed font-mono">Recurso Pro/Premium</p>
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--primary)]/20 p-10 text-center" >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <p className="font-sans text-lg font-semibold text-foreground">Simulados personalizados — Pro/Premium</p>
              <p className="mt-2 text-am-body-sm text-muted-foreground mt-4 max-w-xl leading-relaxed max-w-md mx-auto">
                Você pode continuar usando provas oficiais na seção Provas &amp; Simulados.
              </p>
              <Link href="/provas" className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-5 py-2.5 text-am-body-sm text-muted-foreground mt-4 max-w-xl leading-relaxed transition-all hover:bg-muted-foreground/10 hover:text-foreground font-mono">
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
    <div className="flex flex-col gap-8 pb-10">
      {/* Atmospheric depth */}
      

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6 px-6 border-b border-border bg-card/30 backdrop-blur-md">
        
        <div className="flex items-center gap-4">
          <Link href="/provas" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-all hover:bg-muted-foreground/10 hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Target className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground font-mono">Configuração</span>
            </div>
            <h1 className="font-sans font-sans text-am-h3 md:text-3xl font-bold text-foreground tracking-tight leading-[1.1]">Criar Simulado</h1>
            <p className="text-am-body-sm text-muted-foreground mt-4 max-w-xl leading-relaxed">Configure seu simulado personalizado</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 space-y-6">
        <div className="space-y-6">

          {/* Configurações Básicas */}
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show"
            className="relative overflow-hidden rounded-2xl border border-border p-6 bg-card"
          >
            <h2 className="font-sans text-lg font-bold text-foreground mb-5">Configurações</h2>

            {/* Smart Mode Toggle */}
            <div className="flex items-center gap-4 rounded-2xl border border-[var(--primary)]/20 p-5 mb-5"
              style={{ background: smartMode ? 'rgba(245,151,104,0.05)' : 'rgba(255,255,255,0.02)' }}
            >
              <button
                onClick={() => setSmartMode(!smartMode)}
                className={'relative inline-flex h-7 w-12 items-center rounded-full transition-colors'}
                style={{ background: smartMode ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }}
              >
                <span className={'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ' + (smartMode ? 'translate-x-6' : 'translate-x-1')} />
              </button>
              <div className="flex items-center gap-2.5">
                {smartMode
                  ? <Brain className="h-5 w-5 text-primary" />
                  : <Shuffle className="h-5 w-5 text-muted-foreground" />
                }
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {smartMode ? 'Simulado Inteligente (IA)' : 'Simulado Clássico'}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {smartMode
                      ? 'Questões priorizadas pelos seus pontos fracos e peso do edital'
                      : 'Questões selecionadas aleatoriamente'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-mono mb-2">
                  Número de questões
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full rounded-full border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-[var(--primary)]/50 focus:ring-1 focus:ring-[var(--primary)]/30"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-mono mb-2">
                  Duração (min) — 0 para ilimitado
                </label>
                <input
                  type="number"
                  min={0}
                  max={300}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full rounded-full border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-[var(--primary)]/50 focus:ring-1 focus:ring-[var(--primary)]/30"
                />
              </div>
            </div>
          </motion.div>

          {/* Matérias */}
          <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show"
            className="relative overflow-hidden rounded-2xl border border-border p-6 bg-card"
          >
            <h2 className="font-sans text-lg font-bold text-foreground mb-2">Matérias</h2>
            <p className="text-xs text-muted-foreground font-mono mb-5">Deixe vazio para incluir todas</p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {DEFAULT_SUBJECTS.map((materia) => (
                <button
                  key={materia}
                  onClick={() => toggleMateria(materia)}
                  className={`px-4 py-2.5 rounded-full border-2 transition-all text-sm font-medium ${selectedMaterias.includes(materia)
                    ? 'border-[var(--primary)]/50 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                  style={selectedMaterias.includes(materia) ? { background: "rgba(234,88,12,0.15)" } : { background: "var(--card)" }}
                >
                  {materia}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Bancas */}
          <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show"
            className="relative overflow-hidden rounded-2xl border border-border p-6 bg-card"
          >
            <h2 className="font-sans text-lg font-bold text-foreground mb-2">Bancas</h2>
            <p className="text-xs text-muted-foreground font-mono mb-5">Deixe vazio para incluir todas</p>
            <div className="flex flex-wrap gap-2.5">
              {bancasDisponiveis.map((banca) => (
                <button
                  key={banca}
                  onClick={() => toggleBanca(banca)}
                  className={`px-5 py-2.5 rounded-full border-2 transition-all text-sm font-medium ${selectedBancas.includes(banca)
                    ? 'border-[var(--primary)]/50 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                  style={selectedBancas.includes(banca) ? { background: "var(--primary)", color: "var(--primary-foreground)" } : { background: "var(--card)" }}
                >
                  {banca}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Dificuldade */}
          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show"
            className="relative overflow-hidden rounded-2xl border border-border p-6 bg-card"
          >
            <h2 className="font-sans text-lg font-bold text-foreground mb-2">Dificuldade</h2>
            <p className="text-xs text-muted-foreground font-mono mb-5">Deixe vazio para incluir todas</p>
            <div className="flex flex-wrap gap-2.5">
              {dificuldades.map((dif) => (
                <button
                  key={dif}
                  onClick={() => toggleDificuldade(dif)}
                  className={`px-5 py-2.5 rounded-full border-2 transition-all text-sm font-medium capitalize ${selectedDificuldades.includes(dif)
                    ? 'border-[var(--primary)]/50 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                  style={selectedDificuldades.includes(dif) ? { background: "rgba(234,88,12,0.15)" } : { background: "var(--card)" }}
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
              className="inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 text-sm font-semibold tracking-wide text-primary-foreground uppercase hover:bg-primary/90 transition-all w-full flex items-center justify-center gap-3 px-6 py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
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
