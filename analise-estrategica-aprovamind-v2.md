# Reanálise Estratégica — AprovaMind (v2)

Data: 25/04/2026  
Autor: Análise independente a pedido de Marcelo Leite  
Referência: Análise v1 de 20/04/2026

---

## 1. ENTENDIMENTO DO PROJETO

### O que mudou desde a v1

Na análise v1 (20/04), o AprovaMind era descrito como "beta com testers reais" com feature set extenso mas sem distribuição. Em 5 dias, houve uma transformação significativa no posicionamento:

- **6 páginas removidas** (provas, simulados, caderno de erros) — redução de ~50% da superfície de manutenção
- **questions.ts** encolheu de 629 → 161 linhas
- **Landing page pública** criada com SEO, Open Graph, meta tags e seção de parse de edital
- **3 artigos de blog** long-tail publicados (plano de estudo, cronômetro, magistratura)
- **Onboarding beta** com waitlist real funcionando
- **7 eventos de produto** instrumentados com painel admin
- **Código legado** eliminado (LoginScreen.tsx, nav items, Firestore rules de collections órfãs)

### Avaliação atualizada

O projeto saiu do estado "95% produto, 5% distribuição" para algo mais próximo de "80% produto, 20% distribuição". A landing page, o blog SEO e a waitlist são os primeiros assets de aquisição reais. A deprecação de provas eliminou a feature de maior risco técnico e focou o produto no core real: inteligência de execução.

**Problema que resolve**: inalterado e continua relevante. "Não saber o que estudar agora" é dor diária do concurseiro sério.

**ICP**: mais nítido agora. Ao remover provas/simulados, o AprovaMind se posiciona claramente como *complementar* ao QConcursos/Tec Concursos, não como substituto. O ICP é o concurseiro que *já usa* essas plataformas e precisa de gestão de execução.

### Nota: ⬆️ Melhorou significativamente (de 5/10 para 7/10)

---

## 2. ANÁLISE DE MERCADO

### O que mudou

Nada mudou no mercado externo em 5 dias. Mas o **posicionamento** do AprovaMind mudou:

**Antes**: tentava ser plataforma completa (conteúdo + questões + gestão + IA). Superfície enorme, competia com todos.

**Agora**: posicionamento de ferramenta complementar — "use QConcursos para questões, use AprovaMind para saber *quando* e *quanto* estudar cada matéria". Isso é mais defensável e mais fácil de explicar.

### Concorrência

A remoção de provas/simulados eliminou a sobreposição com QConcursos e Tec Concursos. O AprovaMind agora compete apenas com:
- Planilhas Excel artesanais (70%+ do mercado-alvo usa)
- Apps de pomodoro genéricos (Forest, Toggl)
- Notion com templates de estudo
- Estudaqui (perdeu tração, mas proposta similar)

### Risco competitivo reduzido

Na v1, o risco de QConcursos/Tec copiarem o motor de decisão era "Médio-Alto". Agora, como complementar, o AprovaMind vira *parceiro potencial* deles, não ameaça. Isso muda a dinâmica competitiva favoravelmente.

### Nota: ⬆️ Melhorou (de 6/10 para 7.5/10)

---

## 3. PROPOSTA DE VALOR

### Mais focada e articulável

**Antes**: "Plataforma completa de estudo com IA" — vago, genérico.

**Agora**: "Cole o edital, receba seu plano. Saiba exatamente o que estudar hoje." — concreto, acionável.

A landing page materializa isso com o parse de edital como gancho de conversão. O visitante entende o valor em 10 segundos.

### Preocupação: implementação divergiu da decisão

Marcelo decidiu por um **demo estático** na landing para evitar custo de Gemini em tráfego público. Porém, a implementação feita por outra sessão de IA criou um **endpoint real** (`/api/public/parse-edital-preview`) com chamada ao Gemini, email-gate (1 por lifetime) e rate limit por IP (3/h).

**Impacto financeiro**: se a landing receber tráfego orgânico significativo, cada parse custa ~US$ 0.01-0.05 em tokens Gemini. Com 100 visitors/dia e 20% de conversão ao parse, são ~20 chamadas/dia = US$ 0.20-1.00/dia. Gerenciável, mas diferente da decisão original de "zero custo".

**Recomendação**: manter o endpoint real (o demo estático seria menos convincente como hook), mas monitorar custo. Se tráfego escalar acima de 200 parses/dia, considerar trocar para demo estático.

### Nota: ⬆️ Melhorou (de 7/10 para 8/10)

---

## 4. MODELO DE NEGÓCIO

### Sem mudanças estruturais

