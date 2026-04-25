import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, FileText, Clock, BarChart2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Como Estudar para a Magistratura: Método, Matérias e Distribuição | AprovaMind',
  description:
    'Guia estratégico para a carreira da Magistratura: como distribuir as matérias do edital, quantas horas estudar por semana e como usar dados para calibrar sua preparação.',
  keywords: [
    'como estudar para magistratura',
    'concurso magistratura estadual',
    'TJSP magistratura matérias',
    'plano de estudo magistratura',
    'horas de estudo para magistratura',
    'distribuição matérias magistratura',
  ],
  openGraph: {
    title: 'Como Estudar para a Magistratura: Método, Matérias e Distribuição',
    description:
      'Estratégia completa para a carreira mais disputada do direito público: distribuição de matérias, metas de horas e como calibrar sua preparação com dados reais.',
    type: 'article',
    locale: 'pt_BR',
  },
  alternates: {
    canonical: 'https://aprovamind.com.br/blog/como-estudar-para-magistratura',
  },
};

const MATERIAS_MAGISTRATURA = [
  { subject: 'Direito Civil', weight: 20, note: 'Maior volume de conteúdo; parte geral + contratos + família + sucessões' },
  { subject: 'Direito Processual Civil', weight: 18, note: 'CPC 2015 com todas as reformas; agravo interno, tutelas, recursos' },
  { subject: 'Direito Penal', weight: 14, note: 'Parte geral é indispensável; crimes contra a pessoa e patrimônio' },
  { subject: 'Direito Processual Penal', weight: 12, note: 'Nulidades, provas, recursos, prisões; jurisprudência do STJ crítica' },
  { subject: 'Direito Constitucional', weight: 12, note: 'Direitos fundamentais, controle de constitucionalidade, STF' },
  { subject: 'Direito Administrativo', weight: 10, note: 'Atos, licitações, contratos, servidores, improbidade' },
  { subject: 'Direito Empresarial', weight: 6, note: 'Sociedades, falência, recuperação judicial, títulos de crédito' },
  { subject: 'Direito Tributário', weight: 5, note: 'CTN, princípios constitucionais tributários, espécies tributárias' },
  { subject: 'Direito do Trabalho', weight: 3, note: 'Apenas o básico — contratos, férias, rescisão, competência' },
];

