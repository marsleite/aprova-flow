'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { loadExamQuestions, getExamById, saveQuestionAttempts } from '@/lib/firebase/questions';
import { ExamMetadata, QuestionBankItem, QuestionAttempt } from '@/types';
import { Clock, ChevronLeft, ChevronRight, Flag, Check, X } from 'lucide-react';

interface QuestionState {
  question: QuestionBankItem;
  selectedAnswer: string | null;
  markedForReview: boolean;
}

export default function ExecutarProvaPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthContext();
  const examId = params.id as string;

  const [exam, setExam] = useState<ExamMetadata | null>(null);
  const [questions, setQuestions] = useState<QuestionState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  // Carrega prova e questões
  useEffect(() => {
    if (!user || !examId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const examData = await getExamById(examId);
        if (!examData) {
          router.push('/provas');
          return;
        }

        const questionsData = await loadExamQuestions(examId);
        
        setExam(examData);
        setQuestions(
          questionsData.map(q => ({
            question: q,
            selectedAnswer: null,
            markedForReview: false,
          }))
        );
        
        // Configura timer
        if (examData.durationMinutes) {
          setTimeRemaining(examData.durationMinutes * 60);
        }
      } catch (error) {
        console.error('Erro ao carregar prova:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, examId, router]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0 || loading) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, loading]);

  const handleSelectAnswer = (key: string) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[currentIndex].selectedAnswer = key;
      return updated;
    });
  };

  const handleToggleReview = () => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[currentIndex].markedForReview = !updated[currentIndex].markedForReview;
      return updated;
    });
  };

  const handleFinish = useCallback(async () => {
    if (!user || !exam) return;

    // Salva tentativas
    const attempts: QuestionAttempt[] = questions
      .filter(q => q.selectedAnswer !== null)
      .map(q => ({
        userId: user.uid,
        questionId: q.question.id!,
        examId: exam.id!,
        attemptType: 'exam' as const,
        selectedOption: q.selectedAnswer!,
        correct: q.selectedAnswer === q.question.answer,
        timeSpentSeconds: exam.durationMinutes ? (exam.durationMinutes * 60 - timeRemaining) / questions.length : 0,
      }));

    try {
      await saveQuestionAttempts(attempts);
      router.push(`/provas/${examId}/resultado`);
    } catch (error) {
      console.error('Erro ao salvar resultado:', error);
    }
  }, [user, exam, questions, timeRemaining, examId, router]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-gray-400">Faça login para continuar</p>
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

  if (!exam || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-gray-400">Prova não encontrada</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter(q => q.selectedAnswer !== null).length;
  const reviewCount = questions.filter(q => q.markedForReview).length;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">{exam.name}</h1>
            <p className="text-sm text-gray-400">
              Questão {currentIndex + 1} de {questions.length}
            </p>
          </div>
          
          <div className="flex items-center gap-6">
            {exam.durationMinutes && (
              <div className="flex items-center gap-2 text-white">
                <Clock className="h-5 w-5" />
                <span className="text-xl font-mono">{formatTime(timeRemaining)}</span>
              </div>
            )}
            
            <button
              onClick={() => setShowFinishConfirm(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Finalizar Prova
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Área Principal - Questão */}
        <div className="lg:col-span-3 space-y-6">
          {/* Enunciado */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="prose prose-invert max-w-none">
              <p className="text-white whitespace-pre-wrap">{currentQuestion.question.statement}</p>
            </div>
          </div>

          {/* Alternativas */}
          <div className="space-y-3">
            {currentQuestion.question.alternatives.map((alt) => (
              <button
                key={alt.key}
                onClick={() => handleSelectAnswer(alt.key)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  currentQuestion.selectedAnswer === alt.key
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    currentQuestion.selectedAnswer === alt.key
                      ? 'bg-violet-500 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    {alt.key}
                  </span>
                  <span className="text-gray-200 flex-1">{alt.text}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Ações */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleToggleReview}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentQuestion.markedForReview
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              <Flag className="h-4 w-4" />
              {currentQuestion.markedForReview ? 'Desmarca Revisão' : 'Marcar para Revisar'}
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
              
              <button
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIndex === questions.length - 1}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Status */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h3 className="font-semibold text-white mb-3">Progresso</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Respondidas</span>
                <span className="text-white font-medium">{answeredCount}/{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Para revisar</span>
                <span className="text-amber-400 font-medium">{reviewCount}</span>
              </div>
            </div>
          </div>

          {/* Grid de questões */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h3 className="font-semibold text-white mb-3">Questões</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`aspect-square rounded flex items-center justify-center text-sm font-medium transition-all ${
                    idx === currentIndex
                      ? 'bg-violet-600 text-white ring-2 ring-violet-400'
                      : q.selectedAnswer
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : q.markedForReview
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmação */}
      {showFinishConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-white mb-4">Finalizar Prova?</h2>
            <p className="text-gray-400 mb-6">
              Você respondeu {answeredCount} de {questions.length} questões.
              {reviewCount > 0 && ` Há ${reviewCount} questão(ões) marcadas para revisão.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinishConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Continuar
              </button>
              <button
                onClick={handleFinish}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