Os tiers Free/Pro/Premium (R$ 0 / R$ 34,90 / R$ 64,90) continuam iguais. Nenhum billing real foi implementado — correto para o estágio.

### Impacto da deprecação de provas no packaging

Com a remoção de provas/simulados, o valor do Pro e Premium precisa ser recalibrado. Antes, simulados ilimitados eram parte do Pro. Agora, os diferenciais precisam ser:

| Tier | Diferenciais principais (pós-deprecação) |
|------|------------------------------------------|
| Free | Cronômetro, dashboard básico, 1 edital, 5 msgs chat/mês |
| Pro | Mentoria semanal IA, analytics avançados, histórico completo |
| Premium | Multi-edital, plano diário IA, replanejamento adaptativo |

A distância de valor entre tiers ficou *menos clara* com a remoção de provas. **Ação necessária**: revisar a matriz de entitlements para garantir que o upgrade Pro→Premium tem gatilho claro.

### Nota: → Estável (7/10 — mesmo da v1)

---

## 5. ESTRATÉGIAS DE CRESCIMENTO

### Assets de aquisição criados

A v1 identificou que faltavam completamente assets de aquisição. Agora existem:

1. **Landing page com SEO** — meta tags, Open Graph, keywords de concurso
2. **Parse de edital como hook** — visitor → upload → "aha moment" → CTA criar conta
3. **3 artigos blog** — long-tail SEO para tráfego orgânico:
   - "como montar plano de estudo para concurso"
   - "cronômetro de estudo horas líquidas"
   - "como estudar para magistratura"
4. **Waitlist** — captura de email de quem tenta acessar sem estar na allowlist

### O que ainda falta

1. **Google Search Console / Analytics** — os artigos existem mas sem tracking, não há como saber se estão gerando tráfego. Crítico.
2. **Sitemap.xml e robots.txt** — necessários para indexação dos artigos de blog.
3. **Link building** — artigos de blog sem backlinks demoram meses para ranquear. Considerar postar em comunidades de concurseiros (Reddit r/concurseiros, Telegram).
4. **Social proof real** — a landing tem seção de números mas são estáticos. Quando tiver 20+ testers, mostrar dados reais (horas rastreadas, sessões, editais).
5. **Streak compartilhável** — a v1 sugeriu "branded card compartilhável no Instagram Stories". Continua sendo o growth hack de maior potencial com menor esforço.
6. **Email marketing** — a waitlist captura emails mas não há fluxo de nurturing. Sequência básica: "Obrigado por se inscrever" → "Veja como o AprovaMind funciona" → "Vagas abertas, crie sua conta".

### Nota: ⬆️ Melhorou (de 3/10 para 5.5/10 — era o ponto mais fraco)

---

## 6. ANÁLISE TÉCNICA

### Simplificação real

A codebase ficou mais enxuta e manutenível:

| Métrica | v1 (20/04) | v2 (25/04) | Mudança |
|---------|-----------|-----------|---------|
| Páginas no app | ~12 | ~7 | -42% |
| Itens no Sidebar | 7+ | 5 | -29% |
| Linhas questions.ts | 629 | 161 | -74% |
| Collections Firestore com rules | ~15 | 11 | -27% |
| Endpoints públicos | 0 | 1 (parse-preview) | Novo canal |

### Firestore rules: bem estruturadas

As rules atuais têm validação de tipos em todos os campos obrigatórios, helpers de entitlement (isAdmin, isProOrPremium, isPremium), proteção server-managed para campos de billing, e rate limit collections para o parse público. Ponto positivo.

### Pontos de atenção técnica

1. **Overengineering mantido** — o monorepo com `domain`, `application`, `contracts`, `infrastructure-firebase`, `infrastructure-billing`, `ai-gateway` continua sendo arquitetura de Série A para um produto com 2-3 testers. Não é urgente simplificar (já funciona), mas é bom ter consciência.

2. **`edital_parse_tokens` e `edital_parse_ip_limits` com rules `allow read/write: if true`** — as collections de rate limit do parse público estão abertas para qualquer pessoa ler e escrever. Isso significa que um atacante pode:
   - Ler todos os hashes de email (mesmo sendo SHA-256, ataques de rainbow table são possíveis para emails comuns)
   - Manipular contadores de rate limit para se dar mais tentativas
   - **Recomendação**: migrar rate limit para server-side only (a API route já faz a validação, não precisa de rules públicas). Trocar para `allow read, write: if false` e usar Firebase Admin SDK na route.

3. **`ds-test` na lista de rotas do app** — parece ser uma rota de teste. Verificar se deve existir em produção.

