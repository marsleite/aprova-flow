/**
 * Tela de Login
 * 
 * Exibe a tela de boas-vindas com login via Google.
 * Design dark mode com gradientes roxo/azul neon.
 */

'use client';

import { Zap, BookOpen, Clock, TrendingUp, Brain } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const { signInWithGoogle, loading, error } = useAuthContext();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-950">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 mx-4 w-full max-w-md">
        {/* Card principal */}
        <div className="rounded-3xl border border-white/10 bg-gray-900/80 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 shadow-xl shadow-violet-500/30">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">
              Aprova<span className="text-violet-400">Flow</span>
            </h1>
            <p className="mt-2 text-center text-sm text-gray-400">
              Rastreie seu tempo de estudo e acelere sua aprovação
            </p>
          </div>

          {/* Features */}
          <div className="mb-8 space-y-3">
            <Feature
              icon={<Clock className="h-4 w-4 text-violet-400" />}
              text="Cronômetro inteligente com horas líquidas"
            />
            <Feature
              icon={<TrendingUp className="h-4 w-4 text-blue-400" />}
              text="Dashboard de progresso por matéria"
            />
            <Feature
              icon={<BookOpen className="h-4 w-4 text-cyan-400" />}
              text="Gráfico de radar para equilíbrio de estudos"
            />
            <Feature
              icon={<Brain className="h-4 w-4 text-pink-400" />}
              text="IA para sugestões personalizadas (em breve)"
            />
          </div>

          {/* Botão de Login */}
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="group flex w-full items-center justify-center gap-3 rounded-xl bg-white px-6 py-3.5 
                       font-medium text-gray-900 shadow-lg transition-all hover:bg-gray-100 hover:shadow-xl
                       disabled:cursor-not-allowed disabled:opacity-50"
          >
            {/* Ícone Google */}
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
            {loading ? 'Entrando...' : 'Entrar com Google'}
          </button>

          {/* Erro */}
          {error && (
            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2">
              <p className="text-center text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-600">
          Seus dados são armazenados de forma segura no Firebase
        </p>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-2.5">
      {icon}
      <span className="text-sm text-gray-300">{text}</span>
    </div>
  );
}
