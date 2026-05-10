# Prompt de Execução — AprovaMind: Preparação para Distribuição

> Cole este prompt inteiro em uma nova sessão de IA com acesso ao repositório.
> Ele contém contexto completo, decisões estratégicas já tomadas e tarefas ordenadas.

---

## Contexto do Projeto

Você está trabalhando no **AprovaMind**, uma plataforma de gestão inteligente de rotina de estudo para concurseiros brasileiros.

O projeto é um **monorepo TypeScript** com:
- `apps/web` — Next.js 16 (App Router), React 19, Tailwind CSS, Framer Motion
- `apps/api` — Fastify 5, Firebase Admin SDK
- `packages/domain` — regras puras do negócio
- `packages/application` — casos de uso e portas
- `packages/contracts` — DTOs compartilhados
- `packages/infrastructure-firebase` — adapters Firestore
- `packages/infrastructure-billing` — ponto futuro de cobrança

Stack: Firebase Auth (Google), Cloud Firestore, Gemini 2.5 Flash / OpenAI via AI Gateway, Recharts, Lucide React.

### Documentação essencial (LEIA ANTES de fazer qualquer mudança)
- `README.md` — visão completa do produto, arquitetura, schema, componentes
- `docs/aprovaflow-project-memory.mdc` — memória do projeto, o que foi feito, roadmap
- `docs/architecture/current-architecture.md` — arquitetura operacional atual
- `docs/product/pre-launch-audit.md` — auditoria de UX com P0/P1/P2 priorizados
- `docs/product/beta-test-plan.md` — plano de beta em 3 fases
- `docs/product/beta-metrics-roadmap.md` — eventos e métricas de produto
- `docs/product/beta-operations-checklist.md` — operação manual de testers
- `docs/product/entitlements-matrix.md` — matriz Free/Pro
- `docs/product/billing-pricing-market-study.md` — estudo de pricing
- `AGENTS.md` — guidelines de desenvolvimento

### Estado atual
- Beta com poucos testers (2-3 pessoas)
- Produto funcional com features maduras
- Objetivo agora: **preparar para distribuição expandida (20-40 beta testers)**
- O fundador é solo (sem sócio, IA é o co-developer)

---

## Decisões Estratégicas Já Tomadas (NÃO questionar)

1. **Cortar banco de questões próprio.** Não construir pipeline de ingestão de provas, não investir em `questions_bank`, `exams`, ou scraping de PDFs de provas oficiais. Manter apenas o registro manual de questões que já existe (`QuestionTrackerCard` + `questions_stats`). O modo simulado customizado existente pode ficar, mas não expandir.

2. **Congelar arquitetura.** A separação domain/application/contracts/infrastructure já está madura. Não refatorar, não mover mais coisas entre apps, não criar novos packages. Código novo segue a estrutura existente.

3. **Congelar billing/Stripe.** Não integrar gateway de pagamento agora. Tier dos testers será operado manualmente. O sistema de entitlements e sandbox local continua como está.

4. **Congelar A/B de modelos IA.** Volume é baixo demais. Manter Gemini 2.5 Flash como padrão e OpenAI como fallback conforme AI Gateway já configurado.

5. **Congelar pós-simulado inteligente com IA.** O motor de regras local é suficiente. Não criar rota `/api/post-simulado` nem UI pro de diagnóstico IA pós-prova.

6. **Foco nos próximos 30 dias: UX de primeira impressão + instrumentação + preparação para beta expandido.**

---

## Tarefas — Executar na Ordem

### BLOCO 1: Corte e Limpeza (fazer primeiro)

#### 1.1 Remover/arquivar artefatos do banco de questões próprio

O arquivo `docs/mode-provas-plan.md` descreve um plano ambicioso de banco de questões, ingestão de provas PDF, pipeline LangChain, etc. Esse plano foi **cancelado**.

Ações:
- Mover `docs/mode-provas-plan.md` para `docs/archive/mode-provas-plan-CANCELLED.md`
- Criar `docs/archive/` se não existir
- No `docs/aprovaflow-project-memory.mdc`, na seção "Evolução futura — Modo Prova com banco de questões", adicionar no topo: `> **DECISÃO (abril/2026): banco de questões próprio CANCELADO. Foco na proposta central do motor de decisão. Manter apenas registro manual de questões e simulado customizado existentes.**`
- Verificar se existem tipos ou código em `packages/domain` ou `types/index.ts` referentes a `questions_bank`, `exams` (como coleções Firestore distintas do `questions_stats` atual) ou `question_attempts` que não estão sendo usados. Se existirem apenas em docs/plans e não no código ativo, não precisa mudar código. Se existirem no código sem uso, remover.

#### 1.2 Atualizar roadmap na memória do projeto

No `docs/aprovaflow-project-memory.mdc`, atualizar:
- Na seção "PRÓXIMA FASE", trocar `Pós-simulado pro` por: `Expansão de beta e preparação para lançamento público`
- Adicionar nova seção após "Roadmap — Fase Final":

