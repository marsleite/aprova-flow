'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, Smartphone, ArrowRight, CheckCircle2, Sparkles, X } from 'lucide-react';

interface WhatsAppBannerProps {
  userId: string;
}

export default function WhatsAppBanner({ userId }: WhatsAppBannerProps) {
  const [isLinked, setIsLinked] = useState<boolean | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;

    async function checkStatus() {
      try {
        const res = await fetch(`/api/whatsapp/pairing?uid=${userId}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setIsLinked(Boolean(data.is_linked));
            setPhone(data.phone || null);
          }
        }
      } catch {
        // Silent catch for banner
      }
    }

    checkStatus();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (dismissed || isLinked === null) return null;

  if (isLinked) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground transition-all">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <MessageSquare className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="font-semibold text-foreground mr-1.5">Tutor WhatsApp Ativo:</span>
            <span className="text-muted-foreground font-mono text-[11px]">{phone || 'Conectado'}</span>
            <span className="hidden sm:inline text-muted-foreground text-[11px]"> · Simulados às 12h e pílulas matinais ativas.</span>
          </div>
        </div>

        <Link
          href="/settings"
          className="text-emerald-400 hover:text-emerald-300 font-medium shrink-0 flex items-center gap-1 hover:underline text-[11px]"
        >
          Configurar
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-emerald-950/30 via-card to-card border border-emerald-500/30 shadow-sm">
      <div className="flex items-start sm:items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
          <Smartphone className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-xs">Ative seu Tutor no WhatsApp</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Novo
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Tire dúvidas jurídicas com jurisprudência STF/STJ e receba simulados rápidos direto no seu celular.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm"
        >
          <Sparkles className="h-3 w-3" />
          Conectar WhatsApp
          <ArrowRight className="h-3 w-3" />
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          title="Fechar aviso"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
