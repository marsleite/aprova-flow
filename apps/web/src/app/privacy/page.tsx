import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade — AprovaMind',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#080c14] px-4 py-16 text-slate-300">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold text-white">Política de Privacidade</h1>
        <p className="mb-8 text-sm text-slate-500">Última atualização: 28 de fevereiro de 2026</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">1. Introdução</h2>
            <p>
              O <strong>AprovaMind</strong> (&quot;nós&quot;, &quot;nosso&quot;) é uma plataforma de estudos
              inteligente que ajuda candidatos a concursos públicos a organizar, acompanhar e otimizar
              seus estudos. Esta política descreve como coletamos, usamos e protegemos seus dados.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">2. Dados que coletamos</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Dados de autenticação:</strong> nome, e-mail e foto de perfil fornecidos pelo
                Google ao fazer login.
              </li>
              <li>
                <strong>Dados de estudo:</strong> sessões de estudo, tempo registrado, matérias,
                questões respondidas e planos de estudo criados por você.
              </li>
              <li>
                <strong>Dados de calendário:</strong> ao conectar o Google Calendar, criamos eventos
                na sua agenda com base nos seus planos de estudo. Não lemos nem acessamos eventos
                existentes no seu calendário — apenas escrevemos novos eventos.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">3. Como usamos seus dados</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Exibir seu progresso, estatísticas e gráficos de desempenho.</li>
              <li>Gerar recomendações personalizadas de estudo via IA.</li>
              <li>Sincronizar blocos de estudo planejados com o Google Calendar quando você solicitar.</li>
              <li>Melhorar a experiência do produto com base em dados agregados e anônimos.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">4. Integração com o Google Calendar</h2>
            <p>
              O AprovaMind utiliza a API do Google Calendar com o escopo{' '}
              <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-blue-300">
                calendar.events
              </code>{' '}
              para criar eventos na sua agenda principal. Especificamente:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <strong>Permissão solicitada:</strong> criar e editar eventos no Google Calendar.
              </li>
              <li>
                <strong>O que fazemos:</strong> criamos eventos com título, horário e descrição
                baseados nos seus blocos de estudo planejados.
              </li>
              <li>
                <strong>O que NÃO fazemos:</strong> não lemos, modificamos ou excluímos eventos
                existentes. Não acessamos calendários de terceiros.
              </li>
              <li>
                <strong>Revogação:</strong> você pode revogar o acesso a qualquer momento em{' '}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline"
                >
                  myaccount.google.com/permissions
                </a>.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">5. Armazenamento e segurança</h2>
            <p>
              Seus dados são armazenados no <strong>Google Firebase</strong> (Firestore e Authentication),
              com criptografia em trânsito (TLS) e em repouso. Não armazenamos senhas — a autenticação
              é delegada ao Google. Tokens de acesso ao Google Calendar são utilizados apenas durante
              a sessão e não são persistidos no servidor.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">6. Compartilhamento de dados</h2>
            <p>
              Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros.
              Dados podem ser compartilhados apenas quando:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Exigido por lei ou ordem judicial.</li>
              <li>Necessário para proteger nossos direitos legais.</li>
              <li>Com provedores de infraestrutura (Firebase/Google Cloud) para operação do serviço.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">7. Seus direitos</h2>
            <p>Conforme a LGPD (Lei Geral de Proteção de Dados), você tem direito a:</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Acessar seus dados pessoais.</li>
              <li>Solicitar correção de dados incorretos.</li>
              <li>Solicitar exclusão dos seus dados.</li>
              <li>Revogar consentimento a qualquer momento.</li>
            </ul>
            <p className="mt-2">
              Para exercer esses direitos, entre em contato:{' '}
              <a href="mailto:marsleite@gmail.com" className="text-blue-400 underline">
                marsleite@gmail.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">8. Alterações nesta política</h2>
            <p>
              Podemos atualizar esta política periodicamente. Alterações significativas serão
              comunicadas por e-mail ou notificação no app. O uso continuado do AprovaMind após
              alterações constitui aceitação da política atualizada.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">9. Contato</h2>
            <p>
              Em caso de dúvidas sobre esta política, entre em contato com o responsável pelo
              tratamento de dados:
            </p>
            <p className="mt-2">
              <strong className="text-white">Marcelo Leite</strong><br />
              <a href="mailto:marsleite@gmail.com" className="text-blue-400 underline">
                marsleite@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-white/[0.06] pt-6 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} AprovaMind. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}