```markdown
## Decisões de Produto (abril/2026)

### Cancelado
- Banco de questões próprio (pipeline de ingestão, questions_bank, exams)
- Pós-simulado inteligente com IA (motor local é suficiente)
- Integração de gateway de pagamento (operar manualmente no beta)

### Congelado
- Refatorações de arquitetura (já madura)
- A/B de modelos IA (volume insuficiente)

### Prioridade atual
- Fixes de UX para primeira impressão (P0/P1 da auditoria)
- Instrumentação de métricas de produto
- Expansão de beta (20-40 testers)
- Landing page com parse de edital como hook
- Conteúdo SEO (3-4 artigos long-tail)
```

---

### BLOCO 2: Fixes de UX — P0 da Auditoria

Referência: `docs/product/pre-launch-audit.md`

#### 2.1 P0 — Onboarding do beta precisa ser honesto

**Problema:** A tela de login permite criar conta normalmente, mas a allowlist do beta bloqueia depois do auth. Usuário não convidado consegue iniciar cadastro mas é barrado sem entender.

**Arquivos envolvidos:**
- `apps/web/src/components/LoginScreen.tsx`
- `apps/web/src/hooks/useAuth.ts`

**O que fazer:**
- Na `LoginScreen.tsx`, adicionar um banner ou texto visível **antes** do botão de login que comunique claramente: "O AprovaMind está em beta fechado. Acesso por convite." (ou linguagem similar, respeitando o tom dark/pro do app)
- Se o usuário não estiver na allowlist após o auth, mostrar tela específica de "Você está na fila de espera" em vez de erro genérico. Incluir campo de email para notificação quando o acesso for liberado (pode ser apenas visual por agora, sem backend de waitlist — o importante é a experiência não parecer quebrada)
- Manter o fluxo atual de allowlist funcionando como está; a mudança é apenas de comunicação visual

---

### BLOCO 3: Fixes de UX — P1 da Auditoria

#### 3.1 Harmonizar navegação de provas

**Problema:** A navegação se divide entre overview no app shell (`/simulations`) e rota legada (`/provas`). Parece "duas gerações de produto".

