'use client';

import { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  Mic,
  Brain,
  FileText,
  AlertTriangle,
  Scale,
  CheckCircle2,
  XCircle,
  Smartphone,
  Laptop,
  ArrowRight,
  GitBranch,
} from 'lucide-react';
import Link from 'next/link';

export function OmnichannelFeatureShowcase() {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'fechamento'>('whatsapp');
  const [selectedFlashcardAnswer, setSelectedFlashcardAnswer] = useState<boolean | null>(null);

  return (
    <section className="py-24 border-b border-border bg-gradient-to-b from-background via-muted/10 to-background relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Exclusivo AprovaMind
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">
            O único ecossistema omnicanal com IA e Base Oficial de Concursos.
          </h2>
          <p className="text-lg text-muted-foreground font-light leading-relaxed">
            Seu estudo não para quando você levanta da mesa. Do áudio no WhatsApp ao cockpit no computador, todas as suas dúvidas viram um caderno de revisão inteligente.
          </p>

          {/* Toggle Buttons */}
          <div className="mt-8 inline-flex p-1.5 rounded-full border border-border bg-muted/40 gap-2">
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'whatsapp'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Mentor WhatsApp + Web</span>
            </button>
            <button
              onClick={() => setActiveTab('fechamento')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === 'fechamento'
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Dossiê Fechamento do Dia</span>
            </button>
          </div>
        </div>

        {/* Tab 1: WhatsApp Omnichannel */}
        {activeTab === 'whatsapp' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
            {/* Left: Features highlight */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border border-border bg-card hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Áudio com Whisper & Correção Fonética</h3>
                    <p className="text-xs text-muted-foreground">Transcrição instantânea calibrada para Concursos</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Envie áudios na rua ou no trânsito de até 60 segundos. Nossa IA reconhece termos técnicos de todas as matérias (de 'oração subordinada' e 'tautologia' a 'dolo eventual' e 'restos a pagar') e responde na hora.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">RAG em Legislação + Professor de Bancas</h3>
                    <p className="text-xs text-muted-foreground">Base oficial indexada com resolução passo a passo</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Combina busca vetorial em milhares de artigos da CF/88, códigos e súmulas do STF/STJ com resolução passo a passo de Português, Raciocínio Lógico, Informática e Contabilidade.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Sincronização Bidirecional</h3>
                    <p className="text-xs text-muted-foreground">Tudo o que você conversa no WhatsApp aparece no Web</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Basta entrar com sua conta Google e vincular seu número com o comando <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded font-mono text-emerald-400">/painel</code>. Suas conversas no WhatsApp e no Cockpit Web ficam 100% integradas.
                </p>
              </div>
            </div>

            {/* Right: Visual WhatsApp Mockup */}
            <div className="rounded-2xl border border-emerald-500/30 bg-zinc-950 p-5 shadow-2xl backdrop-blur-xl relative">
              <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-100">AprovaMind Mentor</span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded font-mono font-semibold">OFICIAL</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Disponível 24/7
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">+55 71 98135-6297</span>
              </div>

              <div className="py-4 space-y-3 text-[11px]">
                {/* Audio message from student */}
                <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 rounded-2xl rounded-tr-sm p-3 ml-auto max-w-[85%] flex items-center gap-3">
                  <Mic className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-semibold text-emerald-300">Mensagem de Voz (0:24)</span>
                    <p className="text-[10px] text-emerald-400/80 mt-0.5">"Professor, qual a diferença prática entre dolo eventual e culpa consciente na FGV?"</p>
                  </div>
                </div>

                {/* Response with RAG */}
                <div className="bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-2xl rounded-tl-sm p-3.5 space-y-2 leading-relaxed">
                  <p className="font-semibold text-zinc-100">
                    ⚖️ Dolo Eventual vs. Culpa Consciente (Art. 18 do Código Penal)
                  </p>
                  <p className="text-zinc-400">
                    Na <strong className="text-zinc-200 font-medium">culpa consciente</strong>, o agente prevê o resultado, mas confia sinceramente em suas habilidades para evitá-lo. Já no <strong className="text-zinc-200 font-medium">dolo eventual</strong>, o agente assume o risco de produzi-lo (<strong className="text-white font-semibold">"dane-se se acontecer"</strong>).
                  </p>
                  <div className="p-2 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300">
                    🔍 <strong className="text-emerald-400 font-semibold">Dispositivo RAG:</strong> Art. 18, I, in fine, CP + Súmula 246 do STJ.
                  </div>
                  <p className="text-emerald-400 text-[10px] font-semibold">
                    ✅ Registrado no seu Caderno de Fechamento do Dia!
                  </p>
                </div>
              </div>

              <div className="mt-2 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                <span>Experimente enviar uma mensagem agora:</span>
                <a
                  href="https://wa.me/5571981356297"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-400 font-bold hover:underline"
                >
                  Abrir WhatsApp <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Fechamento Diário */}
        {activeTab === 'fechamento' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
            {/* Left: What is Fechamento */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Dossiê Noturno Consolidado</h3>
                    <p className="text-xs text-muted-foreground">A IA resume o seu dia de estudos e dúvidas</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ao final do dia, o sistema analisa todas as suas sessões de estudo e dúvidas do WhatsApp para gerar um dossiê com os pontos onde você teve hesitação, destacando pegadinhas recorrentes da sua banca.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Alertas de Pegadinhas (FGV / Cebraspe)</h3>
                    <p className="text-xs text-muted-foreground">Mapeamento de armadilhas clássicas</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Identifica onde as bancas costumam trocar prazos, inverter regras e exceções, ou usar redações desatualizadas do Planalto para induzir o candidato ao erro.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Flashcards Ativos com Justificativa</h3>
                    <p className="text-xs text-muted-foreground">Fixação espaçada no padrão Certo ou Errado</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Resolva os flashcards gerados especificamente a partir das suas dúvidas do dia. Cada clique registra seu acerto ou erro para o recálculo pedagógico semanal.
                </p>
              </div>
            </div>

            {/* Right: Interactive Flashcard Card */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl relative space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-bold text-foreground">Flashcard de Fechamento do Dia</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">Direito Penal</span>
              </div>

              <div className="p-4 rounded-xl border border-border bg-muted/20">
                <p className="text-xs text-foreground leading-relaxed font-medium">
                  "Na culpa consciente, o agente não quer o resultado, mas aceita e anui com a sua produção caso ele venha a ocorrer."
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setSelectedFlashcardAnswer(true)}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                    selectedFlashcardAnswer === true
                      ? 'bg-red-500/10 border-red-500 text-red-400'
                      : 'border-border bg-muted/30 text-foreground hover:bg-muted'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>CERTO</span>
                </button>
                <button
                  onClick={() => setSelectedFlashcardAnswer(false)}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                    selectedFlashcardAnswer === false
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'border-border bg-muted/30 text-foreground hover:bg-muted'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>ERRADO</span>
                </button>
              </div>

              {/* Feedback after answer */}
              {selectedFlashcardAnswer !== null && (
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs space-y-1.5 animate-fadeIn">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Gabarito Oficial: ERRADO</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <strong>Fundamentação:</strong> O conceito descrito é de <em>dolo eventual</em> (teoria do assentimento). Na <em>culpa consciente</em>, o agente prevê o resultado, mas confia sinceramente que ele não ocorrerá.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Experimente no seu cockpit:</span>
                <Link
                  href="/login"
                  className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  Criar conta grátis <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
