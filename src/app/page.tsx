import Link from 'next/link';
import { Button, Badge } from '@/components';
import { Sparkles, Brain, Target, TrendingUp, ChevronRight, CheckCircle2, Zap, Flame, AlertTriangle, LayoutDashboard, Timer, CalendarDays, BarChart2, Play } from 'lucide-react';

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
              <div className="rounded-xl border border-white/10 bg-am-canvas p-1 sm:p-2 shadow-[0_0_60px_rgba(61,116,246,0.1)] backdrop-blur-sm relative z-20">
                <div className="rounded-lg border border-white/5 bg-am-canvas overflow-hidden aspect-video relative flex">
                  {/* Subtle top fade for realism */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent z-10 pointer-events-none" />

                  {/* Sidebar Mock */}
                  <div className="w-16 lg:w-56 flex-shrink-0 flex flex-col border-r border-white/5 bg-am-canvas transition-all z-20">
                    {/* Logo Area */}
                    <div className="flex items-center gap-3 px-4 lg:px-6 py-5 lg:py-6 border-b border-white/5">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-am-surface-elevated ring-1 ring-white/10">
                        <Zap className="h-4 w-4 text-am-text-primary" />
                      </div>
                      <div className="min-w-0 hidden lg:block">
                        <p className="font-brand text-[15px] font-medium tracking-tight text-am-text-primary leading-none mt-1">
                          AprovaMind
                        </p>
                        <p className="mt-1 text-[9px] text-am-text-tertiary uppercase tracking-[0.2em] font-mono">
                          Strategic Engine
                        </p>
                      </div>
                    </div>

                    {/* Fake Plan Badge */}
                    <div className="hidden lg:block mx-3 mt-3">
                      <div className="flex w-full items-center gap-2 rounded-full border border-am-border-default bg-am-surface-subtle px-3 py-2">
                        <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: 'var(--color-am-brand-primary)', boxShadow: '0 0 6px rgba(61,116,246,0.5)' }} />
                        <span className="min-w-0 flex-1 truncate text-xs text-am-text-secondary font-mono">
                          Edital Master (RFB)
                        </span>
                        <ChevronRight className="h-3 w-3 text-am-text-secondary" />
                      </div>
                    </div>

                    {/* Nav Items */}
                    <nav className="flex-1 overflow-y-auto px-2 lg:px-4 py-6 space-y-1">
                      <p className="mb-4 px-2 text-[10px] uppercase tracking-widest text-am-text-tertiary font-mono hidden lg:block">Navegação</p>
                      <div className="relative flex items-center justify-center lg:justify-start gap-3 rounded-lg px-2 py-2 text-[13px] font-medium bg-white/5 text-am-text-primary transition-all duration-150">
                        <LayoutDashboard className="h-[18px] w-[18px] flex-shrink-0 text-am-text-primary" strokeWidth={2} />
                        <span className="hidden lg:inline truncate">Dashboard</span>
                        <span className="absolute right-2 h-1 w-1 rounded-full bg-am-brand-primary hidden lg:block" />
                      </div>
                      <div className="relative flex items-center justify-center lg:justify-start gap-3 rounded-lg px-2 py-2 text-[13px] font-medium text-am-text-secondary transition-all duration-150">
                        <Timer className="h-[18px] w-[18px] flex-shrink-0 text-am-text-tertiary" strokeWidth={1.5} />
                        <span className="hidden lg:inline truncate">Sessão de Estudo</span>
                      </div>
                      <div className="relative flex items-center justify-center lg:justify-start gap-3 rounded-lg px-2 py-2 text-[13px] font-medium text-am-text-secondary transition-all duration-150">
                        <CalendarDays className="h-[18px] w-[18px] flex-shrink-0 text-am-text-tertiary" strokeWidth={1.5} />
                        <span className="hidden lg:inline truncate">Planner</span>
                      </div>
                      <div className="relative flex items-center justify-center lg:justify-start gap-3 rounded-lg px-2 py-2 text-[13px] font-medium text-am-text-secondary transition-all duration-150">
                        <Brain className="h-[18px] w-[18px] flex-shrink-0 text-am-text-tertiary" strokeWidth={1.5} />
                        <span className="hidden lg:inline truncate">Mentoria IA</span>
                      </div>
                      <div className="relative flex items-center justify-center lg:justify-start gap-3 rounded-lg px-2 py-2 text-[13px] font-medium text-am-text-secondary transition-all duration-150">
                        <BarChart2 className="h-[18px] w-[18px] flex-shrink-0 text-am-text-tertiary" strokeWidth={1.5} />
                        <span className="hidden lg:inline truncate">Análises</span>
                      </div>
                    </nav>

                    {/* Fake Avatar */}
                    <div className="border-t border-am-border-default p-3 flex justify-center lg:justify-start">
                      <div className="flex items-center gap-2 rounded-lg lg:px-2 lg:py-2">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-am-surface-elevated text-[10px] text-am-text-secondary font-mono ring-1 ring-white/10">
                          E
                        </div>
                        <div className="min-w-0 flex-1 hidden lg:block">
                          <p className="truncate text-xs text-am-text-primary">Estudante</p>
                          <p className="truncate text-[9px] text-am-text-tertiary font-mono">user@aprovamind.com</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Platform Section Mock */}
                  <div className="flex-1 flex flex-col bg-am-canvas overflow-y-auto no-scrollbar relative z-20">
                    <div className="px-5 sm:px-8 pt-8 sm:pt-12 pb-6 flex flex-col gap-6 sm:gap-8 min-w-[600px]">

                      {/* Header */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h1 className="font-brand text-[32px] sm:text-[40px] font-light text-am-text-primary tracking-tighter leading-none">
                            Dashboard
                          </h1>
                          <p className="text-[10px] sm:text-[12px] text-am-text-tertiary mt-2 sm:mt-3 font-mono uppercase tracking-widest">
                            Análise Estratégica
                          </p>
                        </div>
                        <div className="hidden sm:flex items-center gap-3 mt-2">
                          <div className="h-9 px-6 rounded-full bg-am-brand-primary flex items-center gap-2 text-white text-sm font-semibold shadow-[0_4px_12px_rgba(61,116,246,0.3)]">
                            <Play className="h-4 w-4 fill-current" /> Iniciar
                          </div>
                        </div>
                      </div>

                      {/* KPIs */}
                      <div className="grid grid-cols-3 gap-4 sm:gap-6">
                        <div className="rounded-am-xl bg-am-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] border border-am-border-default/50 ring-1 ring-white/5 p-4 sm:p-6 flex flex-col justify-between min-h-[140px] sm:min-h-[160px]">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-am-text-secondary font-mono">Focus Score</span>
                            <Target className="h-4 w-4 text-am-text-tertiary opacity-50" />
                          </div>
                          <div className="mt-auto flex flex-col gap-1">
                            <span className="font-brand text-4xl sm:text-5xl font-light tracking-tighter text-am-text-primary leading-none">82%</span>
                          </div>
                        </div>
                        <div className="rounded-am-xl bg-am-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] border border-am-border-default/50 ring-1 ring-white/5 p-4 sm:p-6 flex flex-col justify-between min-h-[140px] sm:min-h-[160px]">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-am-text-secondary font-mono">Retenção Semanal</span>
                            <TrendingUp className="h-4 w-4 text-am-text-tertiary opacity-50" />
                          </div>
                          <div className="mt-auto flex flex-col gap-1">
                            <span className="font-brand text-4xl sm:text-5xl font-light tracking-tighter text-am-text-primary leading-none">75%</span>
                          </div>
                        </div>
                        <div className="rounded-am-xl bg-am-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] border border-am-border-default/50 ring-1 ring-white/5 p-4 sm:p-6 flex flex-col justify-between min-h-[140px] sm:min-h-[160px]">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-am-text-secondary font-mono">Study Velocity</span>
                            <Flame className="h-4 w-4 text-am-text-tertiary opacity-50" />
                          </div>
                          <div className="mt-auto flex flex-col gap-1">
                            <span className="font-brand text-4xl sm:text-5xl font-light tracking-tighter text-am-text-primary leading-none">6d</span>
                            <span className="flex items-center gap-1 text-[11px] font-mono mt-1 text-am-success">+1d <span className="font-normal text-am-text-secondary ml-1 lowercase tracking-normal">dias seguidos</span></span>
                          </div>
                        </div>
                      </div>

                      {/* Lower Body - Charts Mock */}
                      <div className="grid grid-cols-5 gap-4 sm:gap-6 flex-1 min-h-[220px]">
                        <div className="col-span-3 rounded-am-xl bg-am-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] border border-am-border-default/50 ring-1 ring-white/5 p-4 sm:p-6 flex flex-col">
                          <div className="mb-6 flex justify-between items-start">
                            <div>
                              <h3 className="font-brand text-sm sm:text-base font-bold text-am-text-primary tracking-tight">Study Pulse</h3>
                              <p className="text-[10px] sm:text-xs text-am-text-tertiary mt-0.5 font-mono uppercase tracking-widest">Evolução de horas líquidas</p>
                            </div>
                          </div>
                          <div className="flex-1 relative mt-2 border-b border-l border-am-border-strong border-opacity-30">
                            {/* Fake SVG Area Chart */}
                            <svg className="absolute inset-0 h-full w-full opacity-80" preserveAspectRatio="none" viewBox="0 0 100 100">
                              <defs>
                                <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="var(--color-am-brand-primary)" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="var(--color-am-brand-primary)" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <path d="M0 80 L15 50 L30 65 L45 35 L60 55 L75 25 L90 40 L100 15 L100 100 L0 100 Z" fill="url(#heroGradient)" stroke="none" />
                              <path d="M0 80 L15 50 L30 65 L45 35 L60 55 L75 25 L90 40 L100 15" fill="none" stroke="var(--color-am-brand-primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                            </svg>
                          </div>
                        </div>
                        <div className="col-span-2 rounded-am-xl bg-am-surface border border-am-ai-border/20 shadow-[inset_0_1px_0_rgba(139,92,246,0.1)] relative overflow-hidden flex flex-col p-5 sm:p-6">
                          <div className="absolute top-0 left-0 right-0 h-[2px] bg-am-brand-gradient opacity-80" />
                          <div className="mb-4 sm:mb-6 flex items-start gap-3">
                            <div className="rounded-am-md border border-am-border-default bg-am-brand-primary/10 p-2">
                              <Sparkles className="h-4 w-4 text-am-brand-primary" />
                            </div>
                            <div>
                              <h3 className="font-brand text-sm sm:text-base font-bold text-am-text-primary tracking-tight">Insights Estratégicos</h3>
                              <p className="text-[10px] text-am-text-secondary mt-0.5 font-mono uppercase tracking-widest">Recomendações</p>
                            </div>
                          </div>
                          <div className="flex gap-3 rounded-lg border border-am-border-default bg-am-surface px-3 py-3 shadow-sm hover:bg-am-surface-subtle transition-colors">
                            <div className="mt-0.5 shrink-0 flex items-center justify-center h-8 w-8 rounded-md bg-am-brand-primary/10">
                              <AlertTriangle className="h-4 w-4 text-am-brand-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-am-text-primary">Ajuste de Rota Detectado</p>
                              <p className="mt-0.5 text-[11px] leading-relaxed text-am-text-secondary">Sua retenção em <strong>Contratos Administrativos</strong> caiu 12% nas últimas métricas. Sugiro uma sessão focada hoje.</p>
                            </div>
                          </div>
                          <div className="mt-auto h-9 w-full rounded-am-md bg-am-ai-default flex items-center justify-center text-[11px] font-bold text-white shadow-[0_4px_12px_var(--color-am-ai-glow)] cursor-pointer hover:bg-am-brand-secondary transition-colors">
                            Aceitar Recomenção
                          </div>
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
