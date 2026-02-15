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
import { ChevronDown, Plus, Layers } from 'lucide-react';
import { StudyPlanEdital } from '@/types';

interface PlanSelectorProps {
  plans: StudyPlanEdital[];
  activePlanId: string | null;
  onSelect: (planId: string | null) => void;
  onCreatePlan: () => void;
}

export default function PlanSelector({
  plans,
  activePlanId,
  onSelect,
  onCreatePlan,
}: PlanSelectorProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activePlan = plans.find((p) => p.id === activePlanId);
  const label = activePlan ? activePlan.name : 'Todos os Planos';
  const color = activePlan?.color || '#6b7280';

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Botão principal */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-gray-800/50 px-3 py-1.5 text-sm text-gray-300 transition-all hover:border-white/20 hover:bg-gray-800"
      >
        {activePlan ? (
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
        ) : (
          <Layers className="h-3.5 w-3.5 text-gray-500" />
        )}
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-500 transition-transform ${
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
            className="absolute right-0 top-full z-50 mt-1.5 min-w-[200px] overflow-hidden rounded-xl border border-white/10 bg-gray-900 shadow-xl shadow-black/40"
          >
            {/* Opção "Todos" */}
            <button
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors
                ${!activePlanId ? 'bg-white/5 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Layers className="h-3.5 w-3.5 text-gray-500" />
              <span>Todos os Planos</span>
            </button>

            {/* Divider */}
            <div className="border-t border-white/5" />

            {/* Planos */}
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => {
                  onSelect(plan.id || null);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors
                  ${activePlanId === plan.id ? 'bg-white/5 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: plan.color }}
                />
                <span className="flex-1 truncate">{plan.name}</span>
                {plan.isDefault && (
                  <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[9px] text-gray-500">
                    padrão
                  </span>
                )}
              </button>
            ))}

            {/* Divider + Novo */}
            <div className="border-t border-white/5" />
            <button
              onClick={() => {
                onCreatePlan();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-violet-400 transition-colors hover:bg-violet-500/10"
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
