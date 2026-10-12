'use client';

import { ReactNode } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { isAdminIdentity } from '@/lib/admin';
import { Shield, ShieldAlert, LogIn, LogOut, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components';
import Link from 'next/link';

export default function AdminAuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, signInWithGoogle, logout } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090E] flex flex-col items-center justify-center text-white">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-4" />
        <p className="text-xs uppercase tracking-widest text-zinc-400 font-mono">
          Autenticando sessão administrativa...
        </p>
      </div>
    );
  }

  // Não logado: Portal de login do Admin
  if (!user) {
    return (
      <div className="min-h-screen bg-[#07090E] flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-2xl backdrop-blur-xl text-center space-y-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_24px_rgba(6,182,212,0.2)]">
            <Shield className="h-7 w-7" />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-white font-sans">
              AprovaMind <span className="text-cyan-400">Admin</span>
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Área de controle executivo, métricas de negócio e finanças de IA. Acesso restrito a gestores autorizados.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={signInWithGoogle}
            className="w-full justify-center bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-12 shadow-lg shadow-cyan-950/40"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Entrar com Google Admin
          </Button>

          <div className="pt-2">
            <Link href="https://aprovamind.com.br" className="text-xs text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1.5 transition-colors">
              <ArrowLeft className="h-3 w-3" />
              Voltar para o AprovaMind
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const hasAccess = isAdminIdentity({ uid: user.uid, email: user.email });

  // Logado mas NÃO é admin
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#07090E] flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-950/80 border border-red-500/30 shadow-2xl backdrop-blur-xl text-center space-y-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <ShieldAlert className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-white font-sans">
              Acesso Negado
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              A conta conectada (<strong className="text-zinc-200">{user.email}</strong>) não possui privilégios de administrador no AprovaMind.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="outline"
              onClick={logout}
              className="w-full justify-center border-zinc-800 text-zinc-300 hover:bg-zinc-900"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Desconectar desta conta
            </Button>
            <Link href="https://aprovamind.com.br/dashboard" className="w-full">
              <Button variant="secondary" className="w-full justify-center">
                Ir para o Cockpit do Aluno
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
