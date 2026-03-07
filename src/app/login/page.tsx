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
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-full" style={{ background: 'var(--identity-grad)' }}>
          <Zap className="h-6 w-6 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#0A0A0A]">
      {/* Ambient background — RDS atmospheric depth */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-64 -top-64 h-[600px] w-[600px] rounded-full bg-[#3150AA]/10 blur-[120px]" />
        <div className="absolute -bottom-64 -right-64 h-[600px] w-[600px] rounded-full bg-[#F59768]/8 blur-[120px]" />
        <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-[#3150AA]/5 blur-[100px]" />
        {/* Radial Mask Grid */}
        <div className="rds-grid-bg absolute inset-0" />
      </div>

      {/* Left panel — branding */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden flex-col justify-between p-12 lg:flex lg:w-1/2"
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full shadow-xl" style={{ background: 'var(--identity-grad)', boxShadow: '0 0 20px rgba(245,151,104,0.2)' }}>
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-brand text-lg font-bold text-white leading-none">
              Aprova<span className="text-[#F59768]">Mind</span>
            </p>
            <p className="text-[10px] uppercase tracking-wider text-[#666] font-mono">
              Strategic Engine
            </p>
          </div>
        </div>

        {/* Hero text */}
        <div className="max-w-md">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#3150AA]/30 bg-[#3150AA]/10 px-3 py-1">
            <div className="status-dot-blue h-1.5 w-1.5 rounded-full" />
            <span className="text-xs text-[#F59768] font-mono uppercase tracking-wider">IA de Alta Performance para Concursos</span>
          </div>
          <h1 className="font-brand mb-4 text-4xl font-bold leading-tight text-white xl:text-5xl">
            Sua aprovação começa com{' '}
            <span className="bg-gradient-to-r from-[#F59768] to-[#3150AA] bg-clip-text text-transparent">
              estratégia inteligente
            </span>
          </h1>
          <p className="text-base text-[#666] leading-relaxed">
            AprovaMind é o sistema de alta performance que combina IA diagnóstica, gestão
            multi-edital e análise de performance em tempo real para acelerar sua aprovação.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Brain, label: 'IA Diagnóstica', desc: 'Mentoria semanal personalizada' },
            { icon: Target, label: 'Multi-Edital', desc: 'Gerencie múltiplos concursos' },
            { icon: TrendingUp, label: 'Simulados Avançados', desc: 'Centro de provas inteligente' },
            { icon: BarChart2, label: 'Performance Real', desc: 'Benchmarks com aprovados' },
          ].map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="rds-card p-4"
            >
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#3150AA]/15">
                <Icon className="h-4 w-4 text-[#F59768]" />
              </div>
              <p className="font-brand text-sm font-semibold text-white">{label}</p>
              <p className="text-xs text-[#666]">{desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs text-[#666] font-mono">
          <Shield className="h-3.5 w-3.5" />
          <span>Dados armazenados com segurança no Firebase · SSL/TLS</span>
        </div>
      </motion.div>

      {/* Right panel — auth form */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        className="flex flex-1 items-center justify-center p-6 lg:p-12"
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'var(--identity-grad)' }}>
              <Zap className="h-5 w-5 text-white" />
            </div>
            <p className="font-brand text-xl font-bold text-white">
              Aprova<span className="text-[#F59768]">Mind</span>
            </p>
          </div>

          {/* Card */}
          <div className="rds-glass rounded-2xl p-8 shadow-2xl">
            {/* Header */}
            <div className="mb-6">
              <h2 className="font-brand text-xl font-bold text-white">
                {mode === 'login' ? 'Acesse sua conta' : 'Criar conta gratuita'}
              </h2>
              <p className="mt-1 text-sm text-[#666]">
                {mode === 'login'
                  ? 'Continue de onde parou na sua jornada'
                  : 'Comece sua jornada rumo à aprovação'}
              </p>
            </div>

            {/* Google */}
            <button
              onClick={signInWithGoogle}
              disabled={isDisabled}
              className="group flex w-full items-center justify-center gap-3 rounded-full bg-white px-5 py-3 font-medium text-gray-900 transition-all hover:bg-gray-50 hover:shadow-lg hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {isDisabled ? 'Aguarde...' : 'Continuar com Google'}
              <ArrowRight className="ml-auto h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
            </button>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.10]" />
              <span className="text-xs text-[#666] font-mono">ou acesse com email</span>
              <div className="h-px flex-1 bg-white/[0.10]" />
            </div>

            {/* Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              {mode === 'register' && (
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full rounded-full border border-white/[0.10] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-[#666] outline-none transition-all focus:border-[#3150AA]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[#3150AA]/30"
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-full border border-white/[0.10] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-[#666] outline-none transition-all focus:border-[#3150AA]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[#3150AA]/30"
              />
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-full border border-white/[0.10] bg-white/[0.04] px-4 py-3 pr-11 text-sm text-white placeholder-[#666] outline-none transition-all focus:border-[#3150AA]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[#3150AA]/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-slate-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={isDisabled}
                className="rds-btn-identity flex w-full items-center justify-center gap-2 px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                {submitting
                  ? 'Aguarde...'
                  : mode === 'register'
                    ? 'Criar conta'
                    : 'Entrar'}
              </button>
            </form>

            {/* Toggle */}
            <p className="mt-4 text-center text-sm text-[#666]">
              {mode === 'login' ? (
                <>
                  Não tem conta?{' '}
                  <button
                    onClick={() => setMode('register')}
                    className="text-[#F59768] hover:text-[#F59768]/80 transition-colors"
                  >
                    Criar gratuitamente
                  </button>
                </>
              ) : (
                <>
                  Já tem conta?{' '}
                  <button
                    onClick={() => setMode('login')}
                    className="text-[#F59768] hover:text-[#F59768]/80 transition-colors"
                  >
                    Fazer login
                  </button>
                </>
              )}
            </p>

            {/* Error */}
            {error && (
              <div className="mt-4 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-3">
                <p className="text-center text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
