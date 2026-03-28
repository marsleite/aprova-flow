'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { getBetaAccessMessage, isBetaAccessRestricted } from '@/lib/beta-access';
import {
  Zap,
  Mail,
  Eye,
  EyeOff,
  Brain,
  Target,
  TrendingUp,
  BarChart2,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, error } =
    useAuthContext();
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const betaRestricted = isBetaAccessRestricted();
  const betaMessage = getBetaAccessMessage(email);

  useEffect(() => {
    if (user && !loading) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await signUpWithEmail(email, password, displayName.trim());
      } else {
        await signInWithEmail(email, password);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isDisabled = loading || submitting;

  if (loading || user) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: 'var(--ds-color-canvas)' }}
      >
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-st-brand">
          <Zap className="h-6 w-6 text-st-text-on-light" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="dark relative flex min-h-screen overflow-hidden"
      style={{ background: 'var(--ds-color-canvas)' }}
    >
      {/* ── Ambient background ── Sitetrip warm glow palette ── */}
      <div className="pointer-events-none absolute inset-0">
        {/* Brand purple glow — top-left */}
        <div
          className="absolute -left-64 -top-64 h-[800px] w-[800px] rounded-full blur-[140px]"
          style={{ background: 'rgba(218, 202, 255, 0.08)' }}
        />
        {/* Lime glow — center-left */}
        <div
          className="absolute top-1/2 left-0 h-[600px] w-[600px] -translate-y-1/2 rounded-full blur-[130px]"
          style={{ background: 'rgba(230, 255, 91, 0.05)' }}
        />
        {/* Brand strong — bottom-right */}
        <div
          className="absolute -bottom-64 -right-64 h-[800px] w-[800px] rounded-full blur-[150px]"
          style={{ background: 'rgba(154, 117, 240, 0.1)' }}
        />
        {/* Soft noise */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundSize: '128px 128px',
        }} />
      </div>

      {/* ── Left panel — branding ── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="hidden flex-col justify-between p-12 lg:flex lg:w-[55%] relative z-10"
      >
        {/* Logo pill — Sitetrip glassmorphism */}
        <div
          className="flex items-center gap-3 w-fit px-5 py-2.5 rounded-full backdrop-blur-md"
          style={{
            background: 'var(--ds-color-glass)',
            border: '1px solid rgba(218, 202, 255, 0.25)',
          }}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-st-brand">
            <Zap className="h-4 w-4 text-st-text-on-light" />
          </div>
          <div className="flex flex-col">
            <p
              className="text-lg font-semibold tracking-tight leading-none"
              style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-color-text-on-dark)' }}
            >
              Aprova<span className="text-st-brand">Mind</span>
            </p>
            <p
              className="text-[10px] uppercase tracking-widest mt-0.5"
              style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-color-text-muted)', letterSpacing: 'var(--ds-letter-kicker)' }}
            >
              Strategic Engine
            </p>
          </div>
        </div>

        {/* Hero text — DS typography */}
        <div className="max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
            style={{
              background: 'rgba(253, 252, 251, 0.08)',
              border: '1px solid var(--ds-color-border-soft)',
            }}
          >
            <div className="h-2 w-2 rounded-full bg-st-lime animate-pulse" />
            <span
              className="text-xs font-medium uppercase"
              style={{
                fontFamily: 'var(--ds-font-display)',
                letterSpacing: 'var(--ds-letter-kicker)',
                color: 'var(--ds-color-accent-lime)',
              }}
            >
              IA de Alta Performance
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="ds-display-1 mb-6"
            style={{ color: 'var(--ds-color-text-on-dark)' }}
          >
            Sua jornada começa com{' '}
            <span className="text-st-brand">
              estratégia inteligente.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="ds-body-lg"
            style={{ color: 'var(--ds-color-text-muted)' }}
          >
            O AprovaMind combina IA diagnóstica, gestão multi-edital e análise preditiva para acelerar o seu tempo até a aprovação.
          </motion.p>
        </div>

        {/* Feature grid — warm surface cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="grid grid-cols-2 gap-4 max-w-lg mt-8"
        >
          {[
            { icon: Brain, label: 'IA Diagnóstica', desc: 'Mentoria personalizada diária', accent: 'var(--ds-color-brand)' },
            { icon: Target, label: 'Multi-Edital', desc: 'Foque no peso de cada matéria', accent: 'var(--ds-color-accent-lime)' },
            { icon: TrendingUp, label: 'Provas & Simulados', desc: 'Treino e evolução', accent: 'var(--ds-color-accent-cyan)' },
            { icon: BarChart2, label: 'Performance Real', desc: 'Identifique seus gaps', accent: 'var(--ds-color-accent-yellow)' },
          ].map(({ icon: Icon, label, desc, accent }) => (
            <div
              key={label}
              className="flex items-start gap-3 rounded-2xl p-4 transition-all duration-300 hover:translate-y-[-2px]"
              style={{
                background: 'rgba(253, 252, 251, 0.04)',
                border: '1px solid var(--ds-color-border-soft)',
              }}
            >
              <div
                className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: `color-mix(in srgb, ${accent} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${accent} 25%, transparent)` }}
              >
                <Icon className="h-5 w-5" style={{ color: accent }} />
              </div>
              <div>
                <p
                  className="text-sm font-semibold mb-0.5"
                  style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-color-text-on-dark)' }}
                >
                  {label}
                </p>
                <p className="text-[11px] leading-tight" style={{ color: 'var(--ds-color-text-muted)' }}>
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs pt-8" style={{ color: 'var(--ds-color-text-muted)' }}>
          <Shield className="h-4 w-4" />
          <span style={{ fontFamily: 'var(--ds-font-body)' }}>Dados criptografados · Google Cloud Firebase</span>
        </div>
      </motion.div>

      {/* ── Right panel — auth form ── */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-1 items-center justify-center p-6 lg:p-12 relative z-20"
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-10 flex flex-col items-center justify-center gap-3 lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-st-brand shadow-xl">
              <Zap className="h-7 w-7 text-st-text-on-light" />
            </div>
            <p
              className="text-2xl font-semibold tracking-tight"
              style={{ fontFamily: 'var(--ds-font-display)', color: 'var(--ds-color-text-on-dark)' }}
            >
              Aprova<span className="text-st-brand">Mind</span>
            </p>
          </div>

          {/* Card — Sitetrip glassmorphism */}
          <div className="relative group">
            {/* Outer Glow */}
            <div
              className="absolute -inset-1 rounded-[32px] opacity-20 blur-xl transition duration-1000 group-hover:opacity-30"
              style={{ background: 'linear-gradient(135deg, var(--ds-color-brand), var(--ds-color-brand-strong))' }}
            />

            <div
              className="relative rounded-[32px] p-8 sm:p-10 shadow-2xl overflow-hidden"
              style={{
                background: 'var(--ds-color-glass)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(218, 202, 255, 0.25)',
              }}
            >
              {betaRestricted && (
                <div
                  className="mb-6 rounded-2xl px-4 py-3.5"
                  style={{
                    background: 'rgba(245, 151, 104, 0.08)',
                    border: '1px solid rgba(245, 151, 104, 0.22)',
                  }}
                >
                  <p
                    className="text-[10px] font-medium uppercase"
                    style={{
                      fontFamily: 'var(--ds-font-display)',
                      letterSpacing: 'var(--ds-letter-kicker)',
                      color: 'var(--ds-color-accent-yellow)',
                    }}
                  >
                    Beta por convite
                  </p>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--ds-color-text-muted)' }}>
                    {betaMessage}
                  </p>
                </div>
              )}

              {/* Inner top shine */}
              <div
                className="absolute top-0 left-0 w-full h-px"
                style={{ background: 'linear-gradient(to right, transparent, rgba(253, 252, 251, 0.2), transparent)' }}
              />

              {/* Header */}
              <div className="mb-8 text-center sm:text-left">
                <h2
                  className="ds-title-1"
                  style={{ color: 'var(--ds-color-text-on-dark)' }}
                >
                  {mode === 'login' ? 'Acesse sua conta' : 'Crie seu acesso'}
                </h2>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--ds-color-text-muted)' }}>
                  {mode === 'login'
                    ? 'Retome o controle da sua preparação.'
                    : 'A IA que entende o seu ritmo de estudo.'}
                </p>
              </div>

              {/* Google button */}
              <button
                onClick={signInWithGoogle}
                disabled={isDisabled}
                className="group flex w-full items-center justify-center gap-3 rounded-full px-5 py-3.5 font-semibold transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: 'var(--ds-color-surface-0)',
                  color: 'var(--ds-color-text-on-light)',
                  minHeight: 'var(--ds-size-button-height)',
                }}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {isDisabled ? 'Conectando...' : 'Continuar com Google'}
                <ArrowRight className="ml-auto h-4 w-4 opacity-40 transition-transform group-hover:translate-x-1" />
              </button>

              {/* Divider */}
              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, var(--ds-color-border-soft))' }} />
                <span
                  className="text-[11px] uppercase"
                  style={{
                    fontFamily: 'var(--ds-font-display)',
                    letterSpacing: 'var(--ds-letter-kicker)',
                    color: 'var(--ds-color-text-muted)',
                  }}
                >
                  Ou com email
                </span>
                <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, var(--ds-color-border-soft))' }} />
              </div>

              {/* Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <label
                      className="text-[11px] font-medium uppercase ml-1"
                      style={{
                        fontFamily: 'var(--ds-font-display)',
                        letterSpacing: 'var(--ds-letter-kicker)',
                        color: 'var(--ds-color-text-muted)',
                      }}
                    >
                      Nome
                    </label>
                    <input
                      type="text"
                      placeholder="Alan Turing"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      className="w-full rounded-full px-5 py-3.5 text-sm outline-none transition-all"
                      style={{
                        background: 'rgba(23, 20, 18, 0.6)',
                        border: '1px solid var(--ds-color-border-soft)',
                        color: 'var(--ds-color-text-on-dark)',
                        backdropFilter: 'blur(8px)',
                      }}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    className="text-[11px] font-medium uppercase ml-1"
                    style={{
                      fontFamily: 'var(--ds-font-display)',
                      letterSpacing: 'var(--ds-letter-kicker)',
                      color: 'var(--ds-color-text-muted)',
                    }}
                  >
                    Work Email
                  </label>
                  <input
                    type="email"
                    placeholder="hey@aprova.mind"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-full px-5 py-3.5 text-sm outline-none transition-all"
                    style={{
                      background: 'rgba(23, 20, 18, 0.6)',
                      border: '1px solid var(--ds-color-border-soft)',
                      color: 'var(--ds-color-text-on-dark)',
                      backdropFilter: 'blur(8px)',
                    }}
                  />
                </div>

                <div className="space-y-1.5 relative">
                  <div className="flex justify-between items-center ml-1">
                    <label
                      className="text-[11px] font-medium uppercase"
                      style={{
                        fontFamily: 'var(--ds-font-display)',
                        letterSpacing: 'var(--ds-letter-kicker)',
                        color: 'var(--ds-color-text-muted)',
                      }}
                    >
                      Senha Secreta
                    </label>
                    {mode === 'login' && (
                      <span className="text-[11px] cursor-pointer hover:underline" style={{ color: 'var(--ds-color-brand)' }}>
                        Esqueceu?
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full rounded-full px-5 py-3.5 pr-12 text-sm outline-none transition-all"
                      style={{
                        background: 'rgba(23, 20, 18, 0.6)',
                        border: '1px solid var(--ds-color-border-soft)',
                        color: 'var(--ds-color-text-on-dark)',
                        backdropFilter: 'blur(8px)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 transition-colors"
                      style={{ color: 'var(--ds-color-text-muted)' }}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isDisabled}
                    className="ds-button ds-button--primary w-full justify-center gap-2 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      minHeight: '48px',
                      borderRadius: 'var(--ds-radius-pill)',
                      fontSize: '0.875rem',
                    }}
                  >
                    {submitting ? (
                      <Zap className="h-4 w-4 animate-bounce" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    {submitting
                      ? 'Processando...'
                      : mode === 'register'
                        ? 'Forjar Aprovação'
                        : 'Acessar Plataforma'}
                  </button>
                </div>
              </form>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5 rounded-2xl px-4 py-3.5 flex items-center gap-3"
                  style={{
                    background: 'rgba(169, 68, 66, 0.15)',
                    border: '1px solid rgba(169, 68, 66, 0.3)',
                  }}
                >
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{ background: 'rgba(169, 68, 66, 0.25)' }}
                  >
                    <Zap className="h-3 w-3" style={{ color: 'var(--ds-color-danger)' }} />
                  </div>
                  <p className="text-xs font-medium leading-tight" style={{ color: '#e57373' }}>{error}</p>
                </motion.div>
              )}

              {/* Toggle */}
              <div
                className="mt-8 text-center rounded-2xl p-4"
                style={{
                  background: 'rgba(23, 20, 18, 0.4)',
                  border: '1px solid var(--ds-color-border-soft)',
                }}
              >
                <p className="text-xs" style={{ color: 'var(--ds-color-text-muted)' }}>
                  {mode === 'login' ? 'Novo por aqui? ' : 'Já é um estrategista? '}
                  <button
                    onClick={() => {
                      setMode(mode === 'login' ? 'register' : 'login');
                    }}
                    className="font-semibold transition-colors hover:underline"
                    style={{ color: 'var(--ds-color-brand)' }}
                  >
                    {mode === 'login' ? 'Criar sua conta gratuita' : 'Faça seu login'}
                  </button>
                </p>
                {betaRestricted && (
                  <p className="mt-2 text-[11px]" style={{ color: 'var(--ds-color-text-muted)' }}>
                    Cadastro e login por email funcionam normalmente para emails já liberados no beta.
                  </p>
                )}
              </div>

            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
