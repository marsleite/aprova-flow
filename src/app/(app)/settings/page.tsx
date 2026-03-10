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
  LogOut,
  CreditCard,
  ChevronRight,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { fadeUp } from '@/design-system/tokens';
import { Card, Badge, Button } from '@/components';

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
    <div className="flex flex-col gap-8 pb-10">
      {/* Topbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-6 border-b border-am-border-default bg-am-surface/30 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline"><Settings className="h-3 w-3 mr-1" /> Core</Badge>
          </div>
          <h1 className="font-brand text-am-h3 font-bold text-am-text-primary tracking-tight mt-2">
            Conta e Configurações
          </h1>
          <p className="text-am-caption text-am-text-secondary mt-1">
            Gerenciamento de perfil, assinaturas e segurança do sistema.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-6 space-y-6">
        {/* Profile card */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
          <Card padding="lg" variant="default" className="w-full">
            <div className="mb-5 flex items-center gap-2 border-b border-am-border-subtle pb-3">
              <User className="h-4 w-4 text-am-text-tertiary" />
              <h2 className="font-brand text-am-body font-bold text-am-text-primary tracking-wide">Perfil Principal</h2>
            </div>

            <div className="flex items-center gap-5">
              {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt={user.displayName || 'Avatar'}
                  width={64}
                  height={64}
                  className="rounded-am-full ring-2 ring-am-border-default object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-am-full bg-am-brand-gradient text-xl font-bold text-white shadow-am-md">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-am-body font-bold text-am-text-primary">{user.displayName || 'Usuário'}</p>
                <p className="text-am-body-sm text-am-text-secondary">{user.email}</p>
                <Badge variant="default" className="mt-2 text-[10px] uppercase font-mono tracking-wider">UID: {user.uid.substring(0, 8)}…</Badge>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Plan card */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show">
          <div className="rounded-am-xl border border-am-ai-border/40 p-6 shadow-am-lg overflow-hidden relative" style={{ background: 'linear-gradient(135deg, var(--color-am-surface) 0%, rgba(139, 92, 246, 0.05) 100%)' }}>
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-am-ai-glow/20 blur-[60px] rounded-full pointer-events-none transition-transform duration-1000"></div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-am-brand-primary" />
                    <h2 className="font-brand text-am-body font-bold text-am-text-primary tracking-wide">Plano e Licenças</h2>
                  </div>
                  <Badge variant="ai" className="shadow-[0_0_12px_var(--color-am-ai-glow)]">
                    {planTier}
                  </Badge>
                </div>

                <p className="text-am-body-sm text-am-text-secondary mb-4 leading-relaxed">
                  Seu plano atual desbloqueia ferramentas de IA preditiva para aprovação, analytics premium e mentoria ilimitada.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-am-surface-subtle/50 p-4 rounded-am-md border border-am-border-subtle">
                  {planFeatures.map(({ label, available }) => (
                    <div key={label} className="flex items-center gap-2.5">
                      {available
                        ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-am-success" />
                        : <Lock className="h-4 w-4 flex-shrink-0 text-am-text-tertiary" />
                      }
                      <span className={`text-am-body-sm font-medium ${available ? 'text-am-text-primary' : 'text-am-text-tertiary'}`}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-am-ai-border/20 relative z-10">
              <Button
                variant="outline"
                onClick={() => setAccountModalOpen(true)}
                className="w-full justify-between border-am-ai-border/40 text-am-ai-default hover:bg-am-ai-default/10"
              >
                <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Gerenciar Faturamento</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show">
          <Card padding="lg" variant="default" className="w-full">
            <div className="mb-5 flex items-center gap-2 border-b border-am-border-subtle pb-3">
              <Shield className="h-4 w-4 text-am-text-tertiary" />
              <h2 className="font-brand text-am-body font-bold text-am-text-primary tracking-wide">Segurança Institucional</h2>
            </div>
            <div className="space-y-3 bg-am-surface-subtle p-4 rounded-am-md border border-am-border-subtle">
              <p className="text-am-body-sm text-am-text-secondary flex gap-2"><CheckCircle2 className="h-4 w-4 text-am-success flex-shrink-0" /> Dados armazenados com segurança em Data Centers da Google Cloud</p>
              <p className="text-am-body-sm text-am-text-secondary flex gap-2"><CheckCircle2 className="h-4 w-4 text-am-success flex-shrink-0" /> Autenticação 256-bit via protocolo robusto (Google OAuth)</p>
              <p className="text-am-body-sm text-am-text-secondary flex gap-2"><CheckCircle2 className="h-4 w-4 text-am-success flex-shrink-0" /> Conexão blindada TLS de ponta a ponta</p>
              <p className="text-am-body-sm text-am-text-secondary flex gap-2"><CheckCircle2 className="h-4 w-4 text-am-success flex-shrink-0" /> Restrição total a compartilhamento com terceiros</p>
            </div>
          </Card>
        </motion.div>

        {/* Danger zone */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show">
          <div className="rounded-am-xl border border-am-error/30 bg-am-error/5 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="font-brand text-am-body font-bold text-am-error tracking-wide">Zona de Risco</h2>
            </div>
            <p className="text-am-body-sm text-am-error/80 leading-relaxed mb-4">
              Ações realizadas nesta área podem interromper temporariamente o seu progresso logado ou deletar artefatos irrecuperáveis caso solicitado.
            </p>
            <Button
              variant="danger"
              onClick={logout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Desconectar da plataforma
            </Button>
          </div>
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
