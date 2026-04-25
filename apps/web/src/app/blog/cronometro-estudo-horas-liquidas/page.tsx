import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Clock, FileText, Target } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cronômetro de Estudo e Horas Líquidas: Por que Medir o Foco Real | AprovaMind',
  description:
    'Entenda a diferença entre horas brutas e horas líquidas de estudo, como usar um cronômetro inteligente para concursos públicos e por que esse dado transforma sua preparação.',
  keywords: [
    'cronômetro de estudo para concurso',
    'horas líquidas de estudo',
    'horas brutas vs horas líquidas',
    'como medir horas de estudo',
    'controle de tempo estudo concurso',
    'pomodoro para concurso público',
  ],
  openGraph: {
    title: 'Cronômetro de Estudo e Horas Líquidas: Por que Medir o Foco Real',
    description:
      'A diferença entre quem passa e quem não passa muitas vezes está em saber quanto tempo de foco real dedicou — não quantas horas ficou sentado.',
    type: 'article',
    locale: 'pt_BR',
  },
  alternates: {
    canonical: 'https://aprovamind.com.br/blog/cronometro-estudo-horas-liquidas',
  },
};

export default function BlogCronometro() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-10">
        <Link href="/" className="hover:text-foreground transition-colors">Início</Link>
        <ChevronRight className="w-3 h-3" />
        <span>Blog</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground">Horas Líquidas</span>
      </nav>

      <header className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium uppercase tracking-widest text-primary border border-primary/20 bg-primary/10 px-3 py-1 rounded">
            Produtividade
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-foreground leading-tight mb-6">
          Cronômetro de Estudo e Horas Líquidas: Por que Medir o Foco Real Muda Tudo
        </h1>
        <p className="text-lg text-muted-foreground font-light leading-relaxed">
          Você já ficou 3 horas "estudando" e no final percebeu que não absorveu quase nada? O problema não é a sua capacidade — é que você estava medindo a coisa errada.
        </p>
      </header>

      <article className="prose prose-invert max-w-none space-y-10 text-muted-foreground leading-relaxed">

        <section>
          <h2 className="text-2xl font-medium text-foreground tracking-tight mb-4">
            Horas brutas vs. horas líquidas
          </h2>
          <p>
            <strong className="text-foreground">Horas brutas</strong> são o tempo total que você passa na mesa de estudos — desde quando você abriu o livro até quando fechou. Esse número inclui pausas não planejadas, distrações com o celular, intervalos prolongados e momentos em que você simplesmente estava olhando para o livro sem processar nada.
          </p>
          <p className="mt-4">
            <strong className="text-foreground">Horas líquidas</strong> são o tempo em que você estava de fato engajado: lendo com atenção, resolvendo questões, fazendo resumos ativos, sem interrupções. É esse número que tem correlação real com aprendizado e retenção.
          </p>
          <div className="my-6 border border-border bg-card p-6 rounded-sm">
            <p className="text-xs font-medium uppercase tracking-widest text-primary mb-4">Exemplo real</p>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="text-muted-foreground/60 mt-0.5">08:00</span>
                <span>Abre o material. Responde 2 mensagens no WhatsApp antes de começar.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-muted-foreground/60 mt-0.5">08:15</span>
                <span>Começa a estudar de fato.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-muted-foreground/60 mt-0.5">09:10</span>
                <span>Pausa de 20 minutos ("só vou checar uma coisa no celular").</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-muted-foreground/60 mt-0.5">09:30</span>
                <span>Retorna. Estuda por mais 40 minutos.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-muted-foreground/60 mt-0.5">11:00</span>
                <span>Fecha o material.</span>
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-muted-foreground">Horas brutas:</span>
                <span className="text-foreground font-medium">3h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Horas líquidas:</span>
                <span className="text-primary font-medium">~1h 40min</span>
              </div>
            </div>
          </div>
          <p>
            Esse candidato acredita que estudou 3 horas. Na prática, estudou menos de 2. Multiplicado por semanas de preparação, esse desvio pode representar dezenas de horas de estudo "perdidas" que não existiram de fato.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-foreground tracking-tight mb-4">
            Por que a maioria dos candidatos subestima esse problema
          </h2>
          <p>
            O cérebro humano é péssimo para estimar o próprio nível de atenção retrospectivamente. Quando você olha para trás e pensa "estudei das 8 às 11", você lembra da sensação de estar estudando — não das 20 interrupções no meio do caminho.
          </p>
          <p className="mt-4">
            Isso cria um viés sistemático: candidatos consistentemente superestimam quantas horas líquidas estão dedicando. A consequência é planejamento errado: você acha que está progredindo mais do que está, o que só aparece quando chega a hora da prova.
          </p>
          <p className="mt-4">
            A solução é usar um cronômetro que só conta o tempo quando você está de fato ativo — e pausa automaticamente quando você tira o aplicativo do foco ou bloqueia a tela do dispositivo. Tecnicamente, isso é possível usando a <strong className="text-foreground">Page Visibility API</strong> do navegador, que detecta quando a aba fica em segundo plano.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-foreground tracking-tight mb-4">
            Como o método Pomodoro se encaixa nas horas líquidas
          </h2>
          <p>
            O método Pomodoro — blocos de 25 minutos de foco seguidos de 5 minutos de pausa — é uma das formas mais testadas de maximizar horas líquidas. Mas ele só funciona se você respeitar os blocos de foco completamente: sem celular, sem notificações, sem "só um minutinho".
          </p>
          <p className="mt-4">
            A variação mais eficiente para candidatos experientes é o bloco 50/10: 50 minutos de foco intenso seguidos de 10 minutos de pausa real. Esse ritmo reduz o custo de mudança de contexto — o tempo que o cérebro leva para entrar no modo de foco após uma interrupção.
          </p>
          <div className="my-6 border border-border bg-muted/10 p-6 rounded-sm">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">Configurações recomendadas por perfil</p>
            <div className="space-y-4 text-sm">
              {[
                { profile: 'Iniciando a preparação', mode: '25/5 (clássico)', reason: 'Mais fácil de manter o foco por períodos curtos' },
                { profile: 'Preparação intermediária', mode: '45/15', reason: 'Equilíbrio entre profundidade e recuperação' },
                { profile: 'Preparação avançada', mode: '50/10', reason: 'Maximiza horas líquidas com pausas menores' },
              ].map((item) => (
                <div key={item.profile} className="border border-border/50 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-foreground font-medium">{item.profile}</span>
                    <span className="text-primary text-xs font-medium">{item.mode}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.reason}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-foreground tracking-tight mb-4">
            O que fazer com os dados de horas líquidas
          </h2>
          <p>
            Rastrear horas líquidas só tem valor se você usar esses dados para tomar decisões melhores. As análises mais úteis são:
          </p>
          <ul className="mt-4 space-y-4 list-none pl-0">
            {[
              {
                title: 'Análise por matéria',
                text: 'Qual disciplina está recebendo mais horas do que deveria? Qual está sendo negligenciada? Compare o planejado com o real semanalmente.',
              },
              {
                title: 'Análise por dia da semana',
                text: 'Em quais dias você estuda mais? Menos? Esses padrões revelam quando você deve programar as matérias mais difíceis.',
              },
              {
                title: 'Análise de streak',
                text: 'Consistência bate intensidade em preparação de longo prazo. Quantos dias seguidos você consegue manter pelo menos uma hora líquida de estudo?',
              },
              {
                title: 'Análise de tendência',
                text: 'Sua média semanal de horas líquidas está crescendo, estagnando ou caindo? Essa tendência prediz sua preparação melhor do que qualquer outra métrica.',
              },
            ].map((item) => (
              <li key={item.title} className="border border-border bg-card p-5">
                <p className="text-sm font-medium text-foreground mb-1">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-foreground tracking-tight mb-4">
            Quanto tempo líquido você precisa para passar?
          </h2>
          <p>
            Não existe uma resposta única — depende do concurso, da concorrência e do seu ponto de partida. Mas pesquisas sobre aprendizado deliberado mostram que:
          </p>
          <ul className="mt-4 space-y-2 list-none pl-0">
            {[
              'Para concursos de alto nível (magistratura, MP, PGE), candidatos aprovados relatam médias de 2.000 a 4.000 horas líquidas de preparação total',
              'Para concursos municipais e estaduais de nível médio a superior, a faixa é de 800 a 1.500 horas líquidas',
              'A distribuição dessas horas importa tanto quanto o total: 15h/semana consistentes por 2 anos supera 40h/semana por 3 meses seguidos de burnout',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <div className="mt-12 border border-primary/30 bg-primary/5 p-8 rounded-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Rastreie suas horas líquidas com o AprovaMind
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                O cronômetro do AprovaMind usa a Page Visibility API para pausar automaticamente quando você sai da aba — garantindo que você veja apenas o tempo de foco real, não o tempo total.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Começar a rastrear grátis
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
            href="/blog/como-estudar-para-magistratura"
            className="border border-border bg-card p-6 hover:border-primary/40 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Concursos</span>
            </div>
            <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              Como estudar para a Magistratura: método e distribuição de matérias
            </h3>
          </Link>
        </div>
      </section>
    </main>
  );
}
