'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  Zap,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Sparkles,
  Smartphone,
  Shield,
  Check,
} from 'lucide-react';
import Link from 'next/link';

function ConectarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const { user, loading: authLoading, signInWithGoogle } = useAuthContext();

  const [loadingToken, setLoadingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [phoneMasked, setPhoneMasked] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [linkedSuccess, setLinkedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasRedeemedRef = useRef(false);

  // 1. Verify token on mount
  useEffect(() => {
    if (!token) {
      setLoadingToken(false);
      setTokenValid(false);
      setErrorMessage('Nenhum código de conexão informado.');
      return;
    }

    let isMounted = true;
    const verifyToken = async () => {
      try {
        const res = await fetch(`/api/whatsapp/magic-link?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (isMounted) {
          if (res.ok && data.valid) {
            setTokenValid(true);
            setPhoneMasked(data.phone_masked || 'WhatsApp');
          } else {
            setTokenValid(false);
            setErrorMessage('Este link de conexão é inválido ou já expirou.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setTokenValid(false);
          setErrorMessage('Erro de comunicação ao validar token de conexão.');
        }
      } finally {
        if (isMounted) {
          setLoadingToken(false);
        }
      }
    };

    verifyToken();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // 2. Redeem function
  const handleRedeem = useCallback(
    async (targetUid: string, targetEmail?: string | null) => {
      if (hasRedeemedRef.current || !token) return;
      hasRedeemedRef.current = true;
      setLinking(true);
      setErrorMessage(null);

      try {
        const res = await fetch('/api/whatsapp/magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            firebase_uid: targetUid,
            email: targetEmail || undefined,
          }),
        });

        if (res.ok) {
          setLinkedSuccess(true);
          setTimeout(() => {
            router.push('/dashboard');
          }, 2400);
        } else {
          const data = await res.json().catch(() => ({}));
          setErrorMessage(data.error || 'Falha ao vincular o WhatsApp.');
          hasRedeemedRef.current = false;
        }
      } catch (err) {
        setErrorMessage('Erro de rede ao conectar conta.');
        hasRedeemedRef.current = false;
      } finally {
        setLinking(false);
      }
    },
    [token, router]
  );

  // 3. Auto-link if user is already authenticated and token is valid
  useEffect(() => {
    if (!authLoading && user && tokenValid === true && !linkedSuccess && !hasRedeemedRef.current) {
      handleRedeem(user.uid, user.email);
    }
  }, [authLoading, user, tokenValid, linkedSuccess, handleRedeem]);

  const handleGoogleConnect = async () => {
    try {
      setErrorMessage(null);
      await signInWithGoogle();
    } catch (err) {
      console.error('Google sign in error on /conectar:', err);
      setErrorMessage('Erro ao autenticar com o Google. Tente novamente.');
    }
  };

  return (
    <div
      className="dark relative flex min-h-screen items-center justify-center p-6 overflow-hidden"
      style={{ background: 'var(--background)' }}
    >
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full blur-[140px]"
          style={{ background: 'rgba(234, 88, 12, 0.06)' }}
        />
        <div
          className="absolute -right-40 -bottom-40 h-[600px] w-[600px] rounded-full blur-[140px]"
          style={{ background: 'rgba(34, 197, 94, 0.05)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center justify-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-xl">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <p
            className="text-2xl font-bold tracking-tight text-center"
            style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--foreground)' }}
          >
            Aprova<span className="text-primary">Mind</span>
          </p>
        </div>

        {/* Card */}
        <div className="relative group">
          <div
            className="absolute -inset-1 rounded-[32px] opacity-25 blur-xl transition duration-1000 group-hover:opacity-35"
            style={{ background: 'linear-gradient(135deg, var(--primary), #22c55e)' }}
          />

          <div
            className="relative rounded-[32px] p-8 sm:p-10 shadow-2xl overflow-hidden border border-border"
            style={{
              background: 'var(--card)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            {/* Top Shine */}
            <div
              className="absolute top-0 left-0 w-full h-px"
              style={{
                background:
                  'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.2), transparent)',
              }}
            />

            {/* State A: Loading Token or Auth Initializing */}
            {(loadingToken || (authLoading && !errorMessage)) && (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <h3 className="text-lg font-semibold text-foreground">
                  Validando link de conexão...
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Verificando a segurança do seu acesso WhatsApp.
                </p>
              </div>
            )}

            {/* State B: Invalid or Expired Token */}
            {!loadingToken && !authLoading && tokenValid === false && (
              <div className="text-center py-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Link Inválido ou Expirado
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {errorMessage ||
                    'Este link de conexão não está mais ativo ou o limite de 30 minutos expirou.'}
                </p>
                <div className="p-4 rounded-2xl bg-secondary/50 border border-border text-xs text-muted-foreground mb-6">
                  💡 <span className="font-semibold text-foreground">Como gerar um novo:</span> No WhatsApp, basta enviar uma mensagem dizendo{' '}
                  <span className="font-mono text-primary font-bold">/painel</span> para receber um link novinho!
                </div>
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                >
                  Ir para a página de Login
                </Link>
              </div>
            )}

            {/* State C: Success Linking */}
            {linkedSuccess && (
              <div className="text-center py-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-4 animate-bounce">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Conta Conectada com Sucesso! 🚀
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Seu WhatsApp <strong className="text-foreground">{phoneMasked}</strong> foi vinculado à sua conta AprovaMind.
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-emerald-500 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Redirecionando para seu cockpit de estudos...</span>
                </div>
              </div>
            )}

            {/* State D: Valid Token & Pending Link (Ready for Google Auth or Confirmation) */}
            {!loadingToken && tokenValid === true && !linkedSuccess && (
              <div>
                {/* Pairing Visual Nodes */}
                <div className="mb-8 flex items-center justify-center gap-3">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground">WhatsApp</span>
                  </div>

                  <div className="flex items-center px-2 text-primary">
                    <div className="h-0.5 w-6 bg-border" />
                    <Sparkles className="h-4 w-4 mx-1 animate-pulse" />
                    <div className="h-0.5 w-6 bg-border" />
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20">
                      <Zap className="h-6 w-6" />
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground">AprovaMind</span>
                  </div>
                </div>

                {/* Text Description */}
                <div className="text-center mb-8">
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    Conectar WhatsApp ao Cockpit Web
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Identificamos o WhatsApp{' '}
                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 text-xs">
                      {phoneMasked}
                    </span>
                    .
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Faça login com seu Google para sincronizar seu histórico, questões resolvidas e cronograma.
                  </p>
                </div>

                {/* Error Banner if any */}
                {errorMessage && (
                  <div className="mb-6 rounded-2xl bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive text-center">
                    {errorMessage}
                  </div>
                )}

                {/* Action button */}
                {user ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl p-4 bg-secondary/40 border border-border text-center text-xs">
                      Conectado como <strong className="text-foreground">{user.email}</strong>
                    </div>
                    <button
                      onClick={() => handleRedeem(user.uid, user.email)}
                      disabled={linking}
                      className="group flex w-full items-center justify-center gap-2 rounded-full py-3.5 font-semibold bg-primary text-white hover:opacity-90 active:scale-98 transition-all disabled:opacity-50"
                    >
                      {linking ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Conectando...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirmar Conexão</span>
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button
                      onClick={handleGoogleConnect}
                      disabled={linking}
                      className="group flex w-full items-center justify-center gap-3 rounded-full px-5 py-3.5 font-semibold transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 bg-white text-zinc-900 shadow-md"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      <span>Entrar com o Google para Conectar</span>
                      <ArrowRight className="ml-auto h-4 w-4 opacity-40 transition-transform group-hover:translate-x-1" />
                    </button>

                    <div className="text-center">
                      <Link
                        href="/login"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                      >
                        Já possui conta com email e senha? Entrar aqui
                      </Link>
                    </div>
                  </div>
                )}

                {/* Privacy Badge */}
                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground/80">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Conexão criptografada de ponta a ponta</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ConectarPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ background: 'var(--background)' }}
        >
          <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-primary">
            <Zap className="h-6 w-6 text-white" />
          </div>
        </div>
      }
    >
      <ConectarContent />
    </Suspense>
  );
}