4. **`legal_knowledge` collection com `allow read: if true`** — aberta para leitura pública sem auth. Se contém apenas informação pública (leis), ok. Mas vale questionar se é acessada por algum componente ativo.

### Nota: ⬆️ Melhorou (de 7/10 para 8/10)

---

## 7. PRIORIZAÇÃO E FOCO

### Comparação com o roadmap sugerido na v1

| Ação sugerida na v1 (0-2 meses) | Status |
|---|---|
| Fechar P0/P1 da auditoria UX | ✅ Completo |
| Expandir beta para 20-40 pessoas | ⏳ Não feito — próximo passo |
| Instrumentar métricas de produto | ✅ 7 eventos + painel admin |
| Landing page + waitlist + SEO inicial | ✅ Landing + waitlist + 3 artigos blog |
| Coletar feedback semanal estruturado | ⏳ Não feito |
| Banco de questões próprio: cortar | ✅ Deprecado completamente |

**Resultado**: 4 de 6 itens do curto prazo estão completos. Os 2 restantes são de distribuição (expandir beta, coletar feedback) — exatamente onde o esforço precisa ir agora.

### O que fazer AGORA (próximas 4 semanas)

1. **Expandir beta para 20-40 pessoas** — o produto está pronto. A barreira é encontrar testers, não features.
   - Canal mais rápido: postar nos grupos de Telegram/WhatsApp de concurseiros que Marcelo já participa
   - Segundo canal: pedir para os 2-3 testers atuais indicarem 3-5 amigos cada

2. **Instrumentar tracking de tráfego** — Google Analytics 4 + Search Console na landing e blog. Sem isso, não há como saber se o SEO está funcionando.

3. **Feedback loop estruturado** — criar formulário simples (Google Forms ou Typeform) que os testers preencham semanalmente. 5 perguntas: NPS, feature mais usada, feature menos usada, o que falta, free-text.

4. **Segurança do parse público** — fechar as Firestore rules de `edital_parse_tokens` e `edital_parse_ip_limits` (item 6.2 acima).

5. **Monitorar custo de IA do parse público** — acompanhar `ai_usage_events` para chamadas do endpoint público. Se custo subir, trocar para demo estático.

### O que NÃO fazer agora

- Não implementar billing/Stripe (esperar 50+ usuários dispostos a pagar)
- Não criar mais features (o feature set é mais que suficiente para validar PMF)
- Não refatorar arquitetura (está funcionando, complexidade já foi paga)
- Não investir em paid ads (SEO orgânico + comunidades primeiro)
- Não criar app mobile/PWA (web é suficiente para validação)

### Nota: ⬆️ Melhorou (de 6/10 para 8/10 — foco está correto)

---

## 8. RISCOS E OPORTUNIDADES

### Riscos atualizados

| Risco | Prob. | Impacto | Status vs v1 |
|-------|-------|---------|------|
| Concorrente grande copia o motor | Média | Alto | Igual — mas risco menor por ser complementar, não substituto |
| Fundador solo = burnout | Alta | Crítico | **Reduzido** — escopo menor após deprecação, menos código para manter |
| Churn por aprovação/desistência | Certa | Médio | Igual |
| CAC alto sem brand awareness | Alta | Alto | **Reduzido** — landing page + blog + parse como hooks |
| Free tão bom que ninguém paga | Média | Alto | **Aumentou** — com remoção de provas, menos diferenciais claros entre tiers |
| Complexidade técnica consome tempo | Alta | Alto | **Reduzido** — decisão consciente de congelar arquitetura |
| Parse público gera custo inesperado | Baixa | Médio | **NOVO** — endpoint usa Gemini real, não demo estático |
| Firestore rules do parse expostas | Média | Médio | **NOVO** — rate limit manipulável por client-side |

### Oportunidades atualizadas

1. **Dados de aprovação** — inalterado, continua sendo o maior asset potencial de longo prazo.
2. **Parse de edital como viral loop** — agora implementado. Próximo passo: medir conversão do parse → criação de conta.
3. **Parceria com QConcursos/Tec** — mais viável agora que o AprovaMind não compete em questões. Pitch: "Seus alunos estudam questões no Tec. O AprovaMind diz quais questões priorizar. Integração ganha-ganha."
4. **Streak compartilhável** — ainda não implementado. Continua sendo o growth hack de maior ROI potencial.

### Nota: ⬆️ Melhorou (de 6/10 para 7/10)

---

## 9. MAXIMIZAÇÃO DE VALOR

### Conversão Free → Pro

Com a deprecação de provas, o gatilho de upgrade precisa ser redefinido. Sugestões atualizadas:

