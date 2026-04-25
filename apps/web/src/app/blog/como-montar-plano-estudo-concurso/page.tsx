import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, FileText, Target, Clock, BarChart2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Como Montar um Plano de Estudo para Concurso Público | AprovaMind',
  description:
    'Guia completo para criar um plano de estudo eficiente para concursos públicos: como distribuir matérias, definir metas semanais e acompanhar seu progresso com dados reais.',
  keywords: [
    'como montar plano de estudo concurso',
    'plano de estudo para concurso público',
    'cronograma de estudos concurso',
    'distribuição de matérias concurso',
    'meta de horas estudo concurso',
  ],
  openGraph: {
    title: 'Como Montar um Plano de Estudo para Concurso Público',
    description:
      'Guia prático com método testado: como analisar o edital, distribuir matérias por peso e monitorar seu progresso com dados reais.',
    type: 'article',
    locale: 'pt_BR',
  },
  alternates: {
    canonical: 'https://aprovamind.com.br/blog/como-montar-plano-estudo-concurso',
  },
};

export default function BlogPlanoEstudo() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-10">
        <Link href="/" className="hover:text-foreground transition-colors">Início</Link>
        <ChevronRight className="w-3 h-3" />
        <span>Blog</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground">Plano de Estudo</span>
      </nav>

      {/* Header */}
      <header className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium uppercase tracking-widest text-primary border border-primary/20 bg-primary/10 px-3 py-1 rounded">
            Estratégia
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-foreground leading-tight mb-6">
          Como Montar um Plano de Estudo para Concurso Público
        </h1>
        <p className="text-lg text-muted-foreground font-light leading-relaxed">
          A maioria dos candidatos falha não por falta de dedicação, mas por falta de método. Um plano de estudo bem estruturado é a diferença entre cobrir o edital de forma cirúrgica e se perder em conteúdo irrelevante.
        </p>
      </header>

      {/* Conteúdo */}
      <article className="prose prose-invert max-w-none space-y-10 text-muted-foreground leading-relaxed">

        <section>
          <h2 className="text-2xl font-medium text-foreground tracking-tight mb-4">
            1. Comece pelo edital, não pelas apostilas
          </h2>
          <p>
            O erro mais comum entre candidatos iniciantes é comprar materiais antes de ler o edital com atenção. O edital é o contrato do concurso: ele define exatamente o que será cobrado, em qual proporção e com qual peso em cada prova.
          </p>
          <p className="mt-4">
            Antes de abrir qualquer apostila, faça isso:
          </p>
          <ul className="mt-4 space-y-2 list-none pl-0">
            {[
              'Baixe o edital completo em PDF',
              'Identifique todas as disciplinas cobradas na prova objetiva',
              'Verifique o número de questões por disciplina (isso define o peso real)',
              'Identifique se há prova discursiva e quais temas cobre',
              'Marque a data da prova e calcule quantas semanas restam',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4">
            Esse mapeamento inicial parece trabalhoso, mas é o que vai guiar todas as suas decisões de estudo nas semanas seguintes. Boa notícia: se o edital está em PDF, você pode <Link href="/#parse-edital" className="text-primary hover:underline">usar nossa ferramenta gratuita de análise de edital</Link> para extrair matérias e pesos automaticamente em segundos.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-foreground tracking-tight mb-4">
            2. Distribua as horas proporcionalmente ao peso de cada matéria
          </h2>
          <p>
            Uma vez que você tem a lista de disciplinas e seus pesos, a distribuição de horas é matemática. Se Direito Constitucional representa 25% das questões da prova objetiva, ele deve receber aproximadamente 25% das suas horas semanais de estudo.
          </p>
          <div className="my-6 border border-border bg-card p-6 rounded-sm">
            <p className="text-xs font-medium uppercase tracking-widest text-primary mb-4">Exemplo prático</p>
            <div className="space-y-3">
              {[
                { subject: 'Direito Constitucional', weight: 25, hours: '5h/semana' },
                { subject: 'Direito Administrativo', weight: 30, hours: '6h/semana' },
                { subject: 'Português', weight: 20, hours: '4h/semana' },
                { subject: 'Raciocínio Lógico', weight: 15, hours: '3h/semana' },
                { subject: 'Informática', weight: 10, hours: '2h/semana' },
              ].map((item) => (
                <div key={item.subject} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{item.subject}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">{item.weight}%</span>
                    <span className="text-primary font-medium w-20 text-right">{item.hours}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">Baseado em 20h semanais de estudo.</p>
          </div>
          <p>
            Esse modelo é mais eficiente do que estudar tudo igualmente. Matérias com mais peso têm maior retorno marginal: cada hora adicional nelas tem mais impacto na nota final.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-foreground tracking-tight mb-4">
            3. Defina uma meta semanal realista em horas líquidas
          </h2>
          <p>
            "Horas líquidas" são as horas em que você está realmente estudando — sem distrações, sem o celular ao lado, com foco total. Esse conceito é central para qualquer plano de estudo eficiente.
          </p>
          <p className="mt-4">
            Uma sessão de 2 horas com o celular na mesa pode gerar apenas 45 minutos de horas líquidas. É por isso que rastrear horas brutas não basta — você precisa medir o tempo de foco real.
          </p>
          <div className="my-6 border border-border bg-muted/10 p-6 rounded-sm space-y-3">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Referências por perfil</p>
            {[
              { profile: 'Estudante em tempo integral', hours: '25–35h líquidas/semana' },
              { profile: 'Trabalhador em período integral', hours: '10–18h líquidas/semana' },
              { profile: 'Trabalhador em meio período', hours: '18–25h líquidas/semana' },
            ].map((item) => (
              <div key={item.profile} className="flex items-start justify-between text-sm gap-4">
                <span className="text-muted-foreground">{item.profile}</span>
                <span className="text-foreground font-medium shrink-0">{item.hours}</span>
              </div>
            ))}
          </div>
          <p>
            Estabeleça uma meta semanal honesta baseada na sua realidade atual — não na versão ideal de você. É melhor cumprir 15h por semana consistentemente do que planejar 30h e abandonar na segunda semana.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-foreground tracking-tight mb-4">
            4. Estruture ciclos de estudo, não dias fixos por matéria
          </h2>
          <p>
            O modelo "segunda-feira é dia de Português, terça é Direito Civil" parece organizado mas é frágil. Se você perder uma segunda-feira, o Português fica descoberto por uma semana inteira.
          </p>
          <p className="mt-4">
            A alternativa mais eficiente é trabalhar com <strong className="text-foreground">ciclos de estudo</strong>: listas de matérias que você percorre na sequência, reiniciando quando termina. Dentro de cada ciclo, você aloca horas proporcionalmente ao peso de cada disciplina.
          </p>
          <p className="mt-4">
            Esse modelo é mais resiliente: se perder um dia, você simplesmente continua de onde parou. Nenhuma matéria fica descoberta por muito tempo.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-foreground tracking-tight mb-4">
            5. Monitore o real vs. o planejado toda semana
          </h2>
          <p>
            Um plano de estudo sem monitoramento é só uma intenção. A revisão semanal é o que transforma planejamento em evolução real.
          </p>
          <p className="mt-4">
            A cada semana, compare o que você planejou estudar com o que efetivamente estudou por matéria. Essa análise revela padrões importantes: matérias que você está evitando, dias da semana onde você estuda menos, e se sua meta semanal é realista ou não.
          </p>
          <p className="mt-4">
            O AprovaMind automatiza essa análise — cada sessão de estudo alimenta o dashboard em tempo real, mostrando o planejado versus o real por disciplina, com gráfico de radar e alertas quando uma matéria está sendo negligenciada.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-foreground tracking-tight mb-4">
            6. Revise o plano a cada 4 semanas
          </h2>
          <p>
            Seu plano inicial é uma hipótese, não uma lei. Após 4 semanas de dados reais, você terá informações suficientes para ajustá-lo: matérias que tomam mais tempo do que o previsto, tópicos onde sua retenção é baixa, e se a meta semanal é sustentável.
          </p>
          <p className="mt-4">
            Candidatos que revisam e ajustam o plano regularmente têm desempenho significativamente melhor do que os que seguem o plano original até o fim sem adaptações — independentemente da qualidade do plano inicial.
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
                Analise seu edital gratuitamente
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Faça upload do PDF do seu edital e nossa IA extrai as matérias, calcula os pesos e sugere a meta semanal ideal — sem criar conta.
              </p>
              <Link
                href="/#parse-edital"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Analisar meu edital agora
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
