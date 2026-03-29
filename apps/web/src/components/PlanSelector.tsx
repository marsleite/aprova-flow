/**
 * PlanSelector — Seletor de Edital/Plano no Header
 *
 * Dropdown compacto com badge colorido por plano.
 * "Todos os Planos" = visão agregada (planId = null).
 * Botão "+ Novo Edital" abre o PlanManager.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, Layers, Trash2, Pencil } from 'lucide-react';
import { StudyPlanEdital } from '@/types';
import { deleteStudyPlan } from '@/lib/firebase/plans';

interface PlanSelectorProps {
  plans: StudyPlanEdital[];
  activePlanId: string | null;
  onSelect: (planId: string | null) => void;
  onCreatePlan: () => void;
  onEditPlan?: (plan: StudyPlanEdital) => void;
  onDeletePlan?: (planId: string) => void;
}

export default function PlanSelector({
  plans,
  activePlanId,
  onSelect,
  onCreatePlan,
  onEditPlan,
  onDeletePlan,
}: PlanSelectorProps) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activePlan = plans.find((p) => p.id === activePlanId);
  const label = activePlan ? activePlan.name : 'Todos os Planos';
  const color = activePlan?.color || '#6b7280';

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmDelete(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDelete = async (planId: string) => {
    setDeleting(true);
    try {
      await deleteStudyPlan(planId);
      onDeletePlan?.(planId);
      setConfirmDelete(null);
      setOpen(false);
    } catch (err) {
      console.error('Erro ao deletar plano:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative w-full sm:w-auto">
      {/* Botão principal */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-gray-800/50 px-3 py-2 text-sm text-gray-300 transition-all hover:border-border hover:bg-gray-800 sm:w-auto sm:py-1.5"
      >
        {activePlan ? (
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
        ) : (
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate text-left sm:max-w-[160px] sm:flex-none">{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-1.5 min-w-[200px] overflow-hidden rounded-xl border border-border bg-card shadow-xl shadow-black/40 sm:left-auto sm:right-0 sm:w-[320px]"
          >
            {/* Opção "Todos" */}
            <button
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors
                ${!activePlanId ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Todos os Planos</span>
            </button>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Planos */}
            {plans.map((plan) => (
              <div key={plan.id} className="relative group">
                <button
                  onClick={() => {
                    onSelect(plan.id || null);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors
                    ${activePlanId === plan.id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: plan.color }}
                  />
                  <span className="flex-1 truncate">{plan.name}</span>
                  {plan.isDefault && (
                    <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                      padrão
                    </span>
                  )}
                </button>
                {!plan.isDefault && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditPlan?.(plan);
                        setOpen(false);
                      }}
                      title="Editar edital"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-[var(--primary)]" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(plan.id!);
                      }}
                      title="Deletar edital"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400 hover:text-red-300" />
                    </button>
                  </div>
                )}
                {confirmDelete === plan.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-card/95 backdrop-blur-sm rounded-xl">
                    <div className="flex items-center gap-2 px-2">
                      <span className="text-xs text-red-400">Deletar?</span>
                      <button
                        onClick={() => handleDelete(plan.id!)}
                        disabled={deleting}
                        className="rounded bg-red-600 px-2 py-0.5 text-xs text-foreground transition hover:bg-red-500 disabled:opacity-50"
                      >
                        {deleting ? '...' : 'Sim'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs text-muted-foreground hover:text-gray-300"
                      >
                        Não
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Divider + Novo */}
            <div className="border-t border-border" />
            <button
              onClick={() => {
                onCreatePlan();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Novo Edital</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
