'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MessageCircle,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Sparkles,
  Smartphone,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { Button, Badge } from '@/components';

interface WhatsAppPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  onSuccess?: () => void;
}

export default function WhatsAppPairingModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  userName,
  onSuccess,
}: WhatsAppPairingModalProps) {
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [isLinked, setIsLinked] = useState<boolean>(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showQr, setShowQr] = useState<boolean>(false);

  const hasInitiatedRef = useRef(false);

  // Check linking status from API
  const checkStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/whatsapp/pairing?uid=${userId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.is_linked) {
          setIsLinked(true);
          setPhone(data.phone || null);
          onSuccess?.();
        }
        return data.is_linked;
      }
    } catch (err) {
      console.warn('Erro ao verificar status do WhatsApp:', err);
    }
    return false;
  }, [userId, onSuccess]);

  // Generate pairing code
  const handleGenerateCode = useCallback(async () => {
    if (!userId) return;
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
      console.error('Erro ao gerar código do WhatsApp:', err);
    } finally {
      setGenerating(false);
    }
  }, [userId, userEmail, userName]);

  // Trigger generation once when modal opens
  useEffect(() => {
    if (!isOpen) {
      hasInitiatedRef.current = false;
      return;
    }

    if (isOpen && !hasInitiatedRef.current) {
      hasInitiatedRef.current = true;
      checkStatus().then((linked) => {
        if (!linked) {
          handleGenerateCode();
        }
      });
    }
  }, [isOpen, checkStatus, handleGenerateCode]);

  // Polling when modal is open and waiting for user to pair
  useEffect(() => {
    if (!isOpen || isLinked || !pairingCode) return;
    const interval = setInterval(() => {
      checkStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen, isLinked, pairingCode, checkStatus]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleCopy = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(`CONECTAR-${pairingCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-emerald-500/30 bg-card p-6 shadow-2xl shadow-emerald-950/20"
        >
          {/* Background glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>

          {isLinked ? (
            /* Success State */
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  WhatsApp Conectado com Sucesso! 🎉
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground max-w-sm mx-auto">
                  Seu tutor de IA agora está ativo no número <span className="font-mono text-emerald-400 font-semibold">{phone || 'cadastrado'}</span>. Você já pode enviar dúvidas de lei seca ou receber seus simulados diários.
                </p>
              </div>

              <div className="pt-4">
                <Button
                  variant="primary"
                  onClick={onClose}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5"
                >
                  Continuar
                </Button>
              </div>
            </div>
          ) : (
            /* Unlinked Pairing Flow */
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-foreground">
                      Conectar Tutor no WhatsApp
                    </h3>
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      1 Clique
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tire dúvidas jurídicas e receba simulados diários direto no celular.
                  </p>
                </div>
              </div>

              {generating ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                  <p className="text-xs text-muted-foreground">Gerando seu link de conexão segura...</p>
                </div>
              ) : pairingCode ? (
                <div className="space-y-4">
                  {/* Timer & Status */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Código válido por {formatCountdown(countdown)}
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                      <RefreshCw className="h-3 w-3 animate-spin text-emerald-500" />
                      Aguardando envio...
                    </span>
                  </div>

                  {/* Main Action Button */}
                  {whatsappLink && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full"
                    >
                      <Button
                        variant="primary"
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm gap-2 shadow-lg shadow-emerald-950/40 active:scale-[0.98] transition-all"
                      >
                        <MessageCircle className="h-5 w-5" />
                        Abrir WhatsApp e Enviar Mensagem
                        <ExternalLink className="h-4 w-4 ml-auto opacity-70" />
                      </Button>
                    </a>
                  )}

                  {/* Alternative 1: Copy Code */}
                  <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        Ou envie manualmente no WhatsApp:
                      </span>
                      <button
                        onClick={handleCopy}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copiar código
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-card border border-border px-3 py-2">
                      <span className="font-mono text-xs font-bold text-foreground tracking-wider">
                        CONECTAR-{pairingCode}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        (71) 98135-6297
                      </span>
                    </div>
                  </div>

                  {/* Alternative 2: QR Code Toggle */}
                  <div className="pt-1">
                    <button
                      onClick={() => setShowQr((prev) => !prev)}
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 mx-auto transition-colors"
                    >
                      <QrCode className="h-3.5 w-3.5 text-emerald-400" />
                      {showQr ? 'Ocultar QR Code' : 'Escanear QR Code com o celular'}
                    </button>

                    {showQr && whatsappLink && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-border"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                            whatsappLink
                          )}`}
                          alt="QR Code WhatsApp AprovaMind"
                          className="h-36 w-36"
                        />
                        <p className="mt-2 text-[10px] text-zinc-600 font-sans">
                          Aponte a câmera do seu celular para abrir o WhatsApp
                        </p>
                      </motion.div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Button
                    variant="primary"
                    onClick={handleGenerateCode}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    Gerar Código de Conexão
                  </Button>
                </div>
              )}

              {/* Security note */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/80 border-t border-border/60 pt-3">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Conexão criptografada de ponta a ponta. Não acessa suas conversas privadas.</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
