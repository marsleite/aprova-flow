'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { listExamsByPlan, getAvailableSubjects } from '@/lib/firebase/questions';
import { ExamMetadata } from '@/types';
import { Clock, BookOpen, Award, Plus, Home } from 'lucide-react';
import Link from 'next/link';

type TabType = 'oficiais' | 'simulados' | 'treino';

export default function ProvasPage() {
  const { user } = useAuthContext();
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Faça login para acessar as provas</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Provas & Simulados</h1>
            <p className="text-gray-400">
              Pratique com provas oficiais e simulados personalizados
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800/70 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-700"
          >
            <Home className="h-4 w-4" />
            Principal
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('oficiais')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'oficiais'
                ? 'text-violet-400 border-b-2 border-violet-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Provas Oficiais
          </button>
          <button
            onClick={() => setActiveTab('simulados')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'simulados'
                ? 'text-violet-400 border-b-2 border-violet-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Simulados
          </button>
          <button
            onClick={() => setActiveTab('treino')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'treino'
                ? 'text-violet-400 border-b-2 border-violet-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Treino Rápido
          </button>
        </div>

        {/* Content */}
        {activeTab === 'oficiais' && (
          <div className="space-y-6">
            <div className="mb-4 flex flex-col gap-2">
              <h2 className="text-xl font-semibold text-white">Provas Disponíveis</h2>
              {!loading && exams.length > 0 && (
                <p className="text-sm text-gray-400">
                  Mostrando {filteredExams.length} de {exams.length} provas
                </p>
              )}
            </div>

            {!loading && exams.length > 0 && (
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nome da prova..."
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500"
                  />

                  <select
                    value={selectedBanca}
                    onChange={(e) => setSelectedBanca(e.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500"
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
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500"
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
                    onChange={(e) => setSelectedDuration(e.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="todas">Qualquer duração</option>
                    <option value="ate120">Até 120 min</option>
                    <option value="121a240">121 a 240 min</option>
                    <option value="mais240">Acima de 240 min</option>
                    <option value="semDuracao">Sem duração definida</option>
                  </select>

                  <div className="flex gap-2">
                    <select
                      value={selectedQuestionCount}
                      onChange={(e) => setSelectedQuestionCount(e.target.value)}
                      className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="todas">Qualquer nº questões</option>
                      <option value="ate50">Até 50</option>
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
                      className="shrink-0 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-200 transition-colors hover:bg-gray-600"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
              </div>
            ) : exams.length === 0 ? (
              <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
                <BookOpen className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                <p className="text-gray-400">Nenhuma prova disponível ainda</p>
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
                <BookOpen className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                <p className="text-gray-300 font-medium">Nenhuma prova encontrada com esses filtros</p>
                <p className="text-sm text-gray-500 mt-1">Ajuste os filtros para ver mais resultados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExams.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'simulados' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Meus Simulados</h2>
              <Link
                href="/provas/criar-simulado"
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Criar Simulado
              </Link>
            </div>
            
            <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
              <Award className="mx-auto h-12 w-12 text-gray-600 mb-4" />
              <p className="text-gray-400 mb-4">
                Crie simulados personalizados com filtros de matéria, banca e dificuldade
              </p>
              <Link
                href="/provas/criar-simulado"
                className="inline-block px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
              >
                Criar Primeiro Simulado
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'treino' && (
          <TreinoRapidoTab />
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
    // TODO: Implementar navegação para tela de treino
    console.log('Iniciar treino:', { materia: selectedMateria, count: questionCount });
    alert('Funcionalidade de treino rápido será implementada em breve!');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white mb-4">Treino por Matéria</h2>
      
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
        <p className="text-gray-400 mb-6">
          Selecione os filtros e comece a resolver questões com correção imediata
        </p>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Matéria
              </label>
              <select 
                value={selectedMateria}
                onChange={(e) => setSelectedMateria(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Quantidade de questões
              </label>
              <input
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                min={1}
                max={50}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <button 
              onClick={handleStart}
              className="w-full px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors font-medium"
            >
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
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 hover:border-violet-500 transition-colors">
      <h3 className="text-lg font-semibold text-white mb-2">{exam.name}</h3>
      
      <div className="space-y-2 mb-4">
        {exam.banca && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <BookOpen className="h-4 w-4" />
            <span>{exam.banca}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Award className="h-4 w-4" />
          <span>{exam.questions?.length || 0} questões</span>
        </div>
        
        {exam.durationMinutes && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="h-4 w-4" />
            <span>{exam.durationMinutes} minutos</span>
          </div>
        )}
      </div>

      <Link
        href={`/provas/${exam.id}/executar`}
        className="block w-full text-center px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors font-medium"
      >
        Iniciar Prova
      </Link>
    </div>
  );
}
