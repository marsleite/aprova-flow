'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'Como funciona a importação de PDF do edital?',
    answer:
      'Basta subir o arquivo PDF oficial do seu concurso (mesmo editais densos de 150+ páginas). Nossa IA analisa o anexo de conteúdo programático, separa as matérias, estima pesos por relevância histórica e monta a meta semanal de horas com base na data prevista para a prova.',
  },
  {
    question: 'Como os dados de retenção e horas líquidas são coletados sem burocracia?',
    answer:
      'Ao final de cada sessão de estudo, em apenas 5 segundos você registra quantas questões resolveu e quantos acertos teve. Além disso, cada simulado respondido no WhatsApp alimenta automaticamente o seu Radar de Retenção. O cronômetro usa a Page Visibility API para pausar sozinho se você mudar de aba.',
  },
  {
    question: 'Como funciona o Tutor no WhatsApp? Preciso instalar algum aplicativo?',
    answer:
      'Nenhum aplicativo novo é necessário. O Tutor funciona diretamente no WhatsApp padrão do seu celular (+55 71 98135-6297). Você pode mandar texto ou áudio (transcrito em memória via Whisper). Ao vincular sua conta via link mágico (/painel), tudo o que você responde no WhatsApp fica registrado no seu Cockpit Web.',
  },
  {
    question: 'O que é o Multi-Edital e como ele me ajuda a conciliar mais de uma prova?',
    answer:
      'Se você estuda para dois ou mais concursos (por exemplo, Magistratura TJ e Procuradoria PGE), o AprovaMind cruza os conteúdos programáticos, identifica matérias comuns e aloca suas horas para maximizar o aproveitamento compartilhado sem sobrecarregar sua rotina.',
  },
  {
    question: 'Posso cancelar a assinatura a qualquer momento?',
    answer:
      'Sim, sem fidelidade e sem burocracia. O cancelamento pode ser feito com 1 clique direto no seu painel ou através da plataforma de pagamento Hotmart. Você continuará com acesso até o fim do período já pago e depois sua conta volta para o plano Gratuito sem perder seu histórico.',
  },
];

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section className="py-24 border-b border-border bg-background">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary border border-primary/20 bg-primary/10 px-4 py-1.5 rounded-full mb-4 inline-flex items-center gap-2">
            <HelpCircle className="w-3.5 h-3.5" />
            Dúvidas Frequentes
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Tudo o que você precisa saber antes de começar.
          </h2>
          <p className="text-base text-muted-foreground font-light max-w-xl mx-auto">
            Perguntas diretas sobre o funcionamento do ecossistema AprovaMind, IA e planos.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-border bg-card/60 hover:border-border transition-all overflow-hidden"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4"
                >
                  <span className="text-sm sm:text-base font-bold text-foreground">
                    {faq.question}
                  </span>
                  <div
                    className={`shrink-0 transition-transform duration-200 text-muted-foreground ${
                      isOpen ? 'rotate-180 text-primary' : ''
                    }`}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 bg-muted/20">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