1. **Mentoria semanal bloqueada no Free** — o usuário vê "Sua mentoria semanal está pronta" mas precisa ser Pro para acessar. Gatilho de curiosidade forte.
2. **Analytics avançados** — gráfico de acurácia por matéria no Free mostra só visão geral. Drill-down por período e comparativo é Pro.
3. **Histórico limitado no Free** — últimos 7 dias gratuito, histórico completo é Pro.

### Retenção

O loop diário (notificação → plano → timer → feedback → streak) é o mais importante e já está implementado no produto. O que falta é **push notification** — sem notificação, o loop depende do usuário lembrar de abrir o app. PWA com push notifications seria o investimento de maior impacto em retenção, mas pode esperar até ter 50+ usuários.

### Nota: → Estável (7/10)

---

## 10. VEREDITO FINAL

### Evolução em 5 dias

A análise v1 terminou com: "O AprovaMind é um produto tecnicamente excelente que precisa urgentemente de usuários reais."

5 dias depois, o produto está **mais focado, mais enxuto, com menos risco e com os primeiros assets de distribuição criados**. A decisão de deprecar provas/simulados foi a mais impactante — reduziu escopo, eliminou competição desnecessária com gigantes, e focou a proposta de valor.

### Scorecard comparativo

| Dimensão | v1 (20/04) | v2 (25/04) | Δ |
|----------|-----------|-----------|---|
| 1. Entendimento do projeto | 5/10 | 7/10 | +2 |
| 2. Posicionamento de mercado | 6/10 | 7.5/10 | +1.5 |
| 3. Proposta de valor | 7/10 | 8/10 | +1 |
| 4. Modelo de negócio | 7/10 | 7/10 | = |
| 5. Estratégias de crescimento | 3/10 | 5.5/10 | +2.5 |
| 6. Análise técnica | 7/10 | 8/10 | +1 |
| 7. Priorização e foco | 6/10 | 8/10 | +2 |
| 8. Riscos e oportunidades | 6/10 | 7/10 | +1 |
| 9. Maximização de valor | 7/10 | 7/10 | = |
| **Média geral** | **6.0** | **7.2** | **+1.2** |

### Chance de sucesso: MÉDIA-ALTA → ALTA (se...)

A chance aumentou. As condições são:

1. **Expandir beta ESTA semana.** Não na próxima. O produto está pronto. Cada dia sem testers reais é um dia de validação perdida.
2. **Instrumentar tracking de tráfego.** Sem GA4/Search Console, os artigos de blog e a landing são um tiro no escuro.
3. **Fechar a vulnerabilidade do parse público.** As Firestore rules abertas são um risco de segurança que precisa ser resolvido antes de receber tráfego público.
4. **Definir north-star metric e obcecar por ela.** Sugestão mantida: "usuários que abrem o app 5+ dias na semana".
5. **Inverter tempo: 30% produto, 70% distribuição.** Agora que o código está limpo, não há mais desculpa técnica para não focar em aquisição.

### Em uma frase

O AprovaMind evoluiu de "produto excelente sem distribuição" para "produto focado com os primeiros tijolos de distribuição" — agora precisa de volume para descobrir se a tese está certa.

---

## APÊNDICE: Ações imediatas priorizadas

### P0 — Esta semana (crítico)
1. Fechar Firestore rules do parse público (`edital_parse_tokens`, `edital_parse_ip_limits` → `allow read, write: if false`)
2. Configurar Google Analytics 4 na landing + blog + app
3. Adicionar sitemap.xml e robots.txt para indexação SEO
4. Convidar 10-15 pessoas para o beta (testers atuais indicam + comunidades)

### P1 — Próximas 2 semanas
5. Criar formulário de feedback semanal para testers
6. Postar em 2-3 comunidades de concurseiros sobre o AprovaMind (não spam — valor genuíno)
7. Revisar matriz de entitlements pós-deprecação de provas
8. Monitorar custo de IA do parse público por 2 semanas

### P2 — Próximo mês
9. Implementar streak compartilhável (branded card para Instagram Stories)
10. Criar mais 2-3 artigos de blog (focar em concursos específicos: PGE, TRF, Delegado)
11. Se custo de parse subir, trocar para demo estático na landing
12. Avaliar Google Search Console para ajustar keywords dos artigos

### Nota sobre a implementação do parse na landing

A implementação atual usa o Gemini real com email-gate e rate limit, diferente da decisão de Marcelo por "demo estático só". Recomendo manter por enquanto — o parse real é um hook de conversão muito mais forte que uma demo estática. Mas se o custo incomodar, a troca para estático é simples: substituir o `EditalParseSection.tsx` e remover o endpoint `/api/public/parse-edital-preview`.
