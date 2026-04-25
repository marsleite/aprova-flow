<!--
Sync Impact Report
Version change: unversioned/template -> 1.0.0
Modified principles:
- Template principle 1 -> I. Dominio primeiro e fronteiras explicitas
- Template principle 2 -> II. IA, segredos e autorizacao no servidor
- Template principle 3 -> III. Testes obrigatorios por risco
- Template principle 4 -> IV. Observabilidade e resiliencia operacionais
- Template principle 5 -> V. Entrega incremental guiada por valor
Added sections:
- Restricoes Operacionais
- Fluxo de Entrega e Revisao
Removed sections:
- Nenhuma
Templates requiring updates:
- ✅ .specify/templates/plan-template.md
- ✅ .specify/templates/spec-template.md
- ✅ .specify/templates/tasks-template.md
- ✅ README.md (validado, sem mudancas necessarias)
- ✅ docs/architecture/current-architecture.md (validado, sem mudancas necessarias)
- ✅ docs/architecture/deploy-and-environments.md (validado, sem mudancas necessarias)
Follow-up TODOs:
- Nenhum
-->
# AprovaMind Constitution

## Core Principles

### I. Dominio primeiro e fronteiras explicitas
Toda mudanca que introduz ou altera regra de negocio MUST comecar pelas
fronteiras do monorepo ja definidas: `packages/domain` para regras puras e
policies, `packages/application` para casos de uso e portas, e
`packages/contracts` para DTOs e contratos compartilhados. `apps/web` e
`apps/api` MAY compor interface, rotas, autenticacao, adapters e integracao,
mas MUST NOT concentrar logica de produto que possa viver em pacote
compartilhado.

Novas features MUST preservar as dependencias documentadas em
`docs/architecture/current-architecture.md`: `domain` nao conhece apps ou
frameworks, `application` nao depende de infraestrutura concreta, e componentes
React nao acessam regras de negocio diretamente quando um hook, use case ou
adapter dedicado e o lugar correto. Rationale: manter o produto evoluindo sem
duplicacao de regra, acoplamento acidental ou regressao entre `web` e `api`.

### II. IA, segredos e autorizacao no servidor
Credenciais, chaves de IA, Firebase Admin, webhooks, billing e enforcement de
entitlements MUST permanecer no servidor. Chamadas a modelos MUST passar por
rotas server-side ou pelo gateway compartilhado; o browser MUST receber apenas
dados e permissoes ja filtrados para o runtime cliente.

Toda feature que tocar IA, billing, autorizacao ou recursos premium MUST
documentar o limite de confianca do frontend, a validacao server-side
correspondente e a estrategia de autenticacao ou rate limit aplicavel. Quando
houver grounding em dados do usuario, prompts e respostas MUST usar contexto
real, regras explicitas de seguranca e tratamento contra falhas de provider.
Rationale: o produto ja opera com multiplos providers, quotas e tiers; a
fronteira de confianca precisa ser auditavel e consistente.

### III. Testes obrigatorios por risco
Mudancas em `packages/domain`, `packages/application`, `packages/contracts`,
APIs, billing, entitlements, correcoes de bug e alteracoes de contrato MUST
incluir testes automatizados cobrindo o comportamento afetado. `lint` e
`typecheck` ajudam, mas MUST NOT substituir testes de comportamento quando o
risco exigir prova automatizada.

Mudancas puramente visuais ou de conteudo MAY usar validacao manual
documentada apenas quando nao introduzirem comportamento novo, regra de negocio
nova ou regressao provavel em jornada critica. Toda excecao MUST ser registrada
no spec ou no plano com justificativa objetiva. Rationale: o repositorio ja
mistura UI, API e regras compartilhadas; a disciplina de teste precisa seguir
o risco real da mudanca, nao um ritual cego nem a ausencia total dele.

### IV. Observabilidade e resiliencia operacionais
Mudancas em backend, IA e integracoes MUST definir como falhas serao
percebidas, registradas e degradadas sem quebrar a jornada principal. Rotas,
jobs e fluxos criticos MUST prever telemetria, tratamento de erro, healthcheck
ou validacao operacional compativel com o componente alterado.

