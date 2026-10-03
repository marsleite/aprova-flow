import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Target,
  Brain,
  TrendingUp,
  ChevronRight,
  Zap,
  LayoutDashboard,
  Timer,
  CalendarDays,
  AlertTriangle,
  FileText,
  Users,
  Clock,
  MessageSquare,
  Sparkles,
  Smartphone,
  CheckCircle2,
  Check,
  Shield,
  ArrowRight,
  Send,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'AprovaMind | Cockpit Web e Tutor 24/7 no WhatsApp para Concursos',
  description:
    'Rastreie horas líquidas de estudo, planeje seu edital com IA e tenha um tutor pessoal no WhatsApp com simulados diários comentados e jurisprudência dos tribunais superiores.',
  keywords: [
    'tutor de concurso no whatsapp',
    'simulados whatsapp concurso',
    'plataforma de estudo para concursos',
    'cronômetro de estudo para concurso',
    'plano de estudo para concurso público',
    'horas líquidas de estudo',
    'PGE',
    'magistratura',
    'TJSP',
    'jurisprudencia stf stj concurso',
  ],
  openGraph: {
    title: 'AprovaMind | Cockpit Web & Tutor 24/7 no WhatsApp',
    description:
      'Rastreie horas líquidas, planeje editais e treine todo dia no WhatsApp com simulados e jurisprudência. Comece gratuitamente.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'AprovaMind',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AprovaMind | Cockpit Web & Tutor 24/7 no WhatsApp',
    description: 'A plataforma mais inteligente para passar em concursos públicos.',
  },
  alternates: {
    canonical: 'https://aprovamind.com.br',
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 selection:bg-primary/30 font-sans">
      {/* ── Navigation ── */}
      <nav className="z-50 sticky global-nav w-full border-b border-border top-0 bg-background/80 backdrop-blur-md transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Link href="/" className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-2.5 h-2.5 rounded-full animate-pulse bg-primary"></span>
              <span className="font-semibold tracking-tight text-foreground text-xl">
                Aprova<span className="text-primary">Mind</span>
              </span>
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-8 text-xs font-medium text-muted-foreground uppercase tracking-widest">
            <a href="#tutor-whatsapp" className="hover:text-foreground transition-colors flex items-center gap-1.5 text-emerald-500 font-semibold">
              <MessageSquare className="w-3.5 h-3.5" /> Tutor WhatsApp
            </a>
            <a href="#cockpit" className="hover:text-foreground transition-colors">
              Cockpit Web
            </a>
            <a href="#parse-edital" className="hover:text-foreground transition-colors">
              Edital com IA
            </a>
            <a href="#precos" className="hover:text-foreground transition-colors">
              Planos
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-medium tracking-widest text-muted-foreground uppercase hover:text-foreground transition-colors px-3 py-2"
            >
              Entrar
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 text-primary-foreground text-xs font-semibold uppercase tracking-widest transition-all duration-300 shadow-lg bg-primary hover:opacity-90 shadow-primary/20 hover:shadow-primary/40 rounded-full"
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* ── Hero Section ── */}
        <header className="overflow-hidden border-border border-b pt-16 pb-28 relative">
          {/* Ambient Glow */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full blur-[140px] bg-primary/10" />
            <div className="absolute -right-40 top-1/3 h-[500px] w-[500px] rounded-full blur-[140px] bg-emerald-500/10" />
          </div>

          <div className="max-w-7xl mx-auto px-6 relative">
            <div className="max-w-4xl pt-6">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="text-xs font-semibold tracking-widest uppercase text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Novo: Tutor Integrado no WhatsApp
                </span>
                <span className="text-xs font-medium tracking-widest uppercase text-muted-foreground border border-border px-3 py-1.5 rounded-full">
                  Cockpit Web + Celular
                </span>
              </div>

              <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tighter leading-[0.95] text-foreground mb-8">
                Planeje no computador.<br />
                Treine todo dia no<br />
                <span className="text-emerald-400">WhatsApp.</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-10 font-light">
                O único ecossistema que une <strong>tracking fiel de horas líquidas</strong> e planejamento de edital na Web com um <strong>Tutor de Concursos 24/7 no seu WhatsApp</strong> para tirar dúvidas de jurisprudência (STF/STJ) e enviar simulados diários no almoço.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Link
                  href="/login"
                  className="px-8 py-4.5 rounded-full text-white text-xs font-semibold uppercase tracking-widest transition-all duration-300 shadow-xl bg-primary hover:opacity-90 shadow-primary/25 flex items-center justify-center gap-2"
                >
                  Criar Conta Gratuita
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#tutor-whatsapp"
                  className="px-8 py-4.5 rounded-full uppercase hover:bg-muted/30 transition-all duration-300 text-xs font-semibold text-foreground tracking-widest border border-border flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  Ver Como Funciona no WhatsApp
                </a>
              </div>
            </div>

            {/* ── Dual Mockup (Cockpit + WhatsApp Float) ── */}
            <div className="mt-20 max-w-6xl relative">
              {/* Cockpit Card */}
              <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
                <div className="border-b border-border bg-muted/40 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-3 text-xs font-mono text-muted-foreground">aprovamind.com/dashboard</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    WhatsApp Tutor Sincronizado
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 min-h-[380px]">
                  {/* Left Column: Sidebar items */}
                  <div className="border-r border-border p-6 flex flex-col gap-4 bg-muted/10">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                      Pilares do Aluno
                    </div>
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-sm border border-primary/20">
                      <Timer className="w-4 h-4" />
                      <span>Estudar Agora</span>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 rounded-xl text-muted-foreground text-sm hover:text-foreground transition-colors">
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Dashboard</span>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 rounded-xl text-muted-foreground text-sm hover:text-foreground transition-colors">
                      <CalendarDays className="w-4 h-4" />
                      <span>Editais & Metas</span>
                    </div>
                  </div>

                  {/* Main: KPIs + Live Dashboard */}
                  <div className="md:col-span-3 p-6 sm:p-8 flex flex-col justify-between bg-card">
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-widest text-primary">Contexto Ativo</p>
                          <h3 className="text-2xl font-bold text-foreground">Magistratura Estadual — TJSP</h3>
                        </div>
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-secondary text-foreground border border-border">
                          Meta: 24h/semana
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="p-4 rounded-xl border border-border bg-muted/20">
                          <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Horas Líquidas</p>
                          <p className="text-2xl font-bold text-foreground mt-1">18.4h</p>
                        </div>
                        <div className="p-4 rounded-xl border border-border bg-muted/20">
                          <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Precisão Geral</p>
                          <p className="text-2xl font-bold text-emerald-400 mt-1">81%</p>
                        </div>
                        <div className="p-4 rounded-xl border border-border bg-muted/20">
                          <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Simulados WhatsApp</p>
                          <p className="text-2xl font-bold text-primary mt-1">14 resolvidos</p>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border border-border bg-muted/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Brain className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">Radar Pedagógico Ativo</p>
                            <p className="text-[11px] text-muted-foreground">Reforço prioritário indicado em Direito Tributário (Imunidades).</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating WhatsApp Card (Simulated Chat) */}
              <div className="hidden lg:block absolute -right-6 -bottom-14 w-[360px] rounded-2xl border border-emerald-500/30 bg-zinc-950 p-4 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-3 pb-3 border-b border-border/40">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-zinc-950" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      Tutor AprovaMind
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono">IA</span>
                    </p>
                    <p className="text-[10px] text-emerald-400">Online agora no WhatsApp</p>
                  </div>
                </div>

                <div className="py-3 space-y-2.5 text-[11px]">
                  <div className="bg-zinc-900 border border-border/40 text-muted-foreground rounded-2xl rounded-tl-sm p-3 leading-relaxed">
                    ☀️ *Pílula do Dia:* O STF fixou a tese do Tema 1.046 confirmando a prevalência do negociado sobre o legislado, resguardados direitos absolutamente indisponíveis.
                  </div>
                  <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 rounded-2xl rounded-tr-sm p-3 ml-auto max-w-[85%] leading-relaxed">
                    🎯 *Simulado de Almoço:* Respondi a letra <strong>B</strong>!
                  </div>
                  <div className="bg-zinc-900 border border-border/40 text-foreground rounded-2xl rounded-tl-sm p-3 leading-relaxed">
                    🎉 *Parabéns! Resposta Correta (B).* 🚀<br />
                    Pontuou +1 acerto em Direito do Trabalho no seu Dashboard Web.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Section: TUTOR NO WHATSAPP (Main Highlight) ── */}
        <section id="tutor-whatsapp" className="border-b border-border py-28 bg-muted/5 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-20">
              <span className="text-xs font-semibold tracking-widest uppercase text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 rounded-full mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Seu Tutor Pessoal 24/7
              </span>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
                O estudo que acompanha sua rotina real no WhatsApp.
              </h2>
              <p className="text-lg text-muted-foreground font-light leading-relaxed">
                Você não estuda apenas quando está sentado na frente do computador. O AprovaMind coloca um tutor especializado em bancas e jurisprudência no seu bolso, sem precisar baixar nenhum aplicativo novo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature 1 */}
              <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-all group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Target className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Simulado de Almoço</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Todo dia às 12h, receba uma questão inédita com alternativas A, B, C, D, E. Responda em segundos e receba na hora a fundamentação legal e o gabarito comentado.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/50 text-[11px] font-semibold text-emerald-400">
                  Diário (Seg a Sex no Pro)
                </div>
              </div>

              {/* Feature 2 */}
              <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-all group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Brain className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Tira-Dúvidas Jurídicas</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Ficou em dúvida entre duas alternativas ou não entendeu um artigo? Pergunte por áudio ou texto e receba explicações didáticas com citações de julgados do STF e STJ.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/50 text-[11px] font-semibold text-emerald-400">
                  Disponível 24 horas por dia
                </div>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-all group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Pílulas Matinais</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Comece o dia com 1 insight cirúrgico da sua carreira: prazos processuais críticos, súmulas vinculantes recentes e teses repetitivas que mais caem em prova.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/50 text-[11px] font-semibold text-emerald-400">
                  Todas as manhãs às 07h
                </div>
              </div>

              {/* Feature 4 */}
              <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-all group">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">Sincronização Total</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Você não digita códigos. Um clique no link mágico conecta seu WhatsApp ao seu perfil Web. Cada acerto e erro no WhatsApp ajusta o Radar de Matérias no seu computador.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/50 text-[11px] font-semibold text-emerald-400">
                  Zero retrabalho manual
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section: COCKPIT WEB (Tracking & Planner) ── */}
        <section id="cockpit" className="border-b border-border py-28 bg-background">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-20">
              <span className="text-xs font-semibold tracking-widest uppercase text-primary border border-primary/20 bg-primary/10 px-4 py-1.5 rounded-full mb-4">
                Cockpit de Alta Performance
              </span>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
                Foco cirúrgico na sua sessão de estudo.
              </h2>
              <p className="text-lg text-muted-foreground font-light leading-relaxed">
                Abandone planilhas lentas de Excel e cronômetros que você esquece de pausar. O AprovaMind foi construído para concurseiros que valorizam cada minuto líquido.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="rounded-2xl border border-border bg-card p-8 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Cronômetro de Horas Líquidas</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-light">
                    Detecção inteligente com Page Visibility API. Se você trocar de aba ou perder o foco, a contagem pausa automaticamente para não inflar métricas falsas.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-8 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                    <LayoutDashboard className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Radar de Matérias & Heatmap</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-light">
                    Visualize em segundos onde está o seu maior risco de reprovação. O mapa de consistência estilo GitHub mantém sua disciplina em alta todos os dias.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-8 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Multi-Edital Estratégico</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-light">
                    Estudando para mais de um concurso (ex: TJ e PGE)? O AprovaMind aloca suas horas ponderando a sobreposição de matérias para você não enlouquecer.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section: PARSE DE EDITAL PDF ── */}
        <section id="parse-edital" className="border-b border-border py-28 bg-muted/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="text-xs font-semibold tracking-widest uppercase text-primary border border-primary/20 bg-primary/10 px-4 py-1.5 rounded-full mb-4 inline-block">
                Inteligência de Edital
              </span>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
                Suba o PDF do edital.<br />
                O plano se monta sozinho em 30 segundos.
              </h2>
              <p className="text-muted-foreground font-light text-lg leading-relaxed">
                Nossa IA lê o anexo de conteúdo programático, extrai matérias, estima relevância e sugere a meta semanal com base no tempo até o dia da prova.
              </p>
            </div>

            <div className="max-w-2xl mx-auto border border-border bg-card rounded-2xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-border bg-muted/20 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-primary mb-1">Exemplo de Extração Automática</p>
                  <h3 className="text-lg font-bold text-foreground">Magistratura Estadual — Tribunal de Justiça</h3>
                  <p className="text-xs text-muted-foreground mt-1">14 matérias mapeadas · 120 tópicos organizados</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Meta Recomendada</p>
                  <p className="text-2xl font-bold text-primary">24h/sem</p>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {[
                  { subject: 'Direito Constitucional', weight: 18 },
                  { subject: 'Direito Civil', weight: 16 },
                  { subject: 'Direito Processual Civil', weight: 14 },
                  { subject: 'Direito Penal', weight: 12 },
                  { subject: 'Direito Administrativo', weight: 10 },
                ].map((s) => (
                  <div key={s.subject}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-foreground">{s.subject}</span>
                      <span className="text-primary font-semibold">{s.weight}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${s.weight}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Section: PRICING (Planos Transparentes) ── */}
        <section id="precos" className="border-b border-border py-28 bg-background">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="text-xs font-semibold tracking-widest uppercase text-primary border border-primary/20 bg-primary/10 px-4 py-1.5 rounded-full mb-4 inline-block">
                Investimento
              </span>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">
                Planos simples para a sua aprovação.
              </h2>
              <p className="text-muted-foreground font-light text-lg">
                Comece gratuitamente. Faça upgrade quando quiser turbinar sua rotina com o Pro.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Plano Free */}
              <div className="rounded-2xl border border-border bg-card p-8 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-foreground">Plano Free</h3>
                    <span className="text-xs font-semibold uppercase px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                      Degustação
                    </span>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold text-foreground">R$ 0</span>
                    <span className="text-xs text-muted-foreground ml-2 font-medium">para sempre</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-6">
                    Ideal para testar o cronômetro, sentir o ritmo e criar o hábito de estudo diário.
                  </p>
                  <ul className="space-y-3 text-xs text-muted-foreground mb-8">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span><strong>Cronômetro de horas líquidas</strong> ilimitado</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span><strong>1 edital ativo</strong> no Cockpit Web</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span><strong>5 dúvidas jurídicas/mês</strong> com o Tutor WhatsApp</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span><strong>1 simulado/semana</strong> no WhatsApp</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>1 importação de edital em PDF</span>
                    </li>
                  </ul>
                </div>
                <Link
                  href="/login"
                  className="w-full py-3.5 rounded-full text-center text-xs font-semibold uppercase tracking-wider bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                >
                  Começar Grátis
                </Link>
              </div>

              {/* Plano Pro */}
              <div className="rounded-2xl border-2 border-primary bg-card p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-bl-xl">
                  Mais Popular
                </div>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-foreground">Plano Pro</h3>
                    <span className="text-xs font-semibold uppercase px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                      Completo
                    </span>
                  </div>
                  <div className="mb-6 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-foreground">R$ 29,90</span>
                    <span className="text-xs text-muted-foreground font-medium">/mês no plano anual</span>
                    <span className="text-[11px] text-muted-foreground">(ou R$ 34,90 no mensal)</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-6">
                    Acesso total e irrestrito ao Cockpit Web e ao Tutor diário no WhatsApp.
                  </p>
                  <ul className="space-y-3 text-xs text-muted-foreground mb-8">
                    <li className="flex items-center gap-2 font-medium text-foreground">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span><strong>200 dúvidas jurídicas/mês</strong> com IA e STF/STJ no WhatsApp</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium text-foreground">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span><strong>Simulados de almoço diários</strong> (Seg a Sex) no WhatsApp</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium text-foreground">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span><strong>Pílulas matinais diárias</strong> às 07h no WhatsApp</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span><strong>Multi-Edital ilimitado</strong> (até 5 concursos concorrentes)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Uploads ilimitados de editais em PDF</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Histórico vitalício e Radar Completo de Matérias</span>
                    </li>
                  </ul>
                </div>
                <Link
                  href="/login"
                  className="w-full py-3.5 rounded-full text-center text-xs font-semibold uppercase tracking-wider bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25 transition-opacity"
                >
                  Assinar AprovaMind Pro
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="py-24 bg-muted/5 border-b border-border text-center">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
              Sua aprovação começa com constância.
            </h2>
            <p className="text-lg text-muted-foreground font-light mb-10 leading-relaxed">
              Junte-se aos concurseiros que pararam de estudar às cegas e agora contam com acompanhamento diário no WhatsApp e na Web.
            </p>
            <Link
              href="/login"
              className="inline-flex px-10 py-5 rounded-full text-white text-xs font-semibold uppercase tracking-widest transition-all duration-300 shadow-xl bg-primary hover:opacity-90 shadow-primary/20 items-center justify-center gap-3"
            >
              Criar Conta Grátis Agora
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="py-12 bg-background border-t border-border">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-semibold tracking-tight text-foreground text-sm">AprovaMind</span>
            <span className="text-xs text-muted-foreground ml-2">· Ecossistema de Performance</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacidade
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Entrar
            </Link>
            <a href="https://wa.me/557193430828" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1 text-emerald-400">
              <MessageSquare className="w-3.5 h-3.5" /> Falar com o Tutor
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