**Arquivos envolvidos:**
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/app/(app)/simulations/page.tsx`
- `apps/web/src/app/provas/page.tsx`

**O que fazer:**
- Avaliar se `/provas` ainda é usado ativamente. Se a funcionalidade já foi migrada para `/simulations`, considerar redirecionar `/provas` → `/simulations`
- Se ambas as rotas têm funcionalidades distintas que precisam coexistir, unificar a entrada no Sidebar para um único item com sub-navegação interna
- Garantir que naming seja consistente (não misturar "Provas" e "Simulados" como se fossem coisas diferentes no menu)

#### 3.2 Simulados: remover métricas placeholder

**Problema:** Tela de simulados mostra KPIs com placeholder estático, parecendo feature incompleta.

**Arquivo:** `apps/web/src/app/(app)/simulations/page.tsx`

**O que fazer:**
- Identificar quais métricas estão hardcoded/placeholder
- Se a métrica pode ser calculada a partir de dados reais em `questions_stats` ou `question_attempts`, calcular
- Se não pode ser calculada ainda (falta dado), **esconder o card/indicador** em vez de mostrar valor falso
- Princípio: é melhor mostrar menos com dados reais do que mais com dados fake

#### 3.3 Amarrar narrativa macro → semana → hoje

**Problema:** Planner, Dashboard e Engine são potentes, mas a jornada entre eles não é explícita.

**Arquivos envolvidos:**
- `apps/web/src/app/(app)/planner/page.tsx`
- `apps/web/src/app/(app)/dashboard/page.tsx`
- `apps/web/src/app/(app)/engine/page.tsx`
- `apps/web/src/components/SmartScheduleCard.tsx`
- `apps/web/src/components/DailyAiPlannerCard.tsx`

**O que fazer:**
- No Dashboard, adicionar breadcrumb contextual ou mini-card que mostre onde o usuário está no encadeamento: "Seu plano macro → Esta semana → Hoje"
- No DailyAiPlannerCard, incluir link/CTA para o Planner quando o plano semanal estiver desatualizado
- No Engine (após sessão), incluir link de volta ao Dashboard com contexto de progresso
- Não precisa ser refatoração grande — links contextuais e micro-copy bastam

#### 3.4 Gap Analyzer: transparência de amostra

**Problema:** Caderno de erros analisa subconjunto sem informar quantos erros entraram no diagnóstico.

**Arquivo:** `apps/web/src/app/(app)/caderno-erros/page.tsx`

**O que fazer:**
- Adicionar texto visível tipo: "Diagnóstico baseado em X erros dos últimos Y dias" com os valores reais
- Se a amostra for pequena (< 10 erros), mostrar aviso: "Amostra pequena — faça mais questões para um diagnóstico mais preciso"

---

### BLOCO 4: Instrumentação de Métricas

Referência: `docs/product/beta-metrics-roadmap.md`

#### 4.1 Verificar quais eventos já estão instrumentados

**O que fazer:**
- Ler `docs/product/beta-metrics-roadmap.md` por completo
- Buscar no código por `product_usage_events` ou qualquer sistema de tracking de eventos de produto
- Listar quais dos seguintes eventos JÁ estão implementados e quais FALTAM:

**Eventos de produto essenciais:**
- `weekly_active_users` (pode ser calculado server-side)
- `daily_active_users` (idem)
- `engine_viewed`
- `simulation_completed`
- `error_notebook_used`
- `mentoring_viewed`

**Eventos de entitlements:**
- `feature_blocked`
- `upgrade_cta_viewed`
- `upgrade_cta_clicked`
- `ai_quota_exhausted`

**Eventos de IA:**
- `explain_answer_used`
- `weekly_mentoring_used`
- `parse_edital_used`

#### 4.2 Implementar eventos faltantes

Para cada evento faltante:
- Usar o padrão de tracking já existente no projeto (verificar se há um `trackEvent()` ou `logProductEvent()` ou escrita direta em coleção Firestore)
- Seguir a convenção existente — não criar novo sistema de analytics
- Cada evento deve incluir no mínimo: `userId`, `planId` (quando aplicável), `timestamp`, `eventName`
- Os eventos `feature_blocked` e `upgrade_cta_clicked` são os mais importantes para entender conversão — priorizar esses

---

### BLOCO 5: Landing Page

#### 5.1 Criar landing page simples

**Objetivo:** Página pública que explica o produto, mostra screenshots e coleta emails de interessados.

**Onde:** Pode ser uma rota pública no próprio `apps/web` (ex: `/landing` ou rota raiz para visitantes não autenticados) ou uma página estática separada. Decidir com base no que for mais simples.

**Conteúdo mínimo:**
- Headline: algo como "Saiba exatamente o que estudar hoje para passar no seu concurso"
- Sub-headline: "O AprovaMind cruza suas horas de estudo, acertos em questões e peso das matérias para gerar um plano diário inteligente"
- 3-4 screenshots reais do app (dashboard, plano diário, heatmap, radar)
- Seção "Como funciona" em 3 passos: Importe seu edital → Estude com o cronômetro inteligente → Receba recomendações diárias da IA
- CTA principal: "Quero acesso ao beta" → campo de email
- CTA secundário: "Teste agora: cole seu edital e gere um plano em 30 segundos" (se conseguir expor o parse de edital como demo pública — isso é stretch goal, não obrigatório)

**Design:** Seguir o design system existente (dark mode, gradientes violeta/azul neon). Referência em `design/design-system.html` e `design/APROVAMIND_REBRANDING_GUIDE.md`.

**Backend do waitlist:** Para o beta, basta salvar emails em uma coleção Firestore `waitlist/{id}` com `email`, `createdAt`. Não precisa de Mailchimp ou similar agora.

**Segurança:** A rota de coleta de email deve ter rate limiting básico para evitar abuse. Validar formato de email no client e no server. Não expor dados da waitlist publicamente.

---

### BLOCO 6: Atualizar documentação

Após todas as mudanças, atualizar:

1. `docs/aprovaflow-project-memory.mdc` — refletir estado atual pós-mudanças
2. `docs/product/pre-launch-audit.md` — marcar P0/P1 resolvidos com data
3. Se novos componentes forem criados, adicioná-los à seção "Componentes Existentes" na memória do projeto

---

## Regras Gerais de Execução

1. **Ler os docs antes de codar.** Principalmente `current-architecture.md` e `pre-launch-audit.md`.
2. **Não criar lógica de negócio dentro de componentes React.** Seguir a separação existente.
3. **Não mexer na arquitetura.** Packages, monorepo, separação web/api — tudo fica como está.
4. **Interface em português, código em inglês.** Convenção do projeto.
5. **Dark mode sempre.** Gradientes violeta/azul neon, Tailwind CSS.
6. **Framer Motion para animações.** Padrão do projeto.
7. **Commits semânticos e granulares.** Um commit por mudança lógica, não um commit gigante.
8. **Testar o que mudar.** Se o projeto tem Vitest configurado, manter/adicionar testes. Se não tem para o componente em questão, pelo menos garantir que não quebrou.

---

## Ordem de Execução Recomendada

```
1. Ler docs (30 min)
2. BLOCO 1 — Corte e limpeza (1h)
3. BLOCO 2 — P0 onboarding (2-3h)
4. BLOCO 3 — P1 fixes de UX (4-6h)
5. BLOCO 4 — Instrumentação (3-4h)
6. BLOCO 5 — Landing page (4-6h)
7. BLOCO 6 — Atualizar docs (1h)
```

Tempo estimado total: ~16-22h de trabalho focado.

---

## Resultado Esperado

Ao final deste prompt, o AprovaMind deve estar pronto para:
- Receber 20-40 beta testers sem que a primeira impressão cause confusão
- Ter dados reais de uso sendo coletados para tomar decisões
- Ter uma landing page pública coletando emails de interessados
- Ter documentação atualizada refletindo as decisões tomadas
