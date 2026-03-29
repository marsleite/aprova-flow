/**
 * PlanManager — Modal de CRUD para planos de estudo (editais)
 *
 * Permite criar, editar e configurar planos com:
 * - Nome do edital
 * - Cor do badge
 * - Matérias e pesos (soma = 100%)
 * - Meta semanal por edital
 */

'use client';

import { FeatureCode } from '@aprovamind/domain';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  Plus,
  Trash2,
  Loader2,
  BookOpen,
  Target,
  Clock,
  Palette,
  FileUp,
  Check,
  Search,
} from 'lucide-react';
import {
  StudyPlanEdital,
  StudyCapacityDay,
  StudyCapacityHours,
  SubjectWeight,
  DEFAULT_SUBJECTS,
  PLAN_COLORS,
} from '@/types';
import { useEntitlements } from '@/hooks/useEntitlements';
import {
  createStudyPlan,
  updateStudyPlan,
  deleteStudyPlan,
} from '@/lib/firebase/plans';
import { auth } from '@/lib/firebase/config';
import Link from 'next/link';
import {
  buildDefaultStudyCapacityHours,
  normalizeStudyCapacityHours,
  STUDY_CAPACITY_DAY_LABELS,
  STUDY_CAPACITY_DAY_ORDER,
  sumStudyCapacityHours,
} from '@/lib/plans/studyCapacity';

// ==========================================================
// SubjectAutocomplete — input de texto com sugestões
// ==========================================================