Falhas em dados opcionais MAY degradar silenciosamente apenas quando a
experiencia principal continuar integra e esse comportamento estiver alinhado
ao fluxo atual do produto. O monorepo MUST continuar tratando `apps/web` e
`apps/api` como deploys independentes, com envs e logs proprios. Rationale: o
AprovaMind ja separa deploy, healthcheck e telemetria por runtime; mudancas
estruturais precisam preservar essa previsibilidade.

### V. Entrega incremental guiada por valor
Toda feature MUST ser planejada como fatia entregue, testavel e mensuravel,
com user stories independentes e criterios de sucesso verificaveis. MVP
incremental tem precedencia sobre expansao prematura, e complexidade extra MUST
ser justificada no plano quando uma alternativa mais simples for descartada.

Mudancas que alterem arquitetura, runtime, operacoes ou limites de produto MUST
atualizar a documentacao correspondente no mesmo fluxo de entrega. Rationale: o
produto cresce por incrementos que combinam dados, IA e experiencia de estudo;
documentar o impacto enquanto a mudanca nasce reduz retrabalho e regressao de
contexto.

## Restricoes Operacionais
O repositorio oficial do produto e um monorepo com `apps/*` e `packages/*`.
Novos modulos MUST reutilizar essa estrutura antes de introduzir novos topos ou
subprojetos paralelos. O caminho padrao para trabalho de produto e:

- `apps/web` para UI web, paginas Next.js e BFF temporario.
- `apps/api` para backend dedicado, auth server-side, billing, webhooks e
  rotas compartilhaveis.
- `packages/domain` para regras puras e policies.
- `packages/application` para casos de uso, portas e orquestracao.
- `packages/contracts` para contratos compartilhados.
- `packages/infrastructure-*` e `packages/ai-gateway` para adapters e
  integracao.

Segredos MUST permanecer apenas no runtime que os consome. Variaveis
`NEXT_PUBLIC_*` e configuracoes de frontend ficam no projeto web; credenciais
server-side, Firebase Admin, gateway de pagamento e segredos de webhook ficam
na API ou no servidor apropriado. Nao e permitido duplicar segredos da API no
app web para "facilitar" integracao.

Deploys MUST respeitar a separacao operacional atual: `apps/web` e `apps/api`
sao projetos distintos na Vercel, com build, logs, envs e rollback proprios.
Mudanca estrutural que afete root directory, fluxo de deploy ou fronteira entre
runtimes MUST atualizar `docs/architecture/current-architecture.md` e
`docs/architecture/deploy-and-environments.md` no mesmo trabalho.

## Fluxo de Entrega e Revisao
Todo `/speckit.plan` MUST preencher e revisar um Constitution Check antes da
pesquisa detalhada e novamente apos o desenho da solucao. O check minimo
inclui: fronteiras de arquitetura, impacto de IA, segredos e autorizacao,
estrategia de testes por risco, observabilidade ou rollout e atualizacao
documental.

Specs e planos MUST registrar quando a mudanca toca backend, IA, billing,
entitlements, contratos compartilhados ou runtime boundary. Quando houver
excecao a qualquer principio, o documento de planejamento MUST listar a
excecao, a justificativa, o risco aceito e a alternativa simples descartada.

Pull requests, revisoes e merge decisions MUST verificar conformidade com esta
constituicao. Quando uma mudanca alterar a arquitetura viva, o fluxo
operacional ou a politica de teste esperada, a atualizacao de documentacao
correspondente e requisito de conclusao, nao tarefa opcional.

## Governance
Esta constituicao prevalece sobre preferencias locais, atalhos ad hoc e
instrucoes implicitas que entrem em conflito com seus principios. Toda mudanca
futura nesta politica MUST atualizar este arquivo, os templates afetados e o
Sync Impact Report no topo do documento.

A politica de versionamento e semantica:

- MAJOR para remocao ou redefinicao incompativel de principio ou governanca.
- MINOR para novo principio, nova secao ou expansao material de regras
  obrigatorias.
- PATCH para clarificacoes, redacao ou refinamentos sem mudanca normativa.

A conformidade MUST ser revisada em cada plano e em cada PR que altere
comportamento, arquitetura, operacao ou documentacao de referencia. Nao
conformidades abertas MUST ser explicitas, temporarias e aprovadas com
justificativa escrita.

**Version**: 1.0.0 | **Ratified**: 2026-04-07 | **Last Amended**: 2026-04-07
