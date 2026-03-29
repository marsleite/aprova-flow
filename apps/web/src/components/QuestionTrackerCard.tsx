/**
 * QuestionTrackerCard — Registro manual de questões
 *
 * Inputs para matéria, total de questões e acertos.
 * Salva no Firestore e notifica o Dashboard para refresh.
 *
 * Polimentos:
 * - Validação: acertos nunca > total (aviso amigável + botão desabilitado)
 * - Feedback: animação de check com framer-motion ao salvar
 * - Auto-seleção: matéria pré-selecionada com base na última sessão
 */

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck,
  Save,
  CheckCircle,
  XCircle,
  BarChart3,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { DEFAULT_SUBJECTS, SubjectWeight } from '@/types';
import { useUserCustomSubjects } from '@/hooks/useUserCustomSubjects';
import { mergeSubjectOptions } from '@/lib/firebase/subjects';
import { saveQuestionSession } from '@/lib/firebase/questions';

interface QuestionTrackerCardProps {
  userId: string;
  planId?: string;
  /** Matérias do plano ativo (usa DEFAULT_SUBJECTS se não houver) */
  planSubjects?: SubjectWeight[];
  /** Matéria da última sessão de estudo (para auto-seleção) */
  lastSessionSubject?: string | null;
  onSaved?: () => void;
}

