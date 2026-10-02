'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Badge, Button } from '@/components';
import {
  MessageSquare,
  CheckCircle2,
  Smartphone,
  Sparkles,
  ExternalLink,
  Clock,
  Loader2,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface WhatsAppTutorCardProps {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
}

export default function WhatsAppTutorCard({
  userId,
  userEmail,
  userName,
}: WhatsAppTutorCardProps) {
  const [isLinked, setIsLinked] = useState<boolean>(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);

  // Pairing State
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);

  // Check linking status from API
  const checkStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/whatsapp/pairing?uid=${userId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setIsLinked(Boolean(data.is_linked));
        setPhone(data.phone || null);
        if (data.is_linked) {
          setPairingCode(null);
          setWhatsappLink(null);
        }
      }
    } catch (err) {
      console.error('Error checking WhatsApp pairing status:', err);
    } finally {
      setLoadingStatus(false);
    }
  }, [userId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Polling when waiting for user to send message
  useEffect(() => {
    if (!pairingCode || isLinked) return;
    const interval = setInterval(() => {
      checkStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [pairingCode, isLinked, checkStatus]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/whatsapp/pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebase_uid: userId,
          email: userEmail,
          display_name: userName,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPairingCode(data.code);
        setWhatsappLink(data.whatsapp_link);
        setCountdown(data.expires_in_seconds || 900);
      }
    } catch (err) {
      console.error('Error generating WhatsApp connection code:', err);
    } finally {
      setGenerating(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <Card padding="lg" variant="default" className="w-full relative overflow-hidden border border-emerald-500/20 bg-gradient-to-br from-card via-card to-emerald-950/10">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10" />

      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-sans text-am-body font-bold text-foreground tracking-wide flex items-center gap-2">
              Tutor WhatsApp
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-500 border-emerald-500/30 bg-emerald-500/5">
                Companion
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              Seu mentor de bolso com RAG jurídico, simulados e áudios matinais.
            </p>
          </div>
        </div>

        {loadingStatus ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : isLinked ? (
          <Badge variant="success" className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-bold flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Conectado
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground font-semibold">
            Não conectado
          </Badge>
        )}
      </div>

      {/* Body */}
      {isLinked ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">WhatsApp Vinculado</p>
                <p className="text-sm font-bold text-foreground font-mono">{phone || 'Número Ativo'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs text-emerald-400 font-medium">Sincronização ativa</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="p-2.5 rounded-lg bg-card/60 border border-border/50 text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Pílula Matinal (08h)
              </span>
              <p className="text-muted-foreground text-[11px]">Áudios com informativos recentes STF/STJ da sua carreira.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-card/60 border border-border/50 text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5 mb-1">
                <Zap className="h-3.5 w-3.5 text-cyan-400" />
                Simulado Almoço (12h)
              </span>
              <p className="text-muted-foreground text-[11px]">1 questão diária com correção e gabarito comentado.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-card/60 border border-border/50 text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5 mb-1">
                <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                Tira-Dúvidas 24/7
              </span>
              <p className="text-muted-foreground text-[11px]">Mande texto ou áudio com dúvidas da lei seca.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Conecte seu WhatsApp ao AprovaMind para receber sua rotina de estudos fora da mesa:
            questões rápidas, pílulas de áudio para ouvir no trânsito e suporte para tirar dúvidas por mensagem de voz.
          </p>

          {pairingCode ? (
            <div className="p-4 rounded-xl bg-card border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Código válido por {formatCountdown(countdown)}
                </span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin text-emerald-500" />
                  Aguardando envio...
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div>
                  <p className="text-[11px] text-muted-foreground">Envie o código abaixo no WhatsApp do AprovaMind:</p>
                  <p className="text-xl font-bold font-mono tracking-widest text-emerald-400 mt-0.5">
                    CONECTAR-{pairingCode}
                  </p>
                </div>

                {whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto"
                  >
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-lg shadow-emerald-900/30"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir no WhatsApp
                    </Button>
                  </a>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                Basta clicar no botão para abrir a conversa já com a mensagem preenchida e enviar!
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span>Configuração em 1 clique sem senhas.</span>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleGenerateCode}
                disabled={generating}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 shadow-md shadow-emerald-950/40"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Gerando código...
                  </>
                ) : (
                  <>
                    <Smartphone className="h-3.5 w-3.5" />
                    Conectar meu WhatsApp
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
