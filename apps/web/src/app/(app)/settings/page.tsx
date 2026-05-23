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
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
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
  Loader2,
  Calendar,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { fadeUp } from '@/design-system/tokens';
import { Card, Badge, Button } from '@/components';
import { isAdminIdentity } from '@/lib/admin';

interface UserStatsData {
  planTier?: 'free' | 'pro' | 'admin';
  subscriptionStatus?: 'active' | 'canceled' | 'expired' | 'trialing' | 'grace_period' | 'past_due';
  subscriptionId?: string;
  subscriptionPaymentId?: string;
  subscriptionStartedAt?: string;
  billingPeriodEnd?: string;
}

export default function SettingsPage() {
  const { user, logout } = useAuthContext();
  const { plans } = usePlanContext();
  const { planTier, sandboxScenarioUserId, hasFeature, getFeature } = useEntitlements(
    user?.uid,
    user?.email
  );
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  // Faturamento / User Stats state
  const [userStats, setUserStats] = useState<UserStatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Cancellation States
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ success: boolean; refunded: boolean } | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    // Escutar alterações do documento user_stats em tempo real
    const unsubscribe = onSnapshot(
      doc(db, 'user_stats', user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          setUserStats(docSnap.data() as UserStatsData);
        } else {
          setUserStats({
            planTier: 'free',
            subscriptionStatus: 'expired',
          });
        }
        setLoadingStats(false);
      },
      (error) => {
        console.error('Erro ao buscar user_stats:', error);
        setLoadingStats(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

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

  const handleCancelSubscription = async () => {
    if (cancelLoading) return;
    setCancelLoading(true);
    setCancelError(null);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Por favor, faça login para continuar.');
      }

      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Erro ao processar o cancelamento da assinatura.');
      }

      setCancelResult({
        success: true,
        refunded: !!data.refunded,
      });
      setShowCancelConfirm(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cancelar a assinatura. Tente novamente.';
      setCancelError(message);
    } finally {
      setCancelLoading(false);
    }
  };

  const parseDate = (val: unknown): Date | null => {
    if (!val) return null;
    if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: unknown }).toDate === 'function') {
      return (val as { toDate: () => Date }).toDate();
    }
    try {
      return new Date(val as string | number | Date);
    } catch {
      return null;
    }
  };

  const formatDate = (val: unknown) => {
    const date = parseDate(val);
    if (!date) return '';
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const startedAt = userStats?.subscriptionStartedAt ? parseDate(userStats.subscriptionStartedAt) : null;
  const isWithinCDC = startedAt ? (Date.now() - startedAt.getTime()) <= 7 * 24 * 60 * 60 * 1000 : false;

  const actualPlanTier = userStats?.planTier || 'free';
  const actualSubStatus = userStats?.subscriptionStatus || 'expired';
  const isPro = actualPlanTier === 'pro';
  const isAdmin = planTier === 'admin';

  // Helper component/render for dynamic badge
  const renderStatusBadge = () => {
    switch (actualSubStatus) {
      case 'active':
        return (
          <Badge variant="success" className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.15)] font-sans font-bold">
            Ativo
          </Badge>
        );
      case 'canceled':
        return (
          <Badge variant="warning" className="bg-amber-500/15 text-amber-500 border border-amber-500/30 font-sans font-bold">
            Cancelamento Programado
          </Badge>
        );
      case 'trialing':
        return (
          <Badge variant="default" className="bg-cyan-500/15 text-cyan-500 border border-cyan-500/30 font-sans font-bold">
            Em Teste
          </Badge>
        );
      case 'grace_period':
        return (
          <Badge variant="warning" className="bg-amber-500/15 text-amber-500 border border-amber-500/30 font-sans font-bold">
            Período de Carência
          </Badge>
        );
      case 'past_due':
        return (
          <Badge variant="error" className="bg-red-500/15 text-red-500 border border-red-500/30 font-sans font-bold">
            Atrasado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground font-sans font-bold">
            Inativo
          </Badge>
        );
    }
  };

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

        {/* Faturamento (Assinatura) Section */}
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show">
          <div 
            className="rounded-xl border border-border p-6 shadow-am-lg overflow-hidden relative transition-all duration-300 hover:border-am-brand-primary/30" 
            style={{ background: 'linear-gradient(135deg, var(--color-am-surface) 0%, rgba(139, 92, 246, 0.05) 100%)' }}
          >
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-am-ai-glow/20 blur-[60px] rounded-full pointer-events-none transition-transform duration-1000"></div>

            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-am-border-subtle pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h2 className="font-sans text-am-body font-bold text-foreground tracking-wide">Faturamento & Assinatura</h2>
                </div>
                {isAdmin ? (
                  <Badge variant="ai" className="shadow-[0_0_12px_var(--color-am-ai-glow)] uppercase font-mono tracking-widest text-[10px]">
                    Admin
                  </Badge>
                ) : isPro ? (
                  <Badge variant="ai" className="shadow-[0_0_12px_var(--color-am-ai-glow)] font-sans font-bold">
                    Pro
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground font-sans font-bold">
                    Free
                  </Badge>
                )}
              </div>

              {loadingStats ? (
                <div className="flex flex-col gap-4 py-4 animate-pulse">
                  <div className="h-5 w-1/3 bg-muted rounded" />
                  <div className="h-16 w-full bg-muted rounded" />
                  <div className="h-10 w-full bg-muted rounded" />
                </div>
              ) : cancelResult ? (
                // Cancellation Success View
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center py-4 px-2"
                >
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="font-sans text-am-body font-bold text-foreground mb-2">
                    {cancelResult.refunded ? 'Assinatura Estornada com Sucesso!' : 'Renovação Cancelada'}
                  </h3>
                  <p className="text-am-body-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
                    {cancelResult.refunded 
                      ? 'De acordo com a garantia de 7 dias do Código de Defesa do Consumidor (CDC), o seu pagamento foi estornado de forma automática e seu plano retornou para a versão Free. O valor será creditado em sua fatura em alguns dias.'
                      : `Sua recorrência automática foi desativada com sucesso. Nenhuma nova cobrança será realizada no Mercado Pago. O seu acesso Pro permanece ativo e 100% disponível até o fim do seu ciclo em ${formatDate(userStats?.billingPeriodEnd)}.`}
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setCancelResult(null)}
                    className="w-full sm:w-auto px-6 border-border"
                  >
                    Entendi
                  </Button>
                </motion.div>
              ) : showCancelConfirm ? (
                // Cancellation Confirmation View
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-red-500/20 bg-red-500/5 p-5 space-y-4"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-sans text-am-body font-bold text-red-500">Tem certeza de que deseja cancelar?</h3>
                      <p className="text-am-body-sm text-muted-foreground mt-1 leading-relaxed">
                        {isWithinCDC 
                          ? 'Você está dentro do prazo de garantia de 7 dias (CDC). O cancelamento realizará o estorno automático e imediato do seu pagamento no Mercado Pago. Seu acesso Pro será encerrado imediatamente.'
                          : `Sua assinatura Pro não será renovada ao final do ciclo contratado. Nenhuma nova cobrança será realizada no Mercado Pago e você continuará com acesso total a todos os recursos Pro até ${formatDate(userStats?.billingPeriodEnd)}.`}
                      </p>
                    </div>
                  </div>

                  {cancelError && (
                    <p className="text-[11px] text-red-500 font-semibold bg-red-500/10 py-1.5 px-3 rounded border border-red-500/20">
                      {cancelError}
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      variant="danger"
                      disabled={cancelLoading}
                      onClick={handleCancelSubscription}
                      className="flex-1 justify-center"
                    >
                      {cancelLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processando...
                        </>
                      ) : (
                        'Confirmar Cancelamento'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={cancelLoading}
                      onClick={() => setShowCancelConfirm(false)}
                      className="flex-1 justify-center border-border hover:bg-muted"
                    >
                      Manter plano Pro
                    </Button>
                  </div>
                </motion.div>
              ) : (
                // Main Panel View
                <div className="space-y-4">
                  {isAdmin ? (
                    // Admin View
                    <div className="space-y-3">
                      <p className="text-am-body-sm text-muted-foreground leading-relaxed">
                        Você possui privilégios totais de Administrador no sistema. O faturamento e cobranças recorrentes estão desativados para contas de equipe interna e desenvolvimento.
                      </p>
                      <div className="p-4 bg-muted/50 rounded-md border border-am-border-subtle flex items-center gap-3">
                        <Shield className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-am-body-sm font-semibold text-foreground">Acesso ilimitado de desenvolvedor ativo</span>
                      </div>
                    </div>
                  ) : isPro ? (
                    // Pro View
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/40 rounded-lg border border-am-border-subtle space-y-1">
                          <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Status da Assinatura</p>
                          <div className="pt-1">{renderStatusBadge()}</div>
                        </div>

                        <div className="p-4 bg-muted/40 rounded-lg border border-am-border-subtle space-y-1">
                          <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                            {actualSubStatus === 'canceled' ? 'Fim do Acesso' : 'Próxima Cobrança'}
                          </p>
                          <p className="text-am-body font-bold text-foreground flex items-center gap-1.5 pt-1">
                            <Calendar className="h-4 w-4 text-primary" />
                            {formatDate(userStats?.billingPeriodEnd)}
                          </p>
                        </div>
                      </div>

                      {actualSubStatus === 'canceled' ? (
                        <div className="p-4 bg-amber-500/5 rounded-lg border border-amber-500/20 text-am-body-sm text-muted-foreground leading-relaxed">
                          Sua assinatura foi cancelada com sucesso. Seu acesso Pro continuará válido até{' '}
                          <span className="font-semibold text-foreground">{formatDate(userStats?.billingPeriodEnd)}</span>. Após essa data, sua conta voltará ao plano Free e nenhuma nova cobrança será feita.
                        </div>
                      ) : (
                        <div className="p-4 bg-emerald-500/5 rounded-lg border border-emerald-500/20 text-am-body-sm text-muted-foreground leading-relaxed">
                          Sua assinatura está ativa e configurada no Mercado Pago. O valor será cobrado de forma recorrente. Para sua tranquilidade, você pode cancelar a qualquer momento sem custos de fidelidade ou taxas extras.
                        </div>
                      )}

                      {/* Cancel Subscription Button */}
                      {actualSubStatus === 'active' && (
                        <div className="pt-2">
                          <Button
                            variant="danger"
                            onClick={() => setShowCancelConfirm(true)}
                            className="w-full justify-center bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200"
                          >
                            Cancelar Assinatura
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Free View
                    <div className="space-y-4">
                      <p className="text-am-body-sm text-muted-foreground leading-relaxed">
                        Você está no plano <span className="font-semibold text-foreground uppercase">AprovaMind Free</span>. 
                        Faça o upgrade para liberar o motor de simulados customizados, IA explicativa ilimitada, diagnóstico semanal completo e recuperação adaptativa de cronogramas.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/50 p-4 rounded-md border border-am-border-subtle">
                        {planFeatures.map(({ label, available }) => (
                          <div key={label} className="flex items-center gap-2.5">
                            {available ? (
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
                            ) : (
                              <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            )}
                            <span className={`text-am-body-sm font-medium ${available ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {label}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 flex flex-col gap-3">
                        <Button
                          variant="default"
                          onClick={() => setAccountModalOpen(true)}
                          className="w-full justify-center bg-primary hover:bg-primary/95 text-white shadow-am-md hover:shadow-am-lg active:scale-[0.98] transition-all"
                        >
                          <Zap className="h-4 w-4 mr-2 fill-current" />
                          Fazer Upgrade para o Pro
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => setAccountModalOpen(true)}
                          className="w-full justify-between border-border/50/40 text-primary hover:bg-primary/10"
                        >
                          <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Ver tabelas comparativas</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
