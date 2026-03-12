'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { loadExamQuestions, getExamById, saveQuestionAttempts, getSimulatedConfigById, getQuestionById } from '@/lib/firebase/questions';
import { ExamMetadata, QuestionBankItem, QuestionAttempt } from '@/types';
import { Clock, ChevronLeft, ChevronRight, Flag } from 'lucide-react';

interface QuestionState {
  question: QuestionBankItem;
  selectedAnswer: string | null;
  markedForReview: boolean;
}

interface PersistedExamTimer {
  durationSeconds: number;
  startedAt: string;
  endsAt: string;
}

interface PersistedQuestionProgress {
  selectedAnswer: string | null;
  markedForReview: boolean;
}

interface PersistedExamProgress {
  currentIndex: number;
  responses: PersistedQuestionProgress[];
}

const EXAM_TIMER_STORAGE_KEY_PREFIX = 'aprova-flow:exam-timer';
const EXAM_PROGRESS_STORAGE_KEY_PREFIX = 'aprova-flow:exam-progress';

function getExamTimerStorageKey(userId: string, examId: string): string {
  return `${EXAM_TIMER_STORAGE_KEY_PREFIX}:${userId}:${examId}`;
}

function getExamProgressStorageKey(userId: string, examId: string): string {
  return `${EXAM_PROGRESS_STORAGE_KEY_PREFIX}:${userId}:${examId}`;
}

function parsePersistedExamTimer(rawValue: string | null): PersistedExamTimer | null {
  if (!rawValue) return null;
  try {
    const parsed = JSON.parse(rawValue) as Partial<PersistedExamTimer>;
    if (
      typeof parsed.durationSeconds !== 'number' ||
      !Number.isFinite(parsed.durationSeconds) ||
      parsed.durationSeconds <= 0 ||
      typeof parsed.startedAt !== 'string' ||
      parsed.startedAt.length === 0 ||
      typeof parsed.endsAt !== 'string' ||
      parsed.endsAt.length === 0
    ) {
      return null;
    }
    return {
      durationSeconds: Math.floor(parsed.durationSeconds),
      startedAt: parsed.startedAt,
      endsAt: parsed.endsAt,
    };
  } catch {
    return null;
  }
}

function parsePersistedExamProgress(rawValue: string | null): PersistedExamProgress | null {
  if (!rawValue) return null;
  try {
    const parsed = JSON.parse(rawValue) as Partial<PersistedExamProgress>;
    if (
      typeof parsed.currentIndex !== 'number' ||
      !Number.isFinite(parsed.currentIndex) ||
      parsed.currentIndex < 0 ||
      !Array.isArray(parsed.responses)
    ) {
      return null;
    }

    const responses = parsed.responses.map((item) => {
      if (!item || typeof item !== 'object') return null;
      const selectedAnswer =
        typeof item.selectedAnswer === 'string' || item.selectedAnswer === null
          ? item.selectedAnswer
          : null;
      const markedForReview = typeof item.markedForReview === 'boolean' ? item.markedForReview : null;
      if (markedForReview === null) return null;
      return {
        selectedAnswer,
        markedForReview,
      };
    });

    if (responses.some((item) => item === null)) return null;
    return {
      currentIndex: Math.floor(parsed.currentIndex),
      responses: responses as PersistedQuestionProgress[],
    };
  } catch {
    return null;
  }
}

function savePersistedExamTimer(storageKey: string, timer: PersistedExamTimer): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(timer));
}