export default function BlogMagistratura() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-10">
        <Link href="/" className="hover:text-foreground transition-colors">Início</Link>
        <ChevronRight className="w-3 h-3" />
        <span>Blog</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground">Magistratura</span>
      </nav>

      <header className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium uppercase tracking-widest text-primary border border-primary/20 bg-primary/10 px-3 py-1 rounded">
            Concursos
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-foreground leading-tight mb-6">
          Como Estudar para a Magistratura: Método, Matérias e Distribuição
        </h1>
        <p className="text-lg text-muted-foreground font-light leading-relaxed">
          A Magistratura Estadual é uma das carreiras mais disputadas do direito público brasileiro. A aprovação exige não apenas conhecimento profundo, mas uma estratégia de preparação que respeite o volume do edital e a profundidade cobrada nas provas.
        </p>
      </header>

      <article className="prose prose-invert max-w-none space-y-10 text-muted-foreground leading-relaxed">

        <section>
          <h2 className="text-2xl font-medium text-foreground tracking-tight mb-4">
            O que é cobrado no concurso da Magistratura Estadual
          </h2>
          <p>
            Os concursos da Magistratura Estadual (TJSP, TJRJ, TJMG, entre outros) são organizados pelo respectivo Tribunal de Justiça e seguem estrutura semelhante entre os estados, com algumas variações regionais. Em geral, o processo seletivo tem três fases: prova objetiva, prova escrita (dissertativa e prática) e prova oral.
          </p>
          <p className="mt-4">
            A prova objetiva é a porta de entrada e costuma ter entre 80 e 120 questões distribuídas pelas principais áreas do direito. O conteúdo programático é extenso — editais do TJSP chegam a 40+ páginas — o que torna essencial a análise cuidadosa do edital antes de montar o cronograma.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-foreground tracking-tight mb-4">
            Distribuição de matérias: como alocar seu tempo
          </h2>
          <p>
            A distribuição abaixo é uma referência baseada no histórico de provas objetivas da Magistratura Estadual. Os pesos podem variar de acordo com o edital específico do seu estado — por isso, sempre valide com o edital atual.
          </p>

          <div className="my-6 border border-border bg-card rounded-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-muted/10">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Referência de distribuição — Magistratura Estadual
              </p>
            </div>
            <div className="p-6 space-y-4">
              {MATERIAS_MAGISTRATURA.map((item) => (
                <div key={item.subject}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{item.subject}</span>
                    <span className="text-xs font-medium text-primary">{item.weight}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${item.weight}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground/70">{item.note}</p>
                </div>
              ))}
            </div>
          </div>

          <p>
            Note que Direito Civil e Processual Civil juntos representam ~38% do conteúdo — isso é quase dois quintos do seu tempo de estudo. Para candidatos com formação prática em advocacia, esse bloco pode demandar menos horas de estruturação e mais horas de aprofundamento via questões e jurisprudência.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-foreground tracking-tight mb-4">
            Quantas horas por semana você precisa estudar
          </h2>
          <p>
            A Magistratura Estadual é um concurso de alto nível com volume de conteúdo extenso e concorrência qualificada. Candidatos aprovados em primeira tentativa costumam relatar preparações entre 18 e 30 horas líquidas por semana, com duração de 2 a 4 anos.
          </p>
          <div className="my-6 border border-border bg-muted/10 p-6 rounded-sm space-y-4">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Referência por fase da preparação</p>
            {[
              {
                phase: 'Fase 1 — Base (meses 1–6)',
                hours: '15–20h líquidas/semana',
                focus: 'Construção das estruturas. Leitura de doutrina base, esquemas conceituais, primeiras questões.',
              },
              {
                phase: 'Fase 2 — Aprofundamento (meses 7–18)',
                hours: '20–28h líquidas/semana',
                focus: 'Questões em volume, jurisprudência dos tribunais superiores, revisão cíclica por matéria.',
              },
              {
                phase: 'Fase 3 — Reta final (meses 19–24)',
                hours: '25–35h líquidas/semana',
                focus: 'Simulados completos, peças práticas, revisões intensivas, pontos de menor retenção.',
              },
            ].map((item) => (
              <div key={item.phase} className="border border-border/50 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{item.phase}</span>
                  <span className="text-xs font-medium text-primary shrink-0 ml-2">{item.hours}</span>
                </div>
                <p className="text-xs text-muted-foreground">{item.focus}</p>
              </div>
            ))}
          </div>
          <p>
            Se você trabalha atualmente, planeje com mais tempo e menos horas por semana — mas <strong className="text-foreground">não tente cortar o total de horas líquidas necessárias</strong>. O que muda é o prazo, não a profundidade necessária para aprovação.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-foreground tracking-tight mb-4">
            A armadilha do estudo linear para a Magistratura
          </h2>
          <p>
            Muitos candidatos iniciam pelo começo do material de Direito Civil, passam meses ali, e quando chegam ao final do programa percebem que esqueceram o início. Para um concurso com esse volume, estudo linear é ineficiente.
          </p>
          <p className="mt-4">
            A abordagem mais eficaz é o <strong className="text-foreground">estudo cíclico</strong>: você percorre todas as matérias dentro de ciclos regulares (por exemplo, ciclos de 4 semanas), com profundidade progressiva a cada ciclo. No primeiro ciclo você constrói a estrutura; no segundo, consolida; no terceiro, aprofunda jurisprudência; e assim por diante.
          </p>
          <p className="mt-4">
            Esse modelo evita que matérias fiquem "mortas" por meses sem revisão, o que é especialmente crítico para Penal e Processual Penal — disciplinas que requerem revisão frequente para manutenção da retenção.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-foreground tracking-tight mb-4">
            Jurisprudência: quando e como estudar
          </h2>
          <p>
            Provas objetivas de Magistratura Estadual testam jurisprudência dos tribunais superiores (STF e STJ) de forma pesada. Candidatos que estudam apenas doutrina sem integrar jurisprudência perdem muitas questões que dependem de conhecer o posicionamento atual dos tribunais.
          </p>
          <p className="mt-4">
            A estratégia mais eficiente é integrar jurisprudência ao estudo de cada matéria, não estudá-la separadamente. Quando estuda contratos no Código Civil, já estude os principais leading cases do STJ sobre o tema. Isso cria ancoragem: a jurisprudência fica associada ao ponto de direito que ela interpreta, não solta em uma lista genérica.
          </p>
          <p className="mt-4">
            Uma boa fonte para acompanhamento contínuo são os informativos do STJ e STF filtrados por relevância para o concurso — tanto assinando serviços especializados quanto seguindo as publicações oficiais dos tribunais.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-foreground tracking-tight mb-4">
            Como usar dados para calibrar sua preparação
          </h2>
          <p>
            Um candidato que estuda de forma estratégica não espera a prova para descobrir onde está fraco. Ele monitora continuamente sua taxa de acerto por matéria, compara o planejado com o executado em horas, e ajusta a alocação de tempo com base em dados reais.
          </p>
          <p className="mt-4">
            Perguntas que você deve conseguir responder a qualquer momento da sua preparação:
          </p>
          <ul className="mt-4 space-y-2 list-none pl-0">
            {[
              'Quantas horas líquidas estudei nas últimas 4 semanas, por matéria?',
              'Minha taxa de acerto em Direito Civil está crescendo ou estagnando?',
              'Qual matéria estou dedicando mais horas do que o peso do edital justifica?',
              'Qual matéria está sendo negligenciada há mais de 10 dias?',
              'Minha consistência (dias com estudo) está crescendo ou caindo?',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4">
            Se você não consegue responder essas perguntas com dados concretos, seu planejamento está operando no escuro.
          </p>
        </section>

        {/* CTA */}
        <div className="mt-12 border border-primary/30 bg-primary/5 p-8 rounded-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Importe o edital da Magistratura e gere seu plano
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Faça upload do PDF do edital do TJSP, TJRJ ou qualquer outro estado. Nossa IA extrai todas as matérias, calcula os pesos e sugere a meta semanal — sem criar conta.
              </p>
              <Link
                href="/#parse-edital"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Analisar edital da Magistratura
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </article>

      {/* Posts relacionados */}
      <section className="mt-20 pt-10 border-t border-border">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-6">Leia também</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/blog/como-montar-plano-estudo-concurso"
            className="border border-border bg-card p-6 hover:border-primary/40 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Estratégia</span>
            </div>
            <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              Como montar um plano de estudo eficiente para concurso público
            </h3>
          </Link>
          <Link
            href="/blog/cronometro-estudo-horas-liquidas"
            className="border border-border bg-card p-6 hover:border-primary/40 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Produtividade</span>
            </div>
            <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              Por que você deve medir horas líquidas, não horas brutas
            </h3>
          </Link>
        </div>
      </section>
    </main>
  );
}
