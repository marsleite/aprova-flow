'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthContext } from '@/contexts/AuthContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { Card, Button, Badge } from '@/components';
import { CheckCircle2, Crown, Zap, ArrowRight } from 'lucide-react';
import { fadeUp } from '@/design-system/tokens';

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { planTier, refresh, loading } = useEntitlements(user?.uid, user?.email);

  useEffect(() => {
    // Refresh entitlements to capture the newly activated subscription webhook updates
    if (user) {
      const interval = setInterval(() => {
        refresh();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [user, refresh]);

  if (!user) return null;

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="relative overflow-hidden rounded-2xl border border-border/50/40 p-8 shadow-am-lg text-center"
          style={{ background: 'linear-gradient(135deg, var(--color-am-surface) 0%, rgba(139, 92, 246, 0.05) 100%)' }}
        >
          {/* Animated AI Glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-am-ai-glow/20 blur-[60px] rounded-full pointer-events-none"></div>
          
          <div className="relative z-10 space-y-6">
            {/* Animated Success Icon Container */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 text-green-500 shadow-inner">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                <CheckCircle2 className="h-10 w-10" />
              </motion.div>
            </div>

            <div className="space-y-2">
              <Badge variant="ai" className="shadow-[0_0_12px_var(--color-am-ai-glow)] mx-auto">
                <Crown className="mr-1 h-3.5 w-3.5 text-primary animate-pulse" /> PRO ATIVO
              </Badge>
              <h1 className="font-sans text-am-h3 font-bold text-foreground tracking-tight">
                Assinatura Confirmada!
              </h1>
              <p className="text-am-body-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Parabéns! Sua conta foi atualizada para o <strong className="text-foreground">AprovaMind Pro</strong>. Todas as funcionalidades premium, plano adaptativo de estudos e cotas estendidas já estão liberadas.
              </p>
            </div>

            {/* Plan Tier Status Info */}
            <div className="bg-muted/50 p-4 rounded-xl border border-am-border-subtle text-left space-y-3">
              <div className="flex justify-between items-center text-am-body-sm">
                <span className="text-muted-foreground font-medium">Plano Atual</span>
                <span className="font-bold text-foreground capitalize flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-primary" /> {planTier}
                </span>
              </div>
              <div className="flex justify-between items-center text-am-body-sm">
                <span className="text-muted-foreground font-medium">Status</span>
                <span className="font-semibold text-green-500 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Pago
                </span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3">
              <Button
                variant="primary"
                onClick={() => router.push('/dashboard')}
                className="w-full justify-center shadow-am-md hover:shadow-am-lg transition-all"
              >
                Ir para o Painel <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/settings')}
                className="w-full justify-center border-border/50/40 text-muted-foreground hover:text-foreground"
              >
                Gerenciar Faturamento
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