function getRemainingSecondsFromDeadline(deadlineMs: number): number {
  return Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
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
  const [timerDeadlineMs, setTimerDeadlineMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const isFinishingRef = useRef(false);

  useEffect(() => {
    isFinishingRef.current = false;
  }, [examId, user?.uid]);

  // Carrega prova e questões
  useEffect(() => {
    if (!user || !examId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Tenta carregar como exame primeiro
        let examData = await getExamById(examId);
        let questionsData: QuestionBankItem[] = [];

        if (examData) {
          // É um exame oficial
          questionsData = await loadExamQuestions(examId);
        } else {
          // Tenta como simulado personalizado
          const simuladoConfig = await getSimulatedConfigById(examId);
          if (!simuladoConfig || !simuladoConfig.questionIds || simuladoConfig.questionIds.length === 0) {
            router.push('/provas');
            return;
          }

          // Carrega questões individuais
          const loadedQuestions = await Promise.all(
            simuladoConfig.questionIds.map(qId => getQuestionById(qId))
          );
          questionsData = loadedQuestions.filter(Boolean) as QuestionBankItem[];

          // Cria um ExamMetadata virtual para reutilizar toda a lógica existente
          examData = {
            id: simuladoConfig.id,
            name: simuladoConfig.smartMode ? 'Simulado Inteligente' : 'Simulado Personalizado',
            durationMinutes: simuladoConfig.durationMinutes,
            questions: simuladoConfig.questionIds,
          };
        }

        const defaultQuestions: QuestionState[] = questionsData.map((q): QuestionState => ({
          question: q,
          selectedAnswer: null,
          markedForReview: false,
        }));
        const progressStorageKey = getExamProgressStorageKey(user.uid, examId);
        const persistedProgress = parsePersistedExamProgress(
          window.localStorage.getItem(progressStorageKey)
        );

        let restoredQuestions = defaultQuestions;
        let restoredCurrentIndex = 0;
        if (persistedProgress && persistedProgress.responses.length === defaultQuestions.length) {
          restoredQuestions = defaultQuestions.map((questionState, idx) => {
            const saved = persistedProgress.responses[idx];
            const selectedAnswer =
              saved.selectedAnswer &&
                questionState.question.alternatives.some((alt) => alt.key === saved.selectedAnswer)
                ? saved.selectedAnswer
                : null;
            return {
              ...questionState,
              selectedAnswer,
              markedForReview: saved.markedForReview,
            };
          });

          restoredCurrentIndex = Math.min(
            Math.max(0, persistedProgress.currentIndex),
            Math.max(0, defaultQuestions.length - 1)
          );
        }

        setExam(examData);
        setQuestions(restoredQuestions);
        setCurrentIndex(restoredCurrentIndex);

        if (examData.durationMinutes && examData.durationMinutes > 0) {
          const durationSeconds = Math.floor(examData.durationMinutes * 60);
          const storageKey = getExamTimerStorageKey(user.uid, examId);
          const persisted = parsePersistedExamTimer(window.localStorage.getItem(storageKey));

          let deadlineMs: number | null = null;
          if (persisted && persisted.durationSeconds === durationSeconds) {
            const parsedDeadlineMs = Date.parse(persisted.endsAt);
            if (!Number.isNaN(parsedDeadlineMs)) {
              deadlineMs = parsedDeadlineMs;
            }
          }

          if (deadlineMs === null) {
            const startedAt = new Date();
            deadlineMs = startedAt.getTime() + durationSeconds * 1000;
            savePersistedExamTimer(storageKey, {
              durationSeconds,
              startedAt: startedAt.toISOString(),
              endsAt: new Date(deadlineMs).toISOString(),
            });
          }

          setTimerDeadlineMs(deadlineMs);
          setTimeRemaining(getRemainingSecondsFromDeadline(deadlineMs));
        } else {
          setTimerDeadlineMs(null);
          setTimeRemaining(0);
        }
      } catch (error) {
        console.error('Erro ao carregar prova:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, examId, router]);

  useEffect(() => {
    if (!user || !examId || questions.length === 0) return;
    const progressStorageKey = getExamProgressStorageKey(user.uid, examId);
    const payload: PersistedExamProgress = {
      currentIndex,
      responses: questions.map((question) => ({
        selectedAnswer: question.selectedAnswer,
        markedForReview: question.markedForReview,
      })),
    };
    window.localStorage.setItem(progressStorageKey, JSON.stringify(payload));
  }, [user, examId, questions, currentIndex]);

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
    if (!user || !exam || isFinishingRef.current) return;
    isFinishingRef.current = true;

    const durationSeconds =
      exam.durationMinutes && exam.durationMinutes > 0 ? Math.floor(exam.durationMinutes * 60) : 0;
    const remainingSeconds =
      durationSeconds > 0 && timerDeadlineMs
        ? getRemainingSecondsFromDeadline(timerDeadlineMs)
        : Math.max(0, Math.floor(timeRemaining));
    const elapsedSeconds = durationSeconds > 0 ? Math.max(0, durationSeconds - remainingSeconds) : 0;
    const timePerQuestion = questions.length > 0 ? elapsedSeconds / questions.length : 0;

    // Salva tentativas
    const attempts: QuestionAttempt[] = questions
      .filter(q => q.selectedAnswer !== null)
      .map(q => ({
        userId: user.uid,
        planId: exam.planId || null,
        questionId: q.question.id!,
        examId: exam.id || null,
        attemptType: 'simulado' as const,
        selectedOption: q.selectedAnswer!,
        correct: q.selectedAnswer === q.question.answer,
        timeSpentSeconds: timePerQuestion,
      }));

    try {
      await saveQuestionAttempts(attempts);
      window.localStorage.removeItem(getExamProgressStorageKey(user.uid, examId));
      if (exam.durationMinutes && exam.durationMinutes > 0) {
        window.localStorage.removeItem(getExamTimerStorageKey(user.uid, examId));
      }
      setTimerDeadlineMs(null);
      setTimeRemaining(0);
      router.push(`/provas/${examId}/resultado`);
    } catch (error) {
      console.error('Erro ao salvar resultado:', error);
      isFinishingRef.current = false;
    }
  }, [user, exam, questions, timeRemaining, examId, router, timerDeadlineMs]);

  // Timer countdown por deadline persistida
  useEffect(() => {
    if (!timerDeadlineMs || loading) return;

    const tick = () => {
      const remaining = getRemainingSecondsFromDeadline(timerDeadlineMs);
      setTimeRemaining(remaining);
      if (remaining <= 0 && !isFinishingRef.current) {
        void handleFinish();
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);

    return () => window.clearInterval(interval);
  }, [timerDeadlineMs, loading, handleFinish]);

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
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">{exam.name}</h1>
            <p className="text-sm text-gray-400">
              Questão {currentIndex + 1} de {questions.length}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-6">
            {exam.durationMinutes && (
              <div className="flex items-center gap-2 text-white">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-lg font-mono sm:text-xl">{formatTime(timeRemaining)}</span>
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

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 p-4 sm:gap-6 sm:p-6 lg:grid-cols-4">
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
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${currentQuestion.selectedAnswer === alt.key
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold ${currentQuestion.selectedAnswer === alt.key
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={handleToggleReview}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentQuestion.markedForReview
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
            >
              <Flag className="h-4 w-4" />
              {currentQuestion.markedForReview ? 'Desmarca Revisão' : 'Marcar para Revisar'}
            </button>

            <div className="flex w-full gap-2 sm:w-auto">
              <button
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>

              <button
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIndex === questions.length - 1}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
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
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {questions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`aspect-square rounded flex items-center justify-center text-sm font-medium transition-all ${idx === currentIndex
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
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setShowFinishConfirm(false)}
                className="flex-1 rounded-lg bg-gray-700 px-4 py-2 text-white transition-colors hover:bg-gray-600"
              >
                Continuar
              </button>
              <button
                onClick={handleFinish}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
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
