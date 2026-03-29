import { Shield, Target, Brain, TrendingUp, BarChart2 } from 'lucide-react';

export default function DSTestPage() {
    return (
        <div className="ds-page">
            <main>
                <section className="ds-shell ds-section ds-section--hero">
                    <div className="ds-hero">
                        <div className="ds-stack">
                            <p className="ds-kicker">Sitetrip Test Area</p>
                            <div className="ds-hero__slogan">
                                <h1 className="ds-display-1">Página de</h1>
                                <h1 className="ds-display-1">Validação do</h1>
                                <h1 className="ds-display-1 text-st-brand">Design System</h1>
                            </div>
                        </div>
                        <div className="ds-stack">
                            <p className="ds-body-lg">
                                Esta página serve apenas para atestarmos visualmente que tanto os utilitários BEM (`.ds-surface`)
                                quanto os utilitários do Tailwind mapeados (`text-st-brand`) estão funcionando.
                            </p>
                            <div className="ds-cluster">
                                <button className="ds-button ds-button--primary">Botão DS Primário</button>
                                <div className="cursor-pointer ds-button ds-button--soft">Botão DS Soft</div>
                                <div className="bg-st-lime text-foreground px-4 py-2 font-bold rounded-full">Botão Tailwind (st-lime)</div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="foundations" className="ds-shell ds-section">
                    <div className="ds-stack">
                        <p className="ds-kicker text-st-cyan">Tailwind Mapping Test</p>
                        <h2 className="ds-display-2">Tailwind Colors mapped from CSS Variables</h2>
                    </div>
                    <div className="ds-space"></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-st-canvas p-6 rounded-2xl border border-border text-foreground font-mono text-sm">bg-st-canvas</div>
                        <div className="bg-background p-6 rounded-2xl text-foreground font-mono text-sm">bg-background</div>
                        <div className="bg-st-brand p-6 rounded-2xl text-foreground font-bold font-mono text-sm">bg-st-brand</div>
                        <div className="bg-st-brand-strong p-6 rounded-2xl text-foreground font-bold font-mono text-sm">bg-st-brand-strong</div>
                        <div className="bg-st-lime p-6 rounded-2xl text-foreground font-bold font-mono text-sm">bg-st-lime</div>
                        <div className="bg-st-yellow p-6 rounded-2xl text-foreground font-bold font-mono text-sm">bg-st-yellow</div>
                        <div className="bg-st-cyan p-6 rounded-2xl text-foreground font-bold font-mono text-sm">bg-st-cyan</div>
                    </div>
                </section>

                <section className="ds-shell ds-section ds-section--compact">
                    <div className="ds-grid ds-grid--2">
                        <article className="ds-surface ds-surface--soft ds-stack">
                            <p className="ds-kicker">Card Padrão DS</p>
                            <h2 className="ds-title-1">Este lado usa classes puras BEM</h2>
                            <p className="ds-body">Usando .ds-surface, .ds-stack e .ds-surface--soft</p>
                        </article>
                        <article className="bg-muted text-foreground p-8 rounded-[32px] flex flex-col gap-6 relative">
                            <p className="text-sm font-medium uppercase tracking-widest opacity-80">Card Híbrido Tailwind</p>
                            <h2 className="text-[clamp(1.5rem,1.2rem+1.2vw,2.5rem)] font-bold leading-tight">Este lado usa utilitários Tailwind (st-*) </h2>
                            <p className="text-base text-foreground/80">O layout e padding são replicados nativamente via grid tailwind.</p>
                        </article>
                    </div>
                </section>

                <section className="ds-shell ds-section">
                    <div className="ds-stack">
                        <p className="ds-kicker text-st-brand-strong">Design System Pattern</p>
                        <h2 className="ds-display-2">Replicando um Alert em DS vs Tailwind</h2>
                    </div>

                    <div className="ds-usp-grid mt-16">
                        <article className="ds-usp-card">
                            <span className="ds-usp-card__index">(01)</span>
                            <h3 className="ds-title-2">Estilos do DS</h3>
                            <p className="ds-body">Usando .ds-usp-card nativo.</p>
                        </article>
                        <article className="border-2 border-st-lime bg-background text-foreground p-8 rounded-[32px]">
                            <span className="block mb-5 text-[0.875rem] tracking-[0.06em] uppercase">(02)</span>
                            <h3 className="text-[clamp(1.25rem,1rem+1vw,2rem)] font-bold leading-tight mb-4">Estilos pelo Tailwind</h3>
                            <p className="text-base">Usando border-st-lime, text-foreground</p>
                        </article>
                    </div>
                </section>
            </main>
        </div>
    );
}
