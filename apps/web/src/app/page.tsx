import Link from 'next/link';
import { Target, Brain, TrendingUp, ChevronRight, CheckCircle2, Zap, LayoutDashboard, Timer, CalendarDays, BarChart2, Flame, AlertTriangle } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 selection:bg-primary/30 font-sans">
      {/* Navigation */}
      <nav className="z-50 sticky global-nav w-full border-b border-border top-0 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-12">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-2 h-2 rounded-full animate-pulse bg-primary"></span>
                    <span className="font-medium tracking-tight text-foreground text-lg transition-colors">Aprova<span className="text-muted-foreground">Mind</span></span>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <Link href="/login" className="text-xs font-medium tracking-widest text-muted-foreground uppercase hover:text-foreground transition-colors">
                    Entrar
                </Link>
                <Link href="/login" className="px-6 py-3 text-primary-foreground text-xs font-semibold uppercase tracking-widest transition-all duration-300 shadow-lg bg-primary hover:opacity-90 shadow-primary/20 hover:shadow-primary/40 rounded-sm">
                    Começar
                </Link>
            </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Identity */}
        <header className="overflow-hidden border-border border-b pt-20 pb-32 relative transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 relative">
                <div className="max-w-4xl pt-12">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-xs font-medium tracking-widest uppercase text-primary border border-primary/20 bg-primary/10 px-3 py-1 rounded">
                            Inteligência Estratégica
                        </span>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-medium tracking-tighter leading-[0.9] text-foreground mb-8 text-glow transition-colors">
                        Planeje no<br/>
                        <span className="text-primary">macro</span><br/>
                        e execute melhor hoje
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed mb-10 font-light transition-colors">
                        Planeje no Planner, ajuste a semana no Dashboard e execute o dia com contexto real no Engine. O AprovaMind conecta a jornada inteira em uma ordem só.
                    </p>
                    <div className="flex flex-col sm:flex-row items-start gap-6">
                        <Link href="/login" className="px-8 py-5 text-primary-foreground text-xs font-semibold uppercase tracking-widest transition-all duration-300 shadow-lg bg-primary hover:opacity-90 shadow-primary/20 hover:shadow-primary/40 flex items-center gap-2">
                            Começar pelo Planner
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                        <Link href="#features" className="px-8 py-5 uppercase hover:bg-foreground hover:text-background transition-all duration-300 text-xs font-semibold text-muted-foreground tracking-widest border-border border flex items-center gap-2">
                            Conhecer o Motor
                        </Link>
                    </div>
                </div>
                
                {/* Minimal Interface Mockup embedded in Hero */}
                <div className="mt-24 max-w-5xl rounded-lg border border-border bg-card shadow-2xl overflow-hidden shadow-primary/5 transition-all">
                    <div className="grid grid-cols-1 md:grid-cols-4 min-h-[400px]">
                        <div className="border-r border-border p-6 flex flex-col gap-6 bg-muted/20">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">Navegação</div>
                            <div className="flex items-center gap-3 text-sm text-foreground group cursor-pointer group-hover:text-primary transition-colors">
                                <CalendarDays className="w-4 h-4 text-primary" /> <span className="font-medium">Planner</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                                <LayoutDashboard className="w-4 h-4" /> <span>Dashboard</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                                <Timer className="w-4 h-4" /> <span>Engine</span>
                            </div>
                        </div>
                        <div className="md:col-span-3 p-8 md:p-12 relative flex flex-col">
                            <h2 className="text-4xl md:text-5xl font-medium text-foreground tracking-tight leading-none mb-10 transition-colors">
                                Análise de Precisão
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                <div className="group relative overflow-hidden bg-card border border-border hover:border-primary/50 transition-all p-6">
                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-4 block">Média Atual</span>
                                    <h3 className="text-3xl font-medium text-foreground tracking-tight transition-colors">82%</h3>
                                </div>
                                <div className="group relative overflow-hidden bg-card border border-border hover:border-primary/50 transition-all p-6">
                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-4 block">Retenção</span>
                                    <h3 className="text-3xl font-medium text-foreground tracking-tight transition-colors">75%</h3>
                                </div>
                                <div className="group relative overflow-hidden bg-card border border-border hover:border-primary/50 transition-all p-6 hidden md:block">
                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-4 block">Ritmo</span>
                                    <h3 className="text-3xl font-medium text-foreground tracking-tight transition-colors">6d</h3>
                                </div>
                            </div>
                            
                            <div className="mt-8 flex gap-3 border border-border p-4 bg-muted/10 items-start">
                                <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-semibold tracking-wide text-foreground">Ajuste de Rota</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">Sua retenção em Contratos Administrativos caiu 12%. Sugiro sessão focada hoje.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </header>

        {/* Feature Sections Based on DS Typography & Cards */}
        <section id="features" className="border-b border-border py-32 bg-background transition-colors">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex justify-center items-center gap-4 text-xs font-medium tracking-widest uppercase mb-16 text-primary">
                    <span className="w-8 h-[1px] bg-primary"></span>
                    O Fim da Força Bruta
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="group overflow-hidden bg-card border border-border hover:border-border/80 transition-all h-full p-10 flex flex-col justify-between">
                        <div>
                            <div className="flex group-hover:border-primary/50 group-hover:text-primary transition-colors text-foreground bg-muted w-14 h-14 border border-border rounded-full mb-8 items-center justify-center">
                                <Target className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-medium text-foreground tracking-tight mb-4 transition-colors">Tracking Milimétrico</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed font-light transition-colors">
                                Adeus planilhas de excel. Cada segundo da sua sessão abastece o motor analítico e reconstrói seu panorama de estudo nativamente.
                            </p>
                        </div>
                    </div>
                    
                    <div className="group overflow-hidden bg-card border border-border hover:border-primary/50 transition-all h-full p-10 flex flex-col justify-between relative">
                        <div className="absolute inset-0 bg-primary/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10">
                            <div className="flex group-hover:border-primary/50 text-foreground group-hover:text-primary transition-colors bg-muted w-14 h-14 border border-border rounded-full mb-8 items-center justify-center shadow-lg group-hover:shadow-primary/20">
                                <Brain className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-medium text-foreground tracking-tight mb-4 transition-colors text-glow">Ajuste Fino por IA</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed font-light transition-colors">
                                Se a sua retenção caiu, a IA percebe antes de você e injeta na sua agenda a sessão exata para reverter o quadro do conhecimento.
                            </p>
                        </div>
                    </div>

                    <div className="group overflow-hidden bg-card border border-border hover:border-border/80 transition-all h-full p-10 flex flex-col justify-between">
                        <div>
                            <div className="flex group-hover:border-primary/50 group-hover:text-primary transition-colors text-foreground bg-muted w-14 h-14 border border-border rounded-full mb-8 items-center justify-center">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-medium text-foreground tracking-tight mb-4 transition-colors">Multi-Edital Nativo</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed font-light transition-colors">
                                Gerencie o peso estratégico de cada matéria entre múltiplos editais simultaneamente sem enlouquecer e maximizando aprovações.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* CTA Bottom Section */}
        <section className="py-32 bg-background border-b border-border">
            <div className="max-w-3xl mx-auto px-6 text-center">
                <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-foreground mb-6 transition-colors">
                    Preparado para jogar de forma Estratégica?
                </h2>
                <p className="text-lg text-muted-foreground font-light mb-12">
                    Abandone a ilusão de cobrir 100% de materiais gigantes. Mude para um planejamento cirúrgico e adaptativo guiado por resultados reais.
                </p>
                <Link href="/login" className="inline-flex px-10 py-5 text-primary-foreground text-xs font-semibold uppercase tracking-widest transition-all duration-300 shadow-lg bg-primary hover:opacity-90 shadow-primary/20 hover:shadow-primary/40 items-center justify-center gap-3">
                    Estudar com AprovaMind
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 bg-background z-20 relative">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-border pt-8">
            <div className="flex items-center gap-2 opacity-50">
                <Zap className="w-4 h-4 text-foreground" />
                <span className="font-medium tracking-tight text-foreground text-sm">AprovaMind</span>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
                © {new Date().getFullYear()} Sistema de Performance
            </p>
        </div>
      </footer>
    </div>
  );
}
