# Prompt de Continuação — AprovaMind (24/04/2026)

## Contexto do Projeto

O AprovaMind é uma plataforma de estudo para concursos públicos brasileiros. Eu (Marcelo) sou o único fundador — IA é meu "co-founder". O produto rastreia horas líquidas de estudo, visualiza progresso por matéria, define metas e gera insights com IA. Suporta múltiplos editais com dashboards filtrados por plano.

### Stack
- Monorepo com `apps/web` (Next.js 16, React 19, App Router) e `apps/api` (Fastify 5)
- Shared packages: `domain`, `application`, `contracts`, `infrastructure-firebase`, `infrastructure-billing`, `ai-gateway`
- Firebase Auth (Google + Email/Senha) com beta allowlist
- Cloud Firestore para dados
- AI Gateway multi-provider (Gemini 2.5 Flash + OpenAI) com roteamento por tarefa
- Entitlements system com Free/Pro tiers (sandbox mode para beta)
- Tailwind CSS + Lucide React + framer-motion
- Design system dark mode com paleta warm/orange (Sitetrip-inspired)

### Documentação obrigatória
Antes de qualquer mudança, leia `docs/aprovaflow-project-memory.mdc` — é a memória central do projeto com schema, componentes, decisões e roadmap.

---

## O que já foi feito (NÃO refazer)

### Sessão anterior (24/04/2026) — Preparação para Distribuição

1. **Corte estratégico**: banco de questões próprio cancelado. `docs/mode-provas-plan.md` movido para `docs/archive/`. Código existente de simulados/caderno-erros mantido funcional mas sem expansão.

2. **P0 — Onboarding beta honesto**: 
   - Tela de login ativa é `apps/web/src/app/login/page.tsx` (NÃO `LoginScreen.tsx` que é legado deprecated)
   - Banner "BETA POR CONVITE" com mensagem dinâmica
   - Waitlist com captura de email no Firestore (`waitlist` collection) — aparece em dois pontos:
     - Modo register com email bloqueado → bloco "FILA DE ESPERA" com formulário
     - Erro de login de beta → waitlist abaixo do erro
   - Firestore rules para `waitlist` (create sem auth, read/update/delete admin only)

3. **P1 — Auditoria UX**: Todos 4 itens já estavam resolvidos no código (navegação, métricas reais, narrativa macro→semana→hoje, transparência Gap Analyzer).

4. **Instrumentação de métricas**: Todos 7 eventos do roadmap já implementados (`feature_blocked`, `upgrade_cta_viewed`, `upgrade_cta_clicked`, `ai_quota_exhausted`, `simulation_completed`, `plan_status_changed`, `tester_subscription_updated`). Painel admin `BetaSignalsCard` com janelas 7/14/30d.

5. **Limpeza de legado**:
   - `LoginScreen.tsx` marcado como deprecated (stub com throw)
   - Zero dead code no fluxo de auth

---

## O que precisa ser feito agora

### BLOCO A: Testes manuais das mudanças recentes (5 min)

Antes de avançar, valide no `localhost:3000`:

1. `localhost:3000/login` — banner "BETA POR CONVITE" aparece
2. Clicar "Ativar acesso beta" → digitar email fora da allowlist → deve aparecer bloco "FILA DE ESPERA" com campo de email
3. Submeter email na waitlist → mensagem verde de sucesso → verificar no Firestore Console que documento foi criado na collection `waitlist`
4. Modo login → tentar logar com email fora da allowlist → erro de beta + formulário de waitlist abaixo
5. Login com email da allowlist → funciona normalmente

Se algum teste falhar, corrija antes de seguir.

### BLOCO B: Deletar `LoginScreen.tsx` legado

O arquivo `apps/web/src/components/LoginScreen.tsx` está marcado como deprecated e não é importado em lugar nenhum. Pode ser **deletado**. Na sessão anterior não conseguimos deletar por limitação do sandbox (Operation not permitted), então substituímos por um stub. Agora pode ser removido de vez.