function SubjectAutocomplete({
  existingSubjects,
  onAdd,
}: {
  existingSubjects: string[];
  onAdd: (name: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();

  // Filtra sugestões: DEFAULT_SUBJECTS que ainda não foram adicionadas e casam com o texto
  const suggestions = (DEFAULT_SUBJECTS as readonly string[])
    .filter((s) => !existingSubjects.includes(s))
    .filter((s) => trimmed === '' || s.toLowerCase().includes(trimmed.toLowerCase()));

  // Verifica se o texto digitado já existe (case-insensitive) na lista ou nos adicionados
  const isDuplicate = existingSubjects.some(
    (s) => s.toLowerCase() === trimmed.toLowerCase()
  );
  const isExactSuggestion = suggestions.some(
    (s) => s.toLowerCase() === trimmed.toLowerCase()
  );
  const canAddCustom = trimmed.length > 0 && !isDuplicate && !isExactSuggestion;

  const handleAdd = (name: string) => {
    onAdd(name);
    setQuery('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && trimmed) {
      e.preventDefault();
      // Se há exatamente 1 sugestão E o texto digitado bate exatamente, usa a sugestão
      if (suggestions.length === 1 && isExactSuggestion) {
        handleAdd(suggestions[0]);
      } else if (canAddCustom) {
        // Senão, adiciona como matéria personalizada
        handleAdd(trimmed);
      } else if (isExactSuggestion) {
        const match = suggestions.find(
          (s) => s.toLowerCase() === trimmed.toLowerCase()
        );
        if (match) handleAdd(match);
      }
    }
  };

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDropdown = focused && (suggestions.length > 0 || canAddCustom);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar ou digitar matéria..."
          className="w-full rounded-xl border border-dashed border-border bg-transparent py-2.5 pl-9 pr-4 text-sm text-gray-300 outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[180px] overflow-y-auto rounded-xl border border-border bg-gray-800 shadow-xl"
          >
            {/* Opção de adicionar matéria personalizada */}
            {canAddCustom && (
              <button
                onClick={() => handleAdd(trimmed)}
                className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-sm text-[var(--primary)] transition hover:bg-[var(--primary)]/10"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar &quot;{trimmed}&quot;</span>
              </button>
            )}

            {/* Sugestões filtradas */}
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleAdd(s)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 transition hover:bg-muted hover:text-foreground"
              >
                <span className="flex-1">{s}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================================
// PlanManager — Modal principal
// ==========================================================

interface PlanManagerProps {
  isOpen: boolean;
  userId: string;
  editPlan?: StudyPlanEdital | null;
  onClose: () => void;
}

function sanitizeMaterialWorkloadHours(value: string): number | null {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.max(1, Math.min(5000, Math.round(parsed)));
}

export default function PlanManager({
  isOpen,
  userId,
  editPlan,
  onClose,
}: PlanManagerProps) {
  const isEditing = !!editPlan?.id;
  const { hasFeature } = useEntitlements(userId);

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(PLAN_COLORS[0].hex);
  const [weeklyGoalHours, setWeeklyGoalHours] = useState(10);
  const [examDate, setExamDate] = useState('');
  const [materialWorkloadHours, setMaterialWorkloadHours] = useState('');
  const [studyCapacityHours, setStudyCapacityHours] = useState<StudyCapacityHours>(
    buildDefaultStudyCapacityHours(10)
  );
  const [capacityTouched, setCapacityTouched] = useState(false);
  const [subjects, setSubjects] = useState<SubjectWeight[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // PDF Import
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializa com dados do plano a editar
  useEffect(() => {
    if (editPlan) {
      setName(editPlan.name);
      setColor(editPlan.color);
      setWeeklyGoalHours(editPlan.weeklyGoalHours);
      setExamDate(editPlan.examDate ?? '');
      setMaterialWorkloadHours(
        editPlan.materialWorkloadHours != null
          ? String(editPlan.materialWorkloadHours)
          : ''
      );
      setStudyCapacityHours(
        normalizeStudyCapacityHours(
          editPlan.studyCapacityHours,
          editPlan.weeklyGoalHours
        )
      );
      setCapacityTouched(Boolean(editPlan.studyCapacityHours));
      setSubjects([...editPlan.subjects]);
    } else {
      setName('');
      setColor(PLAN_COLORS[Math.floor(Math.random() * PLAN_COLORS.length)].hex);
      setWeeklyGoalHours(10);
      setExamDate('');
      setMaterialWorkloadHours('');
      setStudyCapacityHours(buildDefaultStudyCapacityHours(10));
      setCapacityTouched(false);
      setSubjects([]);
    }
    setConfirmDelete(false);
    setImportError(null);
    setImportSuccess(null);
  }, [editPlan, isOpen]);

  useEffect(() => {
    if (!capacityTouched) {
      setStudyCapacityHours(buildDefaultStudyCapacityHours(weeklyGoalHours));
    }
  }, [weeklyGoalHours, capacityTouched]);

  const [dragging, setDragging] = useState(false);
  const canUseEditalParse = hasFeature(FeatureCode.EditalParse);

  // Processa um arquivo PDF (compartilhado entre input e drag-and-drop)
  const processFile = async (file: File) => {
    // Validação de tipo
    if (file.type !== 'application/pdf') {
      setImportError('Selecione um arquivo PDF válido.');
      return;
    }

    // Validação de tamanho (10MB)
    const MAX_SIZE_MB = 10;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setImportError(`O PDF excede o limite de ${MAX_SIZE_MB}MB.`);
      return;
    }

    setImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      // Converte para base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
        reader.readAsDataURL(file);
      });

      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      // Chama a API
      const res = await fetch('/api/parse-edital', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ pdfBase64: base64, fileName: file.name }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao processar o edital.');
      }

      const data = await res.json();

      // Auto-preenche o formulário
      if (data.planName && !name.trim()) {
        setName(data.planName);
      }
      if (data.subjects?.length > 0) {
        setSubjects(
          data.subjects.map((s: { subject: string; weight: number }) => ({
            subject: s.subject,
            weight: s.weight,
          }))
        );
      }
      if (data.suggestedWeeklyGoalHours) {
        setWeeklyGoalHours(data.suggestedWeeklyGoalHours);
      }
      if (data.examDate && !examDate) {
        setExamDate(data.examDate);
      }

      setImportSuccess(
        `${data.totalSubjectsFound} matéria${data.totalSubjectsFound !== 1 ? 's' : ''} encontrada${data.totalSubjectsFound !== 1 ? 's' : ''} no edital`
      );

      setTimeout(() => setImportSuccess(null), 5000);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'Erro ao processar o edital.'
      );
    } finally {
      setImporting(false);
    }
  };

  // Handler do input file
  const handlePdfInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    processFile(file);
  };

  // Handlers de drag-and-drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!importing) setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (importing) return;

    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // Validação
  const totalWeight = subjects.reduce((acc, s) => acc + s.weight, 0);
  const weeklyCapacityHours = sumStudyCapacityHours(studyCapacityHours);
  const isValid = name.trim() !== '' && subjects.length > 0 && totalWeight === 100;

  const updateStudyCapacityHour = (day: StudyCapacityDay, value: string) => {
    const normalized = value.replace(',', '.').trim();
    const parsed = normalized === '' ? 0 : Number(normalized);
    if (!Number.isFinite(parsed)) return;

    setCapacityTouched(true);
    setStudyCapacityHours((current) => ({
      ...current,
      [day]: Math.max(0, Math.min(16, Math.round(parsed * 10) / 10)),
    }));
  };

  const resetStudyCapacityFromGoal = () => {
    setCapacityTouched(false);
    setStudyCapacityHours(buildDefaultStudyCapacityHours(weeklyGoalHours));
  };

  // Handlers de matérias
  const addSubject = (subjectName: string) => {
    if (subjects.find((s) => s.subject === subjectName)) return;
    const remaining = 100 - totalWeight;
    setSubjects([...subjects, { subject: subjectName, weight: Math.max(0, remaining) }]);
  };

  const removeSubject = (subjectName: string) => {
    setSubjects(subjects.filter((s) => s.subject !== subjectName));
  };

  const updateWeight = (subjectName: string, weight: number) => {
    setSubjects(
      subjects.map((s) =>
        s.subject === subjectName ? { ...s, weight: Math.max(0, Math.min(100, weight)) } : s
      )
    );
  };

  const distributeEvenly = () => {
    if (subjects.length === 0) return;
    const base = Math.floor(100 / subjects.length);
    const remainder = 100 - base * subjects.length;
    setSubjects(
      subjects.map((s, i) => ({ ...s, weight: base + (i < remainder ? 1 : 0) }))
    );
  };

  // Salvar
  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      if (isEditing && editPlan?.id) {
        await updateStudyPlan(editPlan.id, {
          name: name.trim(),
          color,
          weeklyGoalHours,
          examDate: examDate || null,
          materialWorkloadHours: sanitizeMaterialWorkloadHours(materialWorkloadHours),
          studyCapacityHours,
          subjects,
        });
      } else {
        await createStudyPlan(userId, {
          name: name.trim(),
          color,
          weeklyGoalHours,
          examDate: examDate || null,
          materialWorkloadHours: sanitizeMaterialWorkloadHours(materialWorkloadHours),
          studyCapacityHours,
          subjects,
          isDefault: false,
        });
      }
      onClose();
    } catch (err) {
      console.error('Erro ao salvar plano:', err);
    } finally {
      setSaving(false);
    }
  };

  // Deletar
  const handleDelete = async () => {
    if (!editPlan?.id || deleting) return;
    setDeleting(true);
    try {
      await deleteStudyPlan(editPlan.id);
      onClose();
    } catch (err) {
      console.error('Erro ao deletar plano:', err);
    } finally {
      setDeleting(false);
    }
  };

  const existingSubjectNames = subjects.map((s) => s.subject);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="mx-4 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">
                {isEditing ? 'Editar Edital' : 'Novo Edital'}
              </h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-gray-800 hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* Nome */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-300">
                  <BookOpen className="h-4 w-4" />
                  Nome do Edital
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: PGE-SP, Magistratura Federal..."
                  className="w-full rounded-xl border border-border bg-gray-800/50 px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Cor */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-300">
                  <Palette className="h-4 w-4" />
                  Cor
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLAN_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setColor(c.hex)}
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        color === c.hex
                          ? 'scale-110 border-white'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {/* Meta Semanal */}
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-300">
                    <Target className="h-4 w-4" />
                    Meta Semanal (horas)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    value={weeklyGoalHours}
                    onChange={(e) => setWeeklyGoalHours(Math.max(1, Math.min(80, Number(e.target.value))))}
                    className="w-full rounded-xl border border-border bg-gray-800/50 px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Data da prova */}
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-300">
                    <Target className="h-4 w-4" />
                    Data da Prova
                  </label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-gray-800/50 px-4 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Carga estimada */}
                <div>
                  <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-300">
                    <Clock className="h-4 w-4" />
                    Carga do material (horas)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={materialWorkloadHours}
                    onChange={(e) => setMaterialWorkloadHours(e.target.value)}
                    placeholder="Ex: 180"
                    className="w-full rounded-xl border border-border bg-gray-800/50 px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Preencha manualmente por enquanto. Depois podemos estimar pelo PDF do material.
                  </p>
                </div>
              </div>

              {/* Disponibilidade semanal real */}
              <div className="rounded-2xl border border-border bg-muted/60 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Disponibilidade real por dia
                    </p>
                    <p className="text-xs text-muted-foreground">
                      O plano macro e o plano diário passam a usar essa janela real, em vez de assumir 3h fixas.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetStudyCapacityFromGoal}
                    className="rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                  >
                    Recalcular pela meta
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  {STUDY_CAPACITY_DAY_ORDER.map((day) => (
                    <label
                      key={day}
                      className="rounded-xl border border-border bg-gray-800/40 px-3 py-2"
                    >
                      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {STUDY_CAPACITY_DAY_LABELS[day]}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={16}
                          step={0.5}
                          value={studyCapacityHours[day]}
                          onChange={(e) => updateStudyCapacityHour(day, e.target.value)}
                          className="w-full rounded-lg border border-border bg-card/70 px-2 py-1.5 text-center text-sm text-foreground outline-none focus:border-primary"
                        />
                        <span className="text-[11px] text-muted-foreground">h</span>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-card px-3 py-1 text-muted-foreground">
                    Capacidade semanal: <strong className="text-foreground">{weeklyCapacityHours.toFixed(1)}h</strong>
                  </span>
                  <span className="rounded-full bg-card px-3 py-1 text-muted-foreground">
                    Meta atual: <strong className="text-foreground">{weeklyGoalHours}h</strong>
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 ${
                      weeklyCapacityHours + 0.1 >= weeklyGoalHours
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : 'bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    {weeklyCapacityHours + 0.1 >= weeklyGoalHours
                      ? 'Capacidade cobre a meta atual'
                      : 'Sua disponibilidade está abaixo da meta atual'}
                  </span>
                </div>
              </div>

              {/* Importar Edital PDF — Drop Zone */}
              {!isEditing && canUseEditalParse && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handlePdfInput}
                    className="hidden"
                  />
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !importing && fileInputRef.current?.click()}
                    className={`relative cursor-pointer rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all ${
                      dragging
                        ? 'border-primary bg-primary/20 shadow-lg shadow-primary/20'
                        : 'border-primary/30 bg-primary/20 hover:border-primary/50 hover:bg-[var(--primary)]/10'
                    } ${importing ? 'cursor-wait opacity-60' : ''}`}
                  >
                    {importing ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
                        <span className="text-sm text-[var(--primary)]">
                          Analisando edital...
                        </span>
                      </div>
                    ) : dragging ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileUp className="h-6 w-6 text-primary" />
                        <span className="text-sm font-medium text-primary">
                          Solte o PDF aqui
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5">
                        <FileUp className="h-5 w-5 text-[var(--primary)]" />
                        <span className="text-sm text-[var(--primary)]">
                          Importar Edital (PDF)
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Arraste o PDF aqui ou clique para selecionar
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Mensagens de erro/sucesso */}
                  <AnimatePresence>
                    {importError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-center text-xs text-red-400"
                      >
                        {importError}
                      </motion.p>
                    )}
                    {importSuccess && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-xs text-emerald-400"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {importSuccess}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {!isEditing && !canUseEditalParse && (
                <div className="rounded-xl border border-border/50/30 bg-muted px-4 py-5 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <FileUp className="h-4 w-4 text-[var(--primary)]" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Importacao de edital bloqueada neste plano
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    O parse de edital por IA entra a partir do plano pago e ganha mais folga de uso nos niveis superiores.
                  </p>
                  <Link
                    href="/settings"
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/50/30 bg-card px-4 py-2 text-xs font-medium text-primary transition hover:bg-primary/10"
                  >
                    Ver planos
                  </Link>
                </div>
              )}

              {/* Matérias */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">
                    Matérias e Pesos
                  </label>
                  {subjects.length > 0 && (
                    <button
                      onClick={distributeEvenly}
                      className="text-xs text-[var(--primary)] transition hover:text-primary"
                    >
                      Distribuir igual
                    </button>
                  )}
                </div>

                {/* Lista de matérias adicionadas */}
                <div className="mb-3 max-h-[200px] space-y-2 overflow-y-auto pr-1">
                  {subjects.map((sw) => (
                    <div
                      key={sw.subject}
                      className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2"
                    >
                      <span className="flex-1 truncate text-sm text-gray-300">
                        {sw.subject}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={sw.weight}
                        onChange={(e) => updateWeight(sw.subject, Number(e.target.value))}
                        className="w-16 rounded-lg border border-border bg-gray-800/60 px-2 py-1 text-center text-sm text-foreground outline-none focus:border-primary"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                      <button
                        onClick={() => removeSubject(sw.subject)}
                        className="text-gray-600 transition hover:text-red-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Total */}
                {subjects.length > 0 && (
                  <div
                    className={`mb-3 text-center text-xs font-medium ${
                      totalWeight === 100 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    Total: {totalWeight}%{' '}
                    {totalWeight !== 100 && `(precisa somar 100%)`}
                  </div>
                )}

                {/* Adicionar matéria (autocomplete + texto livre) */}
                <SubjectAutocomplete
                  existingSubjects={existingSubjectNames}
                  onAdd={addSubject}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border px-6 py-4">
              <div>
                {isEditing && !editPlan?.isDefault && (
                  <>
                    {confirmDelete ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-400">Tem certeza?</span>
                        <button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-foreground transition hover:bg-red-500 disabled:opacity-50"
                        >
                          {deleting ? 'Deletando...' : 'Sim, deletar'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="text-xs text-muted-foreground hover:text-gray-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Deletar edital
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground transition hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isValid || saving}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary)] px-5 py-2 text-sm font-medium text-foreground shadow-lg shadow-[var(--primary)]/15 transition-all hover:shadow-[var(--primary)]/25 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      {isEditing ? 'Salvar' : 'Criar Edital'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
