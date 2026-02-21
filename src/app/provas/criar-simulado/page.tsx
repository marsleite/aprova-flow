'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { saveSimulatedConfig, getRandomQuestions } from '@/lib/firebase/questions';
import { QuestionDifficulty, DEFAULT_SUBJECTS } from '@/types';
import { ArrowLeft, Play } from 'lucide-react';
import Link from 'next/link';

export default function CriarSimuladoPage() {
  const router = useRouter();
  const { user } = useAuthContext();

  const [questionCount, setQuestionCount] = useState(20);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [selectedMaterias, setSelectedMaterias] = useState<string[]>([]);
  const [selectedDificuldades, setSelectedDificuldades] = useState<QuestionDifficulty[]>([]);
  const [selectedBancas, setSelectedBancas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const bancasDisponiveis = ['FGV', 'CESPE/CEBRASPE', 'FCC', 'VUNESP', 'IBFC'];
  const dificuldades: QuestionDifficulty[] = ['fácil', 'médio', 'difícil', 'extremo'];

  const toggleMateria = (materia: string) => {
    setSelectedMaterias(prev =>
      prev.includes(materia)
        ? prev.filter(m => m !== materia)
        : [...prev, materia]
    );
  };

  const toggleDificuldade = (dif: QuestionDifficulty) => {
    setSelectedDificuldades(prev =>
      prev.includes(dif)
        ? prev.filter(d => d !== dif)
        : [...prev, dif]
    );
  };

  const toggleBanca = (banca: string) => {
    setSelectedBancas(prev =>
      prev.includes(banca)
        ? prev.filter(b => b !== banca)
        : [...prev, banca]
    );
  };

  const handleStart = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Salva config do simulado
      const configId = await saveSimulatedConfig({
        userId: user.uid,
        planId: null,
        questionCount,
        durationMinutes: durationMinutes > 0 ? durationMinutes : undefined,
        filters: {
          materias: selectedMaterias.length > 0 ? selectedMaterias : undefined,
          dificuldades: selectedDificuldades.length > 0 ? selectedDificuldades : undefined,
          bancas: selectedBancas.length > 0 ? selectedBancas : undefined,
        },
      });

      // Busca questões aleatórias
      const questions = await getRandomQuestions(
        {
          materias: selectedMaterias.length > 0 ? selectedMaterias : undefined,
          bancas: selectedBancas.length > 0 ? selectedBancas : undefined,
          dificuldades: selectedDificuldades.length > 0 ? selectedDificuldades : undefined,
        },
        questionCount
      );

      if (questions.length === 0) {
        alert('Nenhuma questão encontrada com os filtros selecionados. Tente ajustar os critérios.');
        setLoading(false);
        return;
      }

      // Redireciona para execução do simulado
      router.push(`/provas/simulado/${configId}/executar`);
    } catch (error) {
      console.error('Erro ao criar simulado:', error);
      alert('Erro ao criar simulado. Tente novamente.');
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-gray-400">Faça login para criar simulados</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/provas"
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Criar Simulado</h1>
            <p className="text-gray-400">Configure seu simulado personalizado</p>
          </div>
        </div>

        {/* Configurações Básicas */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white mb-4">Configurações</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Número de questões
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Duração (minutos) - 0 para ilimitado
              </label>
              <input
                type="number"
                min={0}
                max={300}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
        </div>

        {/* Filtro de Matérias */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Matérias</h2>
          <p className="text-sm text-gray-400 mb-4">
            Deixe vazio para incluir todas as matérias
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {DEFAULT_SUBJECTS.map((materia) => (
              <button
                key={materia}
                onClick={() => toggleMateria(materia)}
                className={`px-4 py-2 rounded-lg border-2 transition-all text-sm ${
                  selectedMaterias.includes(materia)
                    ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                {materia}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro de Bancas */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Bancas</h2>
          <p className="text-sm text-gray-400 mb-4">
            Deixe vazio para incluir todas as bancas
          </p>
          
          <div className="flex flex-wrap gap-3">
            {bancasDisponiveis.map((banca) => (
              <button
                key={banca}
                onClick={() => toggleBanca(banca)}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  selectedBancas.includes(banca)
                    ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                {banca}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro de Dificuldade */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Dificuldade</h2>
          <p className="text-sm text-gray-400 mb-4">
            Deixe vazio para incluir todas as dificuldades
          </p>
          
          <div className="flex flex-wrap gap-3">
            {dificuldades.map((dif) => (
              <button
                key={dif}
                onClick={() => toggleDificuldade(dif)}
                className={`px-4 py-2 rounded-lg border-2 transition-all capitalize ${
                  selectedDificuldades.includes(dif)
                    ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                {dif}
              </button>
            ))}
          </div>
        </div>

        {/* Botão Iniciar */}
        <div className="flex gap-4">
          <button
            onClick={handleStart}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Preparando...
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Iniciar Simulado
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
