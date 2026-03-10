'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
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
      <div className="flex min-h-screen items-center justify-center bg-am-canvas">
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full" style={{ background: 'var(--identity-grad)' }}>
          <Zap className="h-6 w-6 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="dark relative flex min-h-screen overflow-hidden bg-am-canvas">
      {/* Ambient background — RDS atmospheric depth */}
      <div className="pointer-events-none absolute inset-0">
        {/* Core Glows */}
        <div className="absolute -left-64 -top-64 h-[800px] w-[800px] rounded-full bg-am-brand-secondary/15 blur-[140px]" />
        <div className="absolute top-1/2 left-0 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-am-brand-primary/10 blur-[130px]" />
        <div className="absolute -bottom-64 -right-64 h-[800px] w-[800px] rounded-full bg-am-brand-primary/15 blur-[150px]" />
        {/* Radial Mask Grid */}
        <div className="rds-grid-bg absolute inset-0 opacity-40 mix-blend-overlay" />
      </div>

      {/* Left panel — branding */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="hidden flex-col justify-between p-12 lg:flex lg:w-[55%] relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 bg-am-surface-subtle/30 w-fit px-4 py-2 rounded-2xl border border-am-border-default/50 backdrop-blur-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-am-brand-gradient shadow-lg">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <p className="font-brand text-xl font-extrabold text-white tracking-tight leading-none">
              Aprova<span className="text-transparent bg-clip-text bg-am-brand-gradient">Mind</span>
            </p>
            <p className="text-[10px] uppercase tracking-widest text-am-text-secondary font-mono mt-0.5">
              Strategic Engine
            </p>
          </div>
        </div>

        {/* Hero text */}
        <div className="max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-am-brand-primary/30 bg-am-brand-primary/10 px-4 py-1.5 shadow-[0_0_20px_rgba(61,116,246,0.15)]"
          >
            <div className="h-2 w-2 rounded-full bg-am-brand-primary animate-pulse" />
            <span className="text-xs font-semibold text-am-brand-primary font-mono uppercase tracking-widest">IA de Alta Performance</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="font-brand mb-6 text-5xl font-bold leading-[1.1] text-white xl:text-[4rem] tracking-tight"
          >
            Sua jornada começa com{' '}
            <span className="bg-am-brand-gradient bg-clip-text text-transparent inline-block pb-2">
              estratégia inteligente.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-lg text-am-text-secondary leading-relaxed max-w-lg"
          >
            O AprovaMind combina IA diagnóstica, gestão multi-edital e análise preditiva para acelerar o seu tempo até a aprovação.
          </motion.p>
        </div>

        {/* Feature grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="grid grid-cols-2 gap-4 max-w-lg mt-8"
        >
          {[
            { icon: Brain, label: 'IA Diagnóstica', desc: 'Mentoria personalizada diária' },
            { icon: Target, label: 'Multi-Edital', desc: 'Foque no peso de cada matéria' },
            { icon: TrendingUp, label: 'Simulados Avançados', desc: 'Gráficos de evolução' },
            { icon: BarChart2, label: 'Performance Real', desc: 'Identifique seus gaps' },
          ].map(({ icon: Icon, label, desc }, i) => (
            <div
              key={label}
              className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04]"
            >
              <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-am-brand-primary/10 border border-am-brand-primary/20">
                <Icon className="h-5 w-5 text-am-brand-primary" />
              </div>
              <div>
                <p className="font-brand text-sm font-semibold text-white mb-0.5">{label}</p>
                <p className="text-[11px] text-am-text-secondary leading-tight">{desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs text-am-text-tertiary font-mono pt-8">
          <Shield className="h-4 w-4" />
          <span>Dados criptografados · Google Cloud Firebase</span>
        </div>
      </motion.div>

      {/* Right panel — auth form */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-1 items-center justify-center p-6 lg:p-12 relative z-20"
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-10 flex flex-col items-center justify-center gap-3 lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-am-brand-gradient shadow-xl">
              <Zap className="h-7 w-7 text-white" />
            </div>
            <p className="font-brand text-2xl font-bold text-white tracking-tight">
              Aprova<span className="text-am-brand-primary">Mind</span>
            </p>
          </div>

          {/* Card */}
          <div className="relative group">
            {/* Outer Glow */}
            <div className="absolute -inset-1 rounded-3xl bg-am-brand-gradient opacity-20 blur-xl transition duration-1000 group-hover:opacity-30"></div>

            <div className="rds-glass relative rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/10 overflow-hidden">
              {/* Inner top shine */}
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

              {/* Header */}
              <div className="mb-8 text-center sm:text-left">
                <h2 className="font-brand text-2xl font-bold text-white tracking-tight">
                  {mode === 'login' ? 'Acesse sua conta' : 'Crie seu acesso'}
                </h2>
                <p className="mt-2 text-sm text-am-text-secondary leading-relaxed">
                  {mode === 'login'
                    ? 'Retome o controle da sua preparação.'
                    : 'A IA que entende o seu ritmo de estudo.'}
                </p>
              </div>

              {/* Google */}
              <button
                onClick={signInWithGoogle}
                disabled={isDisabled}
                className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-3.5 font-semibold text-gray-900 transition-all hover:bg-gray-100 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {isDisabled ? 'Conectando...' : 'Continuar com Google'}
                <ArrowRight className="ml-auto h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-1" />
              </button>

              {/* Divider */}
              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-am-border-strong/50" />
                <span className="text-[11px] text-am-text-tertiary font-mono uppercase tracking-widest">Ou com email</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-am-border-strong/50" />
              </div>

              {/* Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-am-text-secondary uppercase tracking-wider ml-1">Nome</label>
                    <input
                      type="text"
                      placeholder="Alan Turing"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white placeholder-am-text-tertiary outline-none transition-all placeholder:font-mono focus:border-am-brand-primary/50 focus:bg-black/60 focus:ring-2 focus:ring-am-brand-primary/20 backdrop-blur-md"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-am-text-secondary uppercase tracking-wider ml-1">Work Email</label>
                  <input
                    type="email"
                    placeholder="hey@aprova.mind"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white placeholder-am-text-tertiary outline-none transition-all placeholder:font-mono focus:border-am-brand-primary/50 focus:bg-black/60 focus:ring-2 focus:ring-am-brand-primary/20 backdrop-blur-md"
                  />
                </div>

                <div className="space-y-1.5 relative">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[11px] font-semibold text-am-text-secondary uppercase tracking-wider">Senha Secreta</label>
                    {mode === 'login' && <span className="text-[11px] text-am-brand-primary cursor-pointer hover:underline">Esqueceu?</span>}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 pr-12 text-sm text-white placeholder-am-text-tertiary outline-none transition-all placeholder:font-mono focus:border-am-brand-primary/50 focus:bg-black/60 focus:ring-2 focus:ring-am-brand-primary/20 backdrop-blur-md"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-am-text-tertiary hover:bg-white/10 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isDisabled}
                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-am-brand-gradient px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                      <div className="relative h-full w-8 bg-white/20" />
                    </div>
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
                  className="mt-5 rounded-2xl border border-am-error/20 bg-am-error/10 px-4 py-3.5 flex items-center gap-3 backdrop-blur-sm"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-am-error/20">
                    <Zap className="h-3 w-3 text-am-error" />
                  </div>
                  <p className="text-xs font-medium text-am-error leading-tight">{error}</p>
                </motion.div>
              )}

              {/* Toggle */}
              <div className="mt-8 text-center bg-black/20 rounded-2xl p-4 border border-white/5">
                <p className="text-xs text-am-text-secondary">
                  {mode === 'login' ? 'Novo por aqui? ' : 'Já é um estrategista? '}
                  <button
                    onClick={() => {
                      setMode(mode === 'login' ? 'register' : 'login');
                    }}
                    className="font-semibold text-am-brand-secondary hover:text-white transition-colors"
                  >
                    {mode === 'login' ? 'Criar sua conta gratuita' : 'Faça seu login'}
                  </button>
                </p>
              </div>

            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
