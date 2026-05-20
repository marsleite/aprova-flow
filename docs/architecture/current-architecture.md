# Arquitetura Atual do AprovaMind

Data de referência: 2026-04-09

## Objetivo

Este documento descreve a arquitetura operacional atual do monorepo depois da ratificação da constituição e das fases iniciais de endurecimento do backend.

O objetivo é registrar:

- como o repositório está organizado hoje
- qual é a responsabilidade de cada app e pacote
- onde o runtime canônico já vive
- quais transições ainda estão em andamento
- quais limites arquiteturais não devem mais ser violados

## Visão Geral

```text
apps/
  web/        # Next.js: UI, páginas, sessão no browser e proxies finos de compatibilidade
  api/        # Fastify: backend canônico para auth, entitlements, IA e engine

packages/
  domain/                   # regras puras do produto
  application/              # casos de uso, portas e orquestração
  contracts/                # DTOs e contratos compartilhados
  infrastructure-firebase/  # adapters server-side e bridges legadas em extração
  infrastructure-billing/   # ponto de integração para cobrança

docs/
  architecture/
```

## Responsabilidades por Área

### `apps/web`

Responsável por:

- experiência do usuário
- páginas, layouts e componentes React
- composição visual dos fluxos do produto
- obtenção de sessão no browser
- rotas de compatibilidade que apenas encaminham chamadas para a `apps/api`
- comunicação honesta de contexto local, como sandbox de entitlement ativo e
  ausência de edital ativo no fluxo principal

Não deve concentrar:

- lógica nova de negócio
- autorização pro final
- gateways de IA
- runtime canônico do engine
- mutações server-side de assinatura ou entitlement

### `apps/api`

Responsável por:

- `GET /health`
- autenticação via Firebase ID token
- entitlements e assinatura server-side
- operações administrativas de beta/testers
- gateway de IA com guards e limites
- runtime canônico do engine (`/engine/snapshot` e `/engine/portfolio`)

Estado atual:

- builda e deploya separado da `apps/web`
- já autentica requests protegidos
- já concentra rotas reais de produto
- ainda convive com alguns proxies/bridges legados na `web`

### `packages/domain`

Responsável por:

- tipos puros do domínio
- regras do motor de decisão
- policies
- value objects
- enums de negócio

Não pode conhecer:

- React
- Next.js
- Fastify
- Firebase
- Vercel
- gateway de pagamento

### `packages/application`

Responsável por:

- casos de uso
- portas (`ports`)
- mappers de aplicação
- orquestração entre infraestrutura e domínio

Não pode depender de implementações concretas.

### `packages/contracts`

Responsável por:

- DTOs e contratos compartilhados entre `web` e `api`
- snapshots e payloads públicos do motor
- shapes usados por compatibilidade entre apps

### `packages/infrastructure-firebase`

Responsável por:

- adapters server-side para Firebase/Auth/Firestore
- bordas legadas ainda compartilhadas enquanto a extração para a API não termina

Não deve virar atalho para espalhar regra de negócio fora de `domain` e `application`.

## Fluxos Relevantes Hoje

### Fluxo canônico do engine

```text
Next page/component
  -> rota de compatibilidade em apps/web (quando existir)
    -> apps/api
      -> application use case
        -> infrastructure adapter
          -> domain services
            -> contracts/dto
```

Exemplo concreto:

```text
apps/web/src/app/api/engine/snapshot/route.ts
  -> apps/api/src/modules/engine/routes.ts
    -> packages/application/.../GetPlanEngineSnapshot
      -> packages/infrastructure-firebase/.../LegacyEngineDataSource
        -> packages/domain/.../PlanEngine
          -> packages/contracts/.../PlanEngineSnapshot
```

### Fluxo canônico de portfólio multi-edital

```text
apps/web/src/app/api/engine/portfolio/route.ts
  -> apps/api/src/modules/engine/routes.ts
    -> packages/application/.../GetPortfolioSnapshot
      -> packages/domain/.../PortfolioAllocator
        -> packages/contracts/.../PortfolioSnapshot
```

### Fluxo de recursos protegidos

```text
Browser
  -> apps/web
    -> composição de prompt/contexto quando necessário
    -> apps/api
      -> firebase-auth plugin
      -> feature guard / entitlement checks
      -> gateway de IA / use case / adapter
```

Esse fluxo já vale para IA, entitlements, eventos de produto e operações administrativas.

Para IA, a `apps/web` pode continuar montando contexto de produto e aplicando quota/entitlements locais, mas a execução do modelo e a persistência de `ai_usage_events` acontecem canonicamente na `apps/api`.

### Fluxo econômico de IA

```text
apps/web ou apps/api
  -> @aprovamind/ai-gateway
    -> policy por tarefa
    -> orçamento por usuário/global
    -> provider OpenRouter, Gemini ou OpenAI-compatible
    -> telemetria de uso/custo
    -> fallback determinístico quando permitido
```

