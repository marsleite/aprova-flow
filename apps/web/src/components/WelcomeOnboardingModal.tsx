'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Target,
  Smartphone,
  Timer,
  CheckCircle2,
  ArrowRight,
  X,
  Zap,
} from 'lucide-react';
import { Button, Badge } from '@/components';
import { useAuthContext } from '@/contexts/AuthContext';

export default function WelcomeOnboardingModal() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    const completed = localStorage.getItem(`aprovamind_onboarding_${user.uid}`);
    if (!completed) {
      // Delay de 1 segundo para a tela inicial carregar suavemente
      const timer = setTimeout(() => setIsOpen(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleDismiss = () => {
    if (user) {
      localStorage.setItem(`aprovamind_onboarding_${user.uid}`, 'true');
    }
    setIsOpen(false);
  };

  const steps = [
    {
      badge: 'Passo 1 de 3',
      title: 'Bem-vindo ao AprovaMind! 🎯',
      subtitle: 'Sua plataforma de alta performance guiada por Inteligência Artificial.',
      icon: Target,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
      description:
        'O primeiro passo é definir seu edital ou meta. A plataforma calcula pesos de matérias e gera um ciclo de estudos inteligente adaptado à sua rotina.',
      actionLabel: 'Criar meu Plano de Estudos',
      action: () => {
        handleDismiss();
        router.push('/planner');
      },
    },
    {
      badge: 'Passo 2 de 3',
      title: 'Tutor de IA no WhatsApp 📲',
      subtitle: 'Estude e pratique no celular nos intervalos do seu dia.',
      icon: Smartphone,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10',
      description:
        'Conecte seu WhatsApp com 1 clique para receber simulados diários, flashcards e tirar dúvidas jurídicas complexas com jurisprudência STF/STJ.',
      actionLabel: 'Conectar WhatsApp Agora',
      action: () => {
        handleDismiss();
        router.push('/settings');
      },
    },
    {
      badge: 'Passo 3 de 3',
      title: 'Controle de Horas Líquidas ⏱️',
      subtitle: 'Foco profundo e cronômetro integrado sem distrações.',
      icon: Timer,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10',
      description:
        'Monitore exatamente quanto tempo você passa focado em cada disciplina. Acompanhe gráficos de evolução semanal e retenção de conteúdo no seu Dashboard.',
      actionLabel: 'Começar a Estudar!',
      action: () => {
        handleDismiss();
        router.push('/planner');
      },
    },
  ];

  if (!isOpen) return null;

  const current = steps[currentStep];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-am-border-subtle bg-am-surface p-6 sm:p-8 shadow-2xl"
          style={{
            background:
              'linear-gradient(135deg, var(--color-am-surface) 0%, rgba(139, 92, 246, 0.05) 100%)',
          }}
        >
          {/* Glow de fundo */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-52 h-52 bg-am-ai-glow/20 blur-[70px] rounded-full pointer-events-none" />

          {/* Botão fechar */}
          <button
            onClick={handleDismiss}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Pular introdução"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10 space-y-6">
            {/* Cabeçalho do passo */}
            <div className="flex items-center gap-2">
              <Badge variant="ai" className="text-[11px] font-mono tracking-wider uppercase">
                <Sparkles className="w-3 h-3 mr-1 text-primary inline" />
                {current.badge}
              </Badge>
            </div>

            {/* Ícone e Título */}
            <div className="flex items-start gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${current.iconBg} ${current.iconColor} shadow-inner`}>
                <Icon className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold font-sans text-foreground tracking-tight">
                  {current.title}
                </h2>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {current.subtitle}
                </p>
              </div>
            </div>

            {/* Descrição */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {current.description}
            </p>

            {/* Indicador de passos */}
            <div className="flex items-center gap-2 py-1">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep
                      ? 'w-8 bg-primary shadow-sm'
                      : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                  title={`Ir para passo ${idx + 1}`}
                />
              ))}
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {currentStep < steps.length - 1 ? (
                <Button
                  variant="primary"
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                  className="flex-1 justify-center gap-2 bg-primary hover:bg-primary/95 text-white shadow-am-md"
                >
                  Próximo <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={current.action}
                  className="flex-1 justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-am-md"
                >
                  <Zap className="w-4 h-4" />
                  {current.actionLabel}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={handleDismiss}
                className="justify-center border-border hover:bg-muted text-xs text-muted-foreground"
              >
                Pular Introdução
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
