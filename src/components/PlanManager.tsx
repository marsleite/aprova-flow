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
  Palette,
  FileUp,
  Check,
  Search,
} from 'lucide-react';
import {
  StudyPlanEdital,
  SubjectWeight,
  DEFAULT_SUBJECTS,
  PLAN_COLORS,
} from '@/types';
import {
  createStudyPlan,
  updateStudyPlan,
  deleteStudyPlan,
} from '@/lib/firebase/plans';
import { auth } from '@/lib/firebase/config';

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
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar ou digitar matéria..."
          className="w-full rounded-xl border border-dashed border-white/10 bg-transparent py-2.5 pl-9 pr-4 text-sm text-gray-300 outline-none transition-all placeholder:text-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
        />
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[180px] overflow-y-auto rounded-xl border border-white/10 bg-gray-800 shadow-xl"
          >
            {/* Opção de adicionar matéria personalizada */}
            {canAddCustom && (
              <button
                onClick={() => handleAdd(trimmed)}
                className="flex w-full items-center gap-2 border-b border-white/5 px-3 py-2 text-left text-sm text-[#F59768] transition hover:bg-[#3150AA]/10"
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
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
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

export default function PlanManager({
  isOpen,
  userId,
  editPlan,
  onClose,
}: PlanManagerProps) {
  const isEditing = !!editPlan?.id;

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(PLAN_COLORS[0].hex);
  const [weeklyGoalHours, setWeeklyGoalHours] = useState(10);
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
      setSubjects([...editPlan.subjects]);
    } else {
      setName('');
      setColor(PLAN_COLORS[Math.floor(Math.random() * PLAN_COLORS.length)].hex);
      setWeeklyGoalHours(10);
      setSubjects([]);
    }
    setConfirmDelete(false);
    setImportError(null);
    setImportSuccess(null);
  }, [editPlan, isOpen]);

  const [dragging, setDragging] = useState(false);

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
  const isValid = name.trim() !== '' && subjects.length > 0 && totalWeight === 100;

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
          subjects,
        });
      } else {
        await createStudyPlan(userId, {
          name: name.trim(),
          color,
          weeklyGoalHours,
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
            className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-gray-900 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">
                {isEditing ? 'Editar Edital' : 'Novo Edital'}
              </h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-800 hover:text-gray-300"
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
                  className="w-full rounded-xl border border-white/10 bg-gray-800/50 px-4 py-2.5 text-sm text-white outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
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
                  className="w-24 rounded-xl border border-white/10 bg-gray-800/50 px-4 py-2.5 text-center text-sm text-white outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              {/* Importar Edital PDF — Drop Zone */}
              {!isEditing && (
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
                        ? 'border-violet-400 bg-violet-500/15 shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                        : 'border-violet-500/30 bg-violet-500/5 hover:border-violet-500/50 hover:bg-[#3150AA]/10'
                    } ${importing ? 'cursor-wait opacity-60' : ''}`}
                  >
                    {importing ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-[#F59768]" />
                        <span className="text-sm text-[#F59768]">
                          Analisando edital...
                        </span>
                      </div>
                    ) : dragging ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileUp className="h-6 w-6 text-violet-300" />
                        <span className="text-sm font-medium text-violet-300">
                          Solte o PDF aqui
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5">
                        <FileUp className="h-5 w-5 text-[#F59768]" />
                        <span className="text-sm text-[#F59768]">
                          Importar Edital (PDF)
                        </span>
                        <span className="text-[10px] text-gray-500">
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

              {/* Matérias */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-300">
                    Matérias e Pesos
                  </label>
                  {subjects.length > 0 && (
                    <button
                      onClick={distributeEvenly}
                      className="text-xs text-[#F59768] transition hover:text-violet-300"
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
                      className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
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
                        className="w-16 rounded-lg border border-white/10 bg-gray-800/60 px-2 py-1 text-center text-sm text-white outline-none focus:border-violet-500"
                      />
                      <span className="text-xs text-gray-500">%</span>
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
            <div className="flex items-center justify-between border-t border-white/5 px-6 py-4">
              <div>
                {isEditing && !editPlan?.isDefault && (
                  <>
                    {confirmDelete ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-400">Tem certeza?</span>
                        <button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white transition hover:bg-red-500 disabled:opacity-50"
                        >
                          {deleting ? 'Deletando...' : 'Sim, deletar'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="text-xs text-gray-500 hover:text-gray-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="flex items-center gap-1.5 text-xs text-gray-500 transition hover:text-red-400"
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
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-400 transition hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isValid || saving}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#F59768] to-[#3150AA] px-5 py-2 text-sm font-medium text-white shadow-lg shadow-[#3150AA]/15 transition-all hover:shadow-[#3150AA]/25 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
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
