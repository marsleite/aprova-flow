'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { loadExamQuestions, getExamById, getRecentAttempts } from '@/lib/firebase/questions';
import { ExamMetadata, QuestionBankItem, QuestionAttempt } from '@/types';
import { Check, X, TrendingUp, TrendingDown, Award, BookOpen, Clock, Home } from 'lucide-react';
import Link from 'next/link';

interface QuestionResult {
  question: QuestionBankItem;
  attempt: QuestionAttempt;
}

interface SubjectResult {
  materia: string;
  total: number;
  correct: number;
  accuracy: number;
}

export default function ResultadoProvaPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthContext();
  const examId = params.id as string;

  const [exam, setExam] = useState<ExamMetadata | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [subjectResults, setSubjectResults] = useState<SubjectResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallAccuracy, setOverallAccuracy] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    if (!user || !examId) return;

    const loadResults = async () => {
      setLoading(true);
      try {
        const examData = await getExamById(examId);
        if (!examData) {
          router.push('/provas');
          return;
        }

        const questionsData = await loadExamQuestions(examId);
        const recentAttempts = await getRecentAttempts(user.uid, 100);
        
        // Filtra tentativas desta prova
        const examAttempts = recentAttempts.filter(a => a.examId === examId);
        
        // Monta resultados
        const resultsData: QuestionResult[] = [];
        for (const q of questionsData) {
          const attempt = examAttempts.find(a => a.questionId === q.id);
          if (attempt) {
            resultsData.push({ question: q, attempt });
          }
        }

        // Calcula estatísticas por matéria
        const materiaMap = new Map<string, { total: number; correct: number }>();
        let correctTotal = 0;
        let timeTotal = 0;

        resultsData.forEach(r => {
          const materia = r.question.materia;
          const entry = materiaMap.get(materia) || { total: 0, correct: 0 };
          entry.total++;
          if (r.attempt.correct) {
            entry.correct++;
            correctTotal++;
          }
          materiaMap.set(materia, entry);
          timeTotal += r.attempt.timeSpentSeconds;
        });

        const subjectStats: SubjectResult[] = Array.from(materiaMap.entries())
          .map(([materia, data]) => ({
            materia,
            total: data.total,
            correct: data.correct,
            accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
          }))
          .sort((a, b) => b.accuracy - a.accuracy);

        setExam(examData);
        setResults(resultsData);
        setSubjectResults(subjectStats);
        setOverallAccuracy(
          resultsData.length > 0 ? Math.round((correctTotal / resultsData.length) * 100) : 0
        );
        setTotalTime(timeTotal);
      } catch (error) {
        console.error('Erro ao carregar resultado:', error);
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [user, examId, router]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) {
      return `${h}h${m}min`;
    }
    return `${m}min`;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-gray-400">Faça login para ver os resultados</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (!exam || results.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 gap-4">
        <p className="text-gray-400">Nenhum resultado encontrado</p>
        <Link
          href="/provas"
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
        >
          Voltar para Provas
        </Link>
      </div>
    );
  }

  const correctCount = results.filter(r => r.attempt.correct).length;
  const incorrectCount = results.length - correctCount;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Resultado da Prova</h1>
            <p className="text-gray-400">{exam.name}</p>
          </div>
          <Link
            href="/provas"
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <Home className="h-4 w-4" />
            Voltar
          </Link>
        </div>

        {/* Resumo Geral */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-lg p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-5 w-5" />
              <span className="text-sm font-medium">Aproveitamento</span>
            </div>
            <div className="text-4xl font-bold">{overallAccuracy}%</div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Check className="h-5 w-5 text-green-400" />
              <span className="text-sm font-medium text-gray-300">Acertos</span>
            </div>
            <div className="text-3xl font-bold text-white">{correctCount}</div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-2">
              <X className="h-5 w-5 text-red-400" />
              <span className="text-sm font-medium text-gray-300">Erros</span>
            </div>
            <div className="text-3xl font-bold text-white">{incorrectCount}</div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-blue-400" />
              <span className="text-sm font-medium text-gray-300">Tempo</span>
            </div>
            <div className="text-3xl font-bold text-white">{formatTime(totalTime)}</div>
          </div>
        </div>

        {/* Desempenho por Matéria */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Desempenho por Matéria
          </h2>
          <div className="space-y-3">
            {subjectResults.map((subject) => (
              <div key={subject.materia} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-white">{subject.materia}</span>
                    <span className="text-sm text-gray-400">
                      {subject.correct}/{subject.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        subject.accuracy >= 70
                          ? 'bg-green-500'
                          : subject.accuracy >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${subject.accuracy}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1 w-16 justify-end">
                  {subject.accuracy >= 70 ? (
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  )}
                  <span className="text-sm font-medium text-white">{subject.accuracy}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lista de Questões */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Questões</h2>
          <div className="space-y-3">
            {results.map((result, idx) => (
              <div
                key={result.question.id}
                className={`p-4 rounded-lg border-l-4 ${
                  result.attempt.correct
                    ? 'bg-green-900/20 border-green-500'
                    : 'bg-red-900/20 border-red-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-400">Questão {idx + 1}</span>
                      <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">
                        {result.question.materia}
                      </span>
                      {result.question.subtema && (
                        <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">
                          {result.question.subtema}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 mb-2 line-clamp-2">
                      {result.question.statement}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400">
                        Sua resposta:{' '}
                        <span
                          className={
                            result.attempt.correct ? 'text-green-400 font-medium' : 'text-red-400 font-medium'
                          }
                        >
                          {result.attempt.selectedOption}
                        </span>
                      </span>
                      {!result.attempt.correct && (
                        <span className="text-gray-400">
                          Correta:{' '}
                          <span className="text-green-400 font-medium">{result.question.answer}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {result.attempt.correct ? (
                      <Check className="h-6 w-6 text-green-400" />
                    ) : (
                      <X className="h-6 w-6 text-red-400" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ações Finais */}
        <div className="flex gap-4 justify-center">
          <Link
            href={`/provas/${examId}/executar`}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors font-medium"
          >
            Refazer Prova
          </Link>
          <Link
            href="/provas"
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
          >
            Ver Outras Provas
          </Link>
        </div>
      </div>
    </div>
  );
}