### BLOCO C: Landing page com parse de edital como hook (PRIORIDADE PRINCIPAL)

**Objetivo**: Criar uma landing page pública em `apps/web/src/app/page.tsx` que converta visitantes orgânicos em usuários beta.

**Estado atual**: Já existe uma landing page funcional em `page.tsx` com hero, features, nav. O design usa o design system warm/orange do projeto.

**O que adicionar/melhorar**:

1. **Seção de Parse de Edital como hook de conversão**
   - Permitir que o visitante faça upload de um PDF de edital **sem criar conta**
   - Mostrar preview do resultado (matérias extraídas, pesos, meta sugerida)
   - CTA: "Crie sua conta para salvar este plano e começar a estudar"
   - A API de parse já existe em `/api/parse-edital` (Gemini processa o PDF)
   - Decisão de implementação: pode ser um formulário inline na landing ou modal

2. **Seção de social proof / números**
   - Horas de estudo rastreadas, sessões registradas, editais suportados
   - Pode ser estático por enquanto (dados reais quando houver volume)

3. **SEO básico**
   - Meta tags, Open Graph, title/description otimizados
   - Foco em keywords: "plataforma de estudo para concursos", "cronômetro de estudo", "plano de estudo para concurso"

4. **Responsividade**
   - A landing atual já tem layout desktop. Garantir que mobile está bom.

**Restrição de segurança**: O parse de edital na landing pública precisa de rate limiting para evitar abuso. A API atual (`/api/parse-edital`) exige auth. Duas opções:
- (A) Criar endpoint público `/api/public/parse-edital-preview` com rate limit por IP (mais simples)
- (B) Exigir login antes de processar (menos fricção é melhor para conversão)
- Recomendação: opção A com rate limit agressivo (3 req/hora por IP)

### BLOCO D: Conteúdo SEO (pós-landing page)

Criar 3-4 páginas de conteúdo long-tail como rotas estáticas:
- `/blog/como-montar-plano-estudo-concurso`
- `/blog/cronometro-estudo-horas-liquidas`
- `/blog/como-estudar-para-pge` (ou magistratura)

Cada página deve ter:
- Conteúdo original de 800-1200 palavras
- Link interno para a landing page e para o CTA de parse de edital
- Meta tags otimizadas

### BLOCO E: Atualizar documentação

Após cada bloco concluído, atualizar `docs/aprovaflow-project-memory.mdc`:
- Marcar itens concluídos com ✅
- Atualizar data
- Adicionar novos componentes/rotas ao índice

---

## Arquivos-chave para referência

| Arquivo | O que faz |
|---|---|
| `docs/aprovaflow-project-memory.mdc` | Memória central — LEIA PRIMEIRO |
| `apps/web/src/app/page.tsx` | Landing page pública |
| `apps/web/src/app/login/page.tsx` | Tela de login ativa (com waitlist) |
| `apps/web/src/app/(app)/layout.tsx` | Guard de rotas protegidas |
| `apps/web/src/hooks/useAuth.ts` | Lógica de auth + beta allowlist |
| `apps/web/src/lib/beta-access.ts` | Allowlist de emails do beta |
| `apps/web/src/app/api/parse-edital/route.ts` | API de parse de edital (Gemini) |
| `firestore.rules` | Regras de segurança do Firestore |
| `docs/product/beta-metrics-roadmap.md` | Roadmap de métricas |
| `docs/product/entitlements-matrix.md` | Matriz de entitlements Free/Pro |

## Convenções

- Interface em português, código/variáveis em inglês
- Dark mode, design system warm/orange
- Componentes com framer-motion para animações
- `'use client'` no topo de componentes interativos
- Firestore rules: validação de tipos nos campos obrigatórios
- IA estratégica: regras locais para feedback diário, IA só para análise profunda e chat
- Segurança: nunca expor chaves de API no client, rate limit em endpoints públicos, validação server-side
