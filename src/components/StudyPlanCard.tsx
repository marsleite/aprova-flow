/**
 * Card de Plano de Estudo — Pesos por Matéria
 *
 * Permite configurar a distribuição ideal de estudo
 * e mostra a comparação planejado vs real.
 */

'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Settings, Save, Check, X, ChevronDown, ChevronUp, Search, Plus } from 'lucide-react';
import { PlanVsActual, SubjectWeight, DEFAULT_SUBJECTS } from '@/types';

// ==========================================================
// SubjectInput — input com autocomplete + texto livre
// ==========================================================

function SubjectInput({
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

  const suggestions = (DEFAULT_SUBJECTS as readonly string[])
    .filter((s) => !existingSubjects.includes(s))
    .filter((s) => trimmed === '' || s.toLowerCase().includes(trimmed.toLowerCase()));

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
      if (canAddCustom) {
        handleAdd(trimmed);
      } else if (isExactSuggestion) {
        const match = suggestions.find(
          (s) => s.toLowerCase() === trimmed.toLowerCase()
        );
        if (match) handleAdd(match);
      } else if (suggestions.length === 1) {
        handleAdd(suggestions[0]);
      }
    }
  };

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
    <div ref={containerRef} className="relative mb-3">
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
          className="w-full rounded-lg border border-white/10 bg-gray-800/60 py-2 pl-9 pr-4 text-sm text-gray-300 outline-none transition-all placeholder:text-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
        />
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[160px] overflow-y-auto rounded-xl border border-white/10 bg-gray-800 shadow-xl"
          >
            {canAddCustom && (
              <button
                onClick={() => handleAdd(trimmed)}
                className="flex w-full items-center gap-2 border-b border-white/5 px-3 py-2 text-left text-sm text-violet-400 transition hover:bg-violet-500/10"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar &quot;{trimmed}&quot;</span>
              </button>
            )}
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
// StudyPlanCard
// ==========================================================

interface StudyPlanCardProps {
  planVsActual: PlanVsActual[];
  currentWeights: SubjectWeight[];
  loading?: boolean;
  onSavePlan: (subjects: SubjectWeight[]) => Promise<void>;
}

function StatusBadge({ status }: { status: PlanVsActual['status'] }) {
  const map = {
    ok: { label: 'OK', cls: 'bg-emerald-500/15 text-emerald-400' },
    neglected: { label: 'Abaixo', cls: 'bg-amber-500/15 text-amber-400' },
    over: { label: 'Acima', cls: 'bg-blue-500/15 text-blue-400' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export default function StudyPlanCard({
  planVsActual,
  currentWeights,
  loading,
  onSavePlan,
}: StudyPlanCardProps) {
  const [editing, setEditing] = useState(false);
  const [weights, setWeights] = useState<SubjectWeight[]>(currentWeights);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const totalWeight = useMemo(
    () => weights.reduce((acc, w) => acc + w.weight, 0),
    [weights]
  );
  const isValid = totalWeight === 100;

  const handleWeightChange = (subject: string, value: number) => {
    setWeights((prev) =>
      prev.map((w) => (w.subject === subject ? { ...w, weight: value } : w))
    );
  };

  const handleAddSubject = (subject: string) => {
    if (weights.find((w) => w.subject === subject)) return;
    setWeights((prev) => [...prev, { subject, weight: 0 }]);
  };

  const handleRemoveSubject = (subject: string) => {
    setWeights((prev) => prev.filter((w) => w.subject !== subject));
  };

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await onSavePlan(weights);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = () => {
    setWeights(
      currentWeights.length > 0
        ? currentWeights
        : DEFAULT_SUBJECTS.slice(0, 5).map((s) => ({ subject: s, weight: 20 }))
    );
    setEditing(true);
  };

  const hasPlan = planVsActual.length > 0;

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-white/10 bg-gray-900/70 p-6">
        <div className="mb-4 h-6 w-40 rounded bg-gray-800" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 rounded bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-950 p-6 shadow-2xl"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-pink-500/20 p-2.5">
            <BookOpen className="h-5 w-5 text-pink-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Plano de Estudo</h3>
            <p className="text-sm text-gray-400">Planejado vs Real</p>
          </div>
        </div>
        {!editing && (
          <button
            onClick={handleStartEdit}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 transition hover:border-violet-500/30 hover:text-violet-300"
          >
            <Settings className="h-3.5 w-3.5" />
            {hasPlan ? 'Editar' : 'Configurar'}
          </button>
        )}
      </div>

      {/* Modo edição */}
      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Lista de matérias editáveis */}
            <div className="mb-3 max-h-[280px] space-y-2 overflow-y-auto pr-1">
              {weights.map((w) => (
                <div
                  key={w.subject}
                  className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                >
                  <span className="flex-1 truncate text-sm text-gray-300">
                    {w.subject}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={w.weight}
                    onChange={(e) =>
                      handleWeightChange(w.subject, Math.max(0, Math.min(100, Number(e.target.value))))
                    }
                    className="w-16 rounded-lg border border-white/10 bg-gray-800/60 px-2 py-1 text-center text-sm text-white outline-none focus:border-violet-500"
                  />
                  <span className="text-xs text-gray-500">%</span>
                  <button
                    onClick={() => handleRemoveSubject(w.subject)}
                    className="text-gray-600 hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Adicionar matéria (autocomplete + texto livre) */}
            <SubjectInput
              existingSubjects={weights.map((w) => w.subject)}
              onAdd={handleAddSubject}
            />

            {/* Total e ações */}
            <div className="flex items-center justify-between border-t border-white/5 pt-3">
              <span
                className={`text-sm font-medium ${
                  isValid ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                Total: {totalWeight}%{' '}
                {isValid ? (
                  <Check className="inline h-4 w-4" />
                ) : (
                  `(deve ser 100%)`
                )}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isValid || saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  <Save className={`h-3.5 w-3.5 ${saving ? 'animate-spin' : ''}`} />
                  Salvar
                </button>
              </div>
            </div>
          </motion.div>
        ) : !hasPlan ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-8 text-center"
          >
            <BookOpen className="mb-2 h-8 w-8 text-gray-600" />
            <p className="text-sm text-gray-500">Nenhum plano configurado</p>
            <p className="mt-1 text-xs text-gray-600">
              Defina pesos por matéria para ver se está no caminho certo
            </p>
          </motion.div>
        ) : (
          <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Lista planejado vs real */}
            <div className="space-y-2">
              {(expanded ? planVsActual : planVsActual.slice(0, 4)).map((item) => (
                <div
                  key={item.subject}
                  className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="truncate text-sm text-white">{item.subject}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Barra dupla: planejado (borda) vs real (preenchido) */}
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
                      {/* Marcador do planejado */}
                      <div
                        className="absolute top-0 h-full border-r-2 border-dashed border-gray-500"
                        style={{ width: `${item.plannedPercent}%` }}
                      />
                      {/* Barra do real */}
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.status === 'neglected'
                            ? 'bg-amber-500'
                            : item.status === 'over'
                            ? 'bg-blue-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(3, item.actualPercent))}%` }}
                      />
                    </div>
                    <span className="w-20 text-right text-xs text-gray-400">
                      {item.actualPercent}% / {item.plannedPercent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Expandir/recolher */}
            {planVsActual.length > 4 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-2 flex w-full items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-300"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" /> Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" /> Ver todas ({planVsActual.length})
                  </>
                )}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