O gateway econômico é o ponto único para decisões de provider/modelo, limite de
saída, estimativa de custo, bloqueio por orçamento e normalização de falhas. O
OpenRouter segue como provider padrão para reduzir atrito operacional e permitir
seleção de modelos por tarefa. Gemini fica como fallback seguro, e providers
compatíveis com OpenAI diretos ainda podem ser ativados por variáveis de
ambiente sem alterar a experiência do estudante.

Fluxos críticos como plano diário, cronograma, mentoria e diagnóstico precisam
continuar úteis mesmo sem chamada externa. Quando o orçamento bloqueia ou o
provider falha, a resposta deve ser marcada como fallback/resiliente e não deve
expor prompt, stack trace, chave ou erro bruto do provider.

Para sinais de produto e revisao operacional do beta, a `apps/web` usa proxies finos e cards de leitura, enquanto `product_usage_events` e o resumo admin de beta ficam centralizados na `apps/api`.

Para a jornada principal, a `apps/web` agora também assume uma regra explícita
de estabilidade:

- `/login` e `/planner` precisam comunicar quando um sandbox local de
  entitlement está ativo
- `/dashboard` e `/engine` não seguem sem um edital ativo válido; nesses casos,
  a interface devolve o usuário ao Planner com empty state honesto

## Regras de Dependência

Dependências permitidas:

- `apps/web` -> `packages/domain`, `packages/application`, `packages/contracts`
- `apps/api` -> `packages/domain`, `packages/application`, `packages/contracts`
- `packages/application` -> `packages/domain`, `packages/contracts`
- `packages/infrastructure-*` -> implementações concretas de borda

Dependências proibidas:

- `packages/domain` -> qualquer `app`
- `packages/domain` -> Firebase, Fastify, Next
- `packages/application` -> implementação concreta do banco ou gateway
- `apps/web` -> lógica de negócio espalhada em componente React
- `apps/web` -> checks pro finais confiando apenas no cliente

## Estado Atual por Maturidade

### Estável

- monorepo com `apps/*` e `packages/*`
- `packages/domain`
- `packages/application`
- `packages/contracts`
- deploy separado de `web` e `api`
- autenticação server-side na `api`
- entitlements e engine com runtime canônico na `api`
- cadeia principal com guardas de estabilidade para CTA do Planner, sandbox
  local visível e fallback honesto de Dashboard/Engine

### Em transição, mas válido

- proxies finos de compatibilidade em `apps/web`
- adapters legados do engine em `packages/infrastructure-firebase`
- operação manual de testers/beta enquanto o gateway de cobrança não entra

### Próximos movimentos estruturais

- extrair outras rotas protegidas restantes da `web` para a `api`
- consolidar observabilidade entre `web` e `api`
- reduzir bridges legadas onde a `web` ainda conhece detalhes de backend
- introduzir integração de billing sem quebrar a escada `free -> pro`

## Decisões Arquiteturais já Fechadas

- um único repositório Git
- monorepo com `apps/*` e `packages/*`
- `apps/web` continua em `Next.js`
- `apps/api` é o backend dedicado em `Fastify`
- `domain`, `application` e `contracts` são compartilhados
- segredos, IA e autorização pro ficam no servidor
- o runtime canônico do engine não deve voltar para a `web`

## O que não deve acontecer

- criar lógica nova de negócio dentro de componentes React
- recolocar checks de plano ou entitlement apenas no frontend
- duplicar o runtime do engine entre `web` e `api`
- usar rotas Next como backend definitivo para recursos protegidos
- tratar `packages/infrastructure-*` como lugar de regra de produto

## Coleções e Persistência de Dados (Firestore)

### `weekly_smart_schedules`
- **Objetivo**: Salvar o cronograma semanal inteligível gerado por IA para evitar perda de dados no reload.
- **Formato do ID do Documento**: `${userId}_${planId}_${weekStart}` (onde `weekStart` é o YYYY-MM-DD da segunda-feira da semana corrente, obtido de forma timezone-safe).
- **Campos**:
  - `userId` (string): Identificador do usuário dono do cronograma.
  - `planId` (string): Identificador do plano de estudos ativo (garante isolamento multi-edital).
  - `weekStart` (string): Data da segunda-feira da semana de alocação (YYYY-MM-DD).
  - `schedule` (list): Array com itens do cronograma diário, contendo dia, horas totais sugeridas e matérias detalhadas com motivo de alocação.
  - `generatedAt` (string): Timestamp ISO 8601 da primeira geração do cronograma.
  - `updatedAt` (string): Timestamp ISO 8601 da última atualização (recalculação) do cronograma.
- **Regras de Acesso**: Leitura, escrita e atualização permitidas exclusivamente para o próprio usuário autenticado (`request.auth.uid == userId`).

