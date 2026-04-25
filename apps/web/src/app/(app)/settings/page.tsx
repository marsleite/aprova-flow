'use client';

import { FeatureCode } from '@aprovamind/domain';
import { motion } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlanContext } from '@/contexts/PlanContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import AccountPlanModal from '@/components/AccountPlanModal';
import BetaSignalsCard from '@/components/BetaSignalsCard';
import EntitlementSandboxCard from '@/components/EntitlementSandboxCard';
import TesterSubscriptionManagerCard from '@/components/TesterSubscriptionManagerCard';
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
import { isAdminIdentity } from '@/lib/admin';

export default function SettingsPage() {
  const { user, logout } = useAuthContext();
  const { plans } = usePlanContext();
  const { planTier, sandboxScenarioUserId, hasFeature, getFeature } = useEntitlements(
    user?.uid,
    user?.email
  );
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  if (!user) return null;

  const canManageTesters = isAdminIdentity({
    uid: user.uid,
    email: user.email,
  });

  const activePlansFeature = getFeature(FeatureCode.ActivePlans);
  const activePlansLabel =
    activePlansFeature?.mode === 'quota'
      ? `${activePlansFeature.limit} plano${activePlansFeature.limit > 1 ? 's' : ''} ativo${activePlansFeature.limit > 1 ? 's' : ''}`
      : 'Planos ativos';

  const planFeatures = [
    { label: activePlansLabel, available: true },
    { label: 'Motor completo por matéria', available: hasFeature(FeatureCode.SubjectHealthFull) },
    { label: 'Simulados customizados', available: hasFeature(FeatureCode.SimulationsCustom) },
    { label: 'Diagnóstico semanal', available: hasFeature(FeatureCode.WeeklyDiagnostic) },
    { label: 'Mentoria recorrente', available: hasFeature(FeatureCode.WeeklyMentoring) },
    { label: 'Multi-edital', available: hasFeature(FeatureCode.MultiEdital) },
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Topbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-6 border-b border-border bg-card/30 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline"><Settings className="h-3 w-3 mr-1" /> Core</Badge>
          </div>
          <h1 className="font-sans text-am-h3 font-bold text-foreground tracking-tight mt-2">
            Conta e Configurações
          </h1>
          <p className="text-am-caption text-muted-foreground mt-1">
            Gerenciamento de perfil, acesso beta e segurança do sistema.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-6 space-y-6">
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
          <EntitlementSandboxCard currentScenarioUserId={sandboxScenarioUserId} />
        </motion.div>

        {canManageTesters && (
          <motion.div custom={0.5} variants={fadeUp} initial="hidden" animate="show">
            <TesterSubscriptionManagerCard />
          </motion.div>
        )}

        {canManageTesters && (
          <motion.div custom={0.75} variants={fadeUp} initial="hidden" animate="show">
            <BetaSignalsCard />
          </motion.div>
        )}

        {/* Profile card */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show">
          <Card padding="lg" variant="default" className="w-full">
            <div className="mb-5 flex items-center gap-2 border-b border-am-border-subtle pb-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-sans text-am-body font-bold text-foreground tracking-wide">Perfil Principal</h2>
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
                <p className="text-am-body font-bold text-foreground">{user.displayName || 'Usuário'}</p>
                <p className="text-am-body-sm text-muted-foreground">{user.email}</p>
                <Badge variant="default" className="mt-2 text-[10px] uppercase font-mono tracking-wider">UID: {user.uid.substring(0, 8)}…</Badge>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Plan card */}
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show">
          <div className="rounded-xl border border-border/50/40 p-6 shadow-am-lg overflow-hidden relative" style={{ background: 'linear-gradient(135deg, var(--color-am-surface) 0%, rgba(139, 92, 246, 0.05) 100%)' }}>
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-am-ai-glow/20 blur-[60px] rounded-full pointer-events-none transition-transform duration-1000"></div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-primary" />
                    <h2 className="font-sans text-am-body font-bold text-foreground tracking-wide">Escada de Acesso</h2>
                  </div>
                  <Badge variant="ai" className="shadow-[0_0_12px_var(--color-am-ai-glow)]">
                    {planTier}
                  </Badge>
                </div>

                <p className="text-am-body-sm text-muted-foreground mb-4 leading-relaxed">
                  O AprovaMind sobe de valor em tres camadas: Free para ativacao, Pro para estudo serio no single-plan e Premium para coordenacao avancada da rotina. No beta atual, upgrades e mudancas comerciais ainda sao operados manualmente.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/50 p-4 rounded-md border border-am-border-subtle">
                  {planFeatures.map(({ label, available }) => (
                    <div key={label} className="flex items-center gap-2.5">
                      {available
                        ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
                        : <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      }
                      <span className={`text-am-body-sm font-medium ${available ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-border/50/20 relative z-10">
              <Button
                variant="outline"
                onClick={() => setAccountModalOpen(true)}
                className="w-full justify-between border-border/50/40 text-primary hover:bg-primary/10"
              >
                <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Comparar acessos do beta</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show">
          <Card padding="lg" variant="default" className="w-full">
            <div className="mb-5 flex items-center gap-2 border-b border-am-border-subtle pb-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-sans text-am-body font-bold text-foreground tracking-wide">Segurança Institucional</h2>
            </div>
            <div className="space-y-3 bg-muted p-4 rounded-md border border-am-border-subtle">
              <p className="text-am-body-sm text-muted-foreground flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" /> Dados armazenados com segurança em Data Centers da Google Cloud</p>
              <p className="text-am-body-sm text-muted-foreground flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" /> Autenticação 256-bit via protocolo robusto (Google OAuth)</p>
              <p className="text-am-body-sm text-muted-foreground flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" /> Conexão blindada TLS de ponta a ponta</p>
              <p className="text-am-body-sm text-muted-foreground flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" /> Restrição total a compartilhamento com terceiros</p>
            </div>
          </Card>
        </motion.div>

        {/* Danger zone */}
        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show">
          <div className="rounded-xl border border-am-error/30 bg-am-error/5 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="font-sans text-am-body font-bold text-am-error tracking-wide">Zona de Risco</h2>
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
        currentTier={planTier}
        currentPlansCount={plans.length}
        onClose={() => setAccountModalOpen(false)}
      />
    </div>
  );
}