export default function QuestionTrackerCard({
  userId,
  planId,
  planSubjects,
  lastSessionSubject,
  onSaved,
}: QuestionTrackerCardProps) {
  const [subject, setSubject] = useState('');
  const [totalQuestions, setTotalQuestions] = useState('');
  const [correctAnswers, setCorrectAnswers] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedAccuracy, setSavedAccuracy] = useState<number | null>(null);
  const [savedSubject, setSavedSubject] = useState('');
  const hasAutoSelected = useRef(false);
  const { customSubjects, persistSubject } = useUserCustomSubjects(userId);

  // Matérias: usa as do plano ativo, senão DEFAULT_SUBJECTS
  const subjectList = useMemo(() => {
    const baseSubjects =
      planSubjects && planSubjects.length > 0
        ? planSubjects.map((s) => s.subject)
        : [...DEFAULT_SUBJECTS];

    return mergeSubjectOptions(baseSubjects, customSubjects, lastSessionSubject ? [lastSessionSubject] : []);
  }, [customSubjects, lastSessionSubject, planSubjects]);

  // Auto-seleção: pré-seleciona matéria da última sessão (só 1x)
  useEffect(() => {
    if (lastSessionSubject && !hasAutoSelected.current && subject === '') {
      setSubject(lastSessionSubject);
      hasAutoSelected.current = true;
    }
  }, [lastSessionSubject, subject]);

  const total = parseInt(totalQuestions) || 0;
  const correct = parseInt(correctAnswers) || 0;
  const hasOverflow = correctAnswers !== '' && correct > total && total > 0;
  const normalizedSubject = subject.trim();
  const isValid = normalizedSubject !== '' && total > 0 && correct >= 0 && correct <= total;

  const accuracy = useMemo(() => {
    if (total === 0) return null;
    const clamped = Math.min(correct, total);
    return Math.round((clamped / total) * 100);
  }, [total, correct]);

  const accuracyColor = useMemo(() => {
    if (accuracy === null) return 'text-muted-foreground';
    if (accuracy >= 80) return 'text-emerald-400';
    if (accuracy >= 60) return 'text-amber-400';
    return 'text-red-400';
  }, [accuracy]);

  // Clamp automático: se o usuário digita acertos > total, ajusta para o total
  const handleCorrectChange = (value: string) => {
    setCorrectAnswers(value);
  };

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const finalSubject = await persistSubject(normalizedSubject, subjectList);
      const today = new Date();
      const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const sessionPayload: Parameters<typeof saveQuestionSession>[0] = {
        userId,
        subject: finalSubject,
        totalQuestions: total,
        correctAnswers: correct,
        date,
      };
      if (planId) {
        sessionPayload.planId = planId;
      }
      await saveQuestionSession(sessionPayload);

      const pct = Math.round((correct / total) * 100);
      setSavedAccuracy(pct);
      setSavedSubject(finalSubject);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setSavedAccuracy(null);
        setSavedSubject('');
        setSubject(lastSessionSubject || '');
        setTotalQuestions('');
        setCorrectAnswers('');
      }, 3500);
      onSaved?.();
    } catch (err) {
      console.error('Erro ao salvar questões:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-xl border border-border bg-card p-5"
    >
      {/* Header */}
      <div className="mb-6 flex items-start gap-3">
        <div className="rounded-md border border-border bg-muted p-2">
          <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <h2 className="font-sans text-am-body-lg font-bold text-foreground tracking-tight">Registro Manual</h2>
          <p className="text-am-caption text-muted-foreground mt-0.5 font-mono uppercase tracking-widest">Banco Externo</p>
        </div>
      </div>

      {/* Formulário */}
      <div className="space-y-4">
        <div className="rounded-md border border-am-brand-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
          Provas e simulados do AprovaMind já entram automaticamente na taxa de acerto.
        </div>

        {/* Matéria */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Matéria</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            list="question-tracker-subjects"
            disabled={saving}
            placeholder="Selecione ou digite uma matéria..."
            className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground
                       outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20
                       disabled:opacity-50"
          />
          <datalist id="question-tracker-subjects">
            {subjectList.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Se a matéria não existir ainda, é só digitar que a gente salva para as próximas sessões.
          </p>
        </div>

        {/* Questões + Acertos em grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Total de questões
            </label>
            <input
              type="number"
              min={1}
              max={999}
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(e.target.value)}
              disabled={saving}
              placeholder="0"
              className="w-full rounded-xl border border-border bg-gray-800/50 px-4 py-2.5 text-sm text-foreground
                         outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20
                         disabled:opacity-50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Acertos
            </label>
            <input
              type="number"
              min={0}
              max={total || 999}
              value={correctAnswers}
              onChange={(e) => handleCorrectChange(e.target.value)}
              disabled={saving}
              placeholder="0"
              className={`w-full rounded-xl border bg-gray-800/50 px-4 py-2.5 text-sm text-foreground
                         outline-none transition-all focus:ring-2
                         disabled:opacity-50
                         ${hasOverflow
                  ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-border focus:border-primary focus:ring-primary/20'
                }`}
            />
          </div>
        </div>

        {/* Aviso de overflow */}
        <AnimatePresence>
          {hasOverflow && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                <p className="text-xs text-red-300">
                  Acertos ({correct}) não pode ser maior que o total ({total}).
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview de accuracy */}
        <AnimatePresence mode="wait">
          {total > 0 && !hasOverflow && (
            <motion.div
              key="accuracy-preview"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-sm text-emerald-300">{correct}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5 text-red-400" />
                    <span className="text-sm text-red-300">{total - correct}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className={`text-lg font-bold ${accuracyColor}`}>
                    {accuracy}%
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botão salvar com estados animados */}
        <AnimatePresence mode="wait">
          {saved ? (
            <motion.div
              key="saved"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="space-y-2"
            >
              {/* Toast de sucesso */}
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/20 py-2.5 text-sm font-medium text-emerald-300">
                <motion.div
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                >
                  <CheckCircle className="h-5 w-5" />
                </motion.div>
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  Desempenho registrado!
                </motion.span>
              </div>
              {/* Detalhe da taxa */}
              {savedAccuracy !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-center gap-2 text-xs text-muted-foreground"
                >
                  <span>{savedSubject}</span>
                  <span className="text-gray-600">·</span>
                  <span className={
                    savedAccuracy >= 80 ? 'font-semibold text-emerald-400' :
                      savedAccuracy >= 60 ? 'font-semibold text-amber-400' :
                        'font-semibold text-red-400'
                  }>
                    Taxa de acerto: {savedAccuracy}%
                  </span>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.button
              key="save-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleSave}
              disabled={!isValid || saving || hasOverflow}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-am-body-sm font-medium text-foreground shadow-am-sm transition-colors hover:bg-muted hover:border-border disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Registrar Questões
                </>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
