'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  Zap,
  Flame,
  Clock,
  Target,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  planName?: string;
  weeklyHours: number;
  streakDays: number;
  accuracyPercent?: number | null;
}

export default function ShareCardModal({
  isOpen,
  onClose,
  userName,
  planName = 'Concurso Público',
  weeklyHours,
  streakDays,
  accuracyPercent,
}: ShareCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyText = () => {
    const text = `🔥 Meu Ritmo no AprovaMind:\n⏱️ ${weeklyHours.toFixed(1)}h líquidas esta semana\n⚡ ${streakDays} dias de ofensiva contínua\n🎯 ${accuracyPercent ?? 82}% de precisão média\n📚 Foco: ${planName}\n\nOtimize seus estudos com o AprovaMind: https://aprovamind.com.br`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl text-foreground"
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-base text-foreground">
                Compartilhar Meu Ritmo
              </h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-muted-foreground transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="mb-5 text-xs text-muted-foreground">
            Card otimizado para stories do Instagram (9:16) ou compartilhamento com amigos concurseiros.
          </p>

          {/* 9:16 Shareable Story Card Preview */}
          <div
            ref={cardRef}
            className="relative mx-auto aspect-[9/16] w-full max-w-[280px] rounded-2xl border border-white/15 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-5 shadow-2xl flex flex-col justify-between overflow-hidden"
          >
            {/* Ambient Background Lights */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 -bottom-16 h-44 w-44 rounded-full bg-emerald-500/15 blur-3xl" />

            {/* Top Branding */}
            <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white shadow-md">
                  <Zap className="h-4 w-4" />
                </div>
                <span className="text-sm font-extrabold tracking-tight text-white">
                  Aprova<span className="text-primary">Mind</span>
                </span>
              </div>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-zinc-300">
                Modo Execução
              </span>
            </div>

            {/* Middle Stats */}
            <div className="relative z-10 space-y-4 my-auto">
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Concurseiro em Foco
                </span>
                <h4 className="text-base font-bold text-white line-clamp-1">
                  {userName || 'Concurseiro(a)'}
                </h4>
                <p className="text-[11px] font-medium text-primary line-clamp-1">
                  {planName}
                </p>
              </div>

              {/* Big Metric: Liquid Hours */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md">
                <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Horas Líquidas Semanais</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-3xl font-extrabold text-white">
                    {weeklyHours.toFixed(1)}
                  </span>
                  <span className="text-xs font-semibold text-zinc-400">horas</span>
                </div>
              </div>

              {/* Grid 2 Metrics: Streak + Retention */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-md">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] mb-1">
                    <Flame className="h-3.5 w-3.5 text-orange-400" />
                    <span>Ofensiva</span>
                  </div>
                  <span className="font-mono text-xl font-bold text-white">
                    {streakDays} <span className="text-xs text-zinc-400">dias</span>
                  </span>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-md">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] mb-1">
                    <Target className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Precisão</span>
                  </div>
                  <span className="font-mono text-xl font-bold text-emerald-400">
                    {accuracyPercent ?? 82}%
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Footer Call to Action */}
            <div className="relative z-10 border-t border-white/10 pt-3 text-center">
              <p className="text-[10px] text-zinc-400 font-medium">
                Cronômetro Líquido & Mentor IA Omnicanal
              </p>
              <p className="font-mono text-[11px] font-bold text-white tracking-wider mt-0.5">
                aprovamind.com.br
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-5 flex gap-2">
            <button
              onClick={handleCopyText}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copiar Resumo</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Meu Ritmo de Estudo no AprovaMind',
                    text: `Estou mantendo ${weeklyHours.toFixed(1)}h líquidas e ofensiva de ${streakDays} dias no AprovaMind!`,
                    url: 'https://aprovamind.com.br',
                  }).catch(() => {});
                } else {
                  handleCopyText();
                }
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
            >
              <Share2 className="h-4 w-4" />
              <span>Compartilhar</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
