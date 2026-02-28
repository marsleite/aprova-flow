'use client';

import { motion } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import AccountPlanModal from '@/components/AccountPlanModal';
import { useState } from 'react';
import Image from 'next/image';
import {
  Settings,
  User,
  Crown,
  Shield,
  Bell,
  LogOut,
  CreditCard,
  ChevronRight,
  CheckCircle2,
  Lock,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.05, ease: 'easeOut' as const } }),
};

export default function SettingsPage() {
  const { user, logout } = useAuthContext();
  const { planTier, capabilities, refresh } = useEntitlements(user?.uid, user?.email);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  if (!user) return null;

  const planFeatures = [
    { label: 'Editais ilimitados', available: capabilities.maxStudyPlans === Infinity },
    { label: 'Calendário avançado', available: !!capabilities.canUseCalendar },
    { label: 'Criar simulados', available: !!capabilities.canCreateSimulados },
    { label: 'Mentoria IA', available: true },
    { label: 'Dashboard executivo', available: true },
  ];

  return (
    <div className="min-h-screen bg-[#080c14]">
      {/* Header */}
      <div className="border-b border-white/[0.05] bg-[#0b1120]/60 px-6 py-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-xs text-slate-500 uppercase tracking-wider">Configurações</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Conta e Configurações</h1>
        <p className="mt-0.5 text-sm text-slate-500">Gerencie sua conta e preferências</p>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-6 space-y-6">
        {/* Profile card */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show"
          className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-white">Perfil</h2>
          </div>
          <div className="flex items-center gap-4">
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName || 'Avatar'}
                width={56}
                height={56}
                className="rounded-full ring-2 ring-white/10"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-xl font-bold text-white">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-base font-semibold text-white">{user.displayName || 'Usuário'}</p>
              <p className="text-sm text-slate-500">{user.email}</p>
              <p className="mt-1 text-xs text-slate-600">UID: {user.uid.substring(0, 12)}…</p>
            </div>
          </div>
        </motion.div>

        {/* Plan card */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show"
          className="rounded-xl border border-violet-500/20 bg-gradient-to-b from-violet-600/10 to-[#0f1825] p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">Plano Atual</h2>
            </div>
            <span className="rounded-full bg-violet-500/20 px-3 py-0.5 text-xs font-bold uppercase text-violet-300">
              {planTier}
            </span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            {planFeatures.map(({ label, available }) => (
              <div key={label} className="flex items-center gap-2">
                {available
                  ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                  : <Lock className="h-3.5 w-3.5 flex-shrink-0 text-slate-600" />
                }
                <span className={`text-xs ${available ? 'text-slate-300' : 'text-slate-600'}`}>{label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setAccountModalOpen(true)}
            className="flex w-full items-center justify-between rounded-xl bg-violet-600/20 px-4 py-3 text-sm font-medium text-violet-300 transition-colors hover:bg-violet-600/30"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Gerenciar plano e faturamento
            </div>
            <ChevronRight className="h-4 w-4" />
          </button>
        </motion.div>

        {/* Security */}
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show"
          className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-white">Segurança e Privacidade</h2>
          </div>
          <div className="space-y-2 text-xs text-slate-500">
            <p>• Dados armazenados com segurança no Firebase (Google Cloud)</p>
            <p>• Autenticação via OAuth 2.0 (Google) ou email/senha</p>
            <p>• Conexão criptografada via SSL/TLS</p>
            <p>• Nenhum dado é compartilhado com terceiros</p>
          </div>
        </motion.div>

        {/* Danger zone */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show"
          className="rounded-xl border border-red-500/10 bg-red-500/[0.04] p-5"
        >
          <h2 className="mb-3 text-sm font-semibold text-red-400">Zona de Risco</h2>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20"
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </button>
        </motion.div>
      </div>

      <AccountPlanModal
        isOpen={accountModalOpen}
        userId={user.uid}
        currentTier={planTier}
        currentPlansCount={0}
        onClose={() => setAccountModalOpen(false)}
        onTierChanged={() => {
          void refresh();
          setAccountModalOpen(false);
        }}
      />
    </div>
  );
}
