import Link from 'next/link';
import { Button, Badge } from '@/components';
import { Sparkles, Brain, Target, TrendingUp, ChevronRight, CheckCircle2, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-am-surface-deep font-sans text-am-text-primary overflow-x-hidden selection:bg-am-brand-primary/30">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.04] bg-am-surface-deep/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-am-md bg-am-brand-gradient shadow-[0_0_12px_var(--color-am-brand-primary)]">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-brand text-lg font-bold tracking-tight text-white">AprovaMind</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-am-body-sm font-semibold text-am-text-secondary hover:text-white transition-colors">
              Entrar
            </Link>
            <Button asChild variant="primary" size="sm" className="hidden sm:flex">
              <Link href="/login">Começar Gratuitamente</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-am-ai-glow/20 rounded-full blur-[120px] pointer-events-none opacity-50" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-am-brand-primary/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="mx-auto max-w-7xl px-6 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-am-ai-border/40 bg-am-surface/60 px-4 py-1.5 mb-8 backdrop-blur-sm shadow-[0_0_16px_var(--color-am-ai-glow)]">
              <Sparkles className="h-4 w-4 text-am-ai-default" />
              <span className="text-sm font-medium text-am-text-primary tracking-wide">Inteligência Estratégica para Concursos</span>
            </div>

            <h1 className="font-brand text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-tight max-w-4xl mx-auto">
              Não estude mais.<br /> Estude <span className="text-transparent bg-clip-text bg-am-brand-gradient">cirurgicamente.</span>
            </h1>

            <p className="text-lg md:text-xl text-am-text-secondary mb-10 max-w-2xl mx-auto leading-relaxed">
              O AprovaMind não é mais um cursinho com milhares de PDFs. É o primeiro sistema de performance guiado por IA que diagnostica suas fraquezas e traça a rota exata até a aprovação.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild variant="premium" size="lg" className="w-full sm:w-auto h-14 px-8 text-base shadow-[0_4px_24px_var(--color-am-ai-glow)]">
                <Link href="/login">Criar meu plano estratégico agora <ChevronRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            </div>

            {/* Platform Mockup Preview */}
            <div className="mt-20 relative mx-auto max-w-5xl">
              <div className="rounded-xl border border-white/10 bg-am-surface p-2 shadow-2xl shadow-am-ai-default/10 backdrop-blur-sm">
                <div className="rounded-lg border border-white/5 bg-[#0a0f18] overflow-hidden aspect-video relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f18] to-transparent z-10" />
                  <div className="w-full h-full p-8 opacity-80" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                    {/* Fake Dashboard Layout for Hero */}
                    <div className="flex h-full gap-6">
                      <div className="w-64 flex-shrink-0 rounded-lg border border-white/5 bg-white/[0.02]" />
                      <div className="flex-1 flex flex-col gap-6">
                        <div className="h-20 rounded-lg border border-white/5 bg-white/[0.02]" />
                        <div className="flex gap-6">
                          <div className="h-32 flex-1 rounded-lg border border-am-ai-border/30 bg-am-ai-default/5 shadow-[0_0_15px_var(--color-am-ai-glow)] relative overflow-hidden">
                            <div className="absolute top-0 right-0 mt-4 mr-4 text-am-ai-default"><Brain className="h-6 w-6" /></div>
                          </div>
                          <div className="h-32 flex-1 rounded-lg border border-white/5 bg-white/[0.02]" />
                          <div className="h-32 flex-1 rounded-lg border border-white/5 bg-white/[0.02]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature: The Problem vs The System */}
        <section className="py-24 bg-am-surface border-y border-white/[0.02]">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="font-brand text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">O Fim da "Força Bruta" e Ansiedade</h2>
              <p className="text-am-text-secondary">O cenário atual de concursos vende a ilusão de que 12h líquidas te aprovam. Nós provamos que 4h líquidas bem direcionadas ganham o jogo.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Target,
                  title: 'Tracking Milimétrico',
                  desc: 'Adeus planilhas confusas de excel. Cada segundo da sua sessão abastece o motor analítico e reconstrói o seu edital dinamicamente.',
                  color: 'text-am-brand-primary',
                  bg: 'bg-am-brand-primary/10'
                },
                {
                  icon: Brain,
                  title: 'Ajuste Fino por IA',
                  desc: 'Se a sua retenção em Contratos Administrativos caiu, a IA percebe antes de você e injeta na sua agenda a sessão exata para reverter o quadro.',
                  color: 'text-am-ai-default',
                  bg: 'bg-am-ai-default/10'
                },
                {
                  icon: TrendingUp,
                  title: 'Multi-Edital Nativo',
                  desc: 'Estuda para TSE e TRTs ao mesmo tempo? Gerencie o peso estratégico de cada matéria entre múltiplos editais sem enlouquecer.',
                  color: 'text-am-brand-secondary',
                  bg: 'bg-am-brand-secondary/10'
                }
              ].map((f, i) => (
                <div key={i} className="rounded-2xl border border-white/[0.04] bg-am-surface-elevated p-8 hover:bg-white/[0.02] transition-colors">
                  <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-xl ${f.bg}`}>
                    <f.icon className={`h-6 w-6 ${f.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                  <p className="text-am-text-secondary leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Deep Dive Section */}
        <section className="py-32 relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <Badge variant="ai" className="mb-4">
                  <Brain className="h-3 w-3 mr-1" /> Diagnóstico Preditivo
                </Badge>
                <h2 className="font-brand text-4xl font-bold tracking-tight text-white mb-6">Mentoria Analítica e <br /><span className="text-am-ai-default">Decisão Implacável</span></h2>
                <p className="text-lg text-am-text-secondary mb-8">
                  O SmartSchedule do AprovaMind não monta uma grade fixa de horários de colégio. Ele analisa o <strong>seu mapa de calor</strong>, suas taxas de acerto e sugere a <strong>próxima melhor sessão</strong> que maximiza a sua curva de esquecimento.
                </p>
                <ul className="space-y-4">
                  {['Relocalização de Tempo Ocioso', 'Previsão de Declínio de Memória', 'Priorização de Blocos Críticos do Edital'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-am-success" />
                      <span className="text-am-text-primary font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-am-ai-glow/20 blur-[80px] rounded-full" />
                <div className="relative rounded-2xl border border-am-ai-border/40 bg-am-surface p-8 shadow-2xl backdrop-blur-md">
                  {/* Component preview */}
                  <div className="space-y-4">
                    <div className="h-4 pl-1 text-[10px] font-mono text-am-text-tertiary uppercase tracking-wider">AprovaMind Copilot</div>
                    <div className="p-4 rounded-lg bg-am-surface-deep border border-white/[0.05]">
                      <p className="text-am-text-secondary text-sm">"Notei que o seu Focus Score em <strong className="text-white">Direito Administrativo</strong> abaixou para 64% na última bateria. Como esta disciplina representa 18% do Edital 1, sugiro que a próxima sessão de 50min foque na re-leitura de Licitações."</p>
                    </div>
                    <Button variant="premium" className="w-full mt-2">Acionar Modo Resgate</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-[#0a0f18] border-t border-white/[0.05]">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="font-brand text-3xl font-bold text-white mb-6">Preparado para jogar com Estratégia?</h2>
            <p className="text-am-text-secondary mb-10">Junte-se a candidatos que trocaram a ansiedade de cobrir 100% de materiais gigantescos por um planejamento cirúrgico e adaptativo.</p>
            <Button asChild variant="primary" size="lg" className="h-14 px-10 text-base shadow-[0_0_20px_var(--color-am-brand-primary)]">
              <Link href="/login">Criar Minha Conta Gratuita <ChevronRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.05] bg-am-surface-deep py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <Zap className="h-5 w-5" />
            <span className="font-brand font-bold text-white">AprovaMind</span>
          </div>
          <p className="text-sm text-am-text-tertiary">
            © {new Date().getFullYear()} AprovaMind. Sistema de Performance para Concurseiros.
          </p>
        </div>
      </footer>
    </div>
  );
}
