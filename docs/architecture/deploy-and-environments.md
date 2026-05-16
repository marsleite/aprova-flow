# Deploy e Ambientes

Data de referência: 12/03/2026

## Objetivo

Registrar como os deploys do monorepo estão organizados hoje e qual é o procedimento esperado para evoluir isso sem quebrar produção.

## Projetos na Vercel

### Projeto web

- Nome atual: `aprova-flow`
- App atendido: `apps/web`
- Framework: `Next.js`
- Root Directory: `apps/web`
- Domínio principal atual: `www.aprovamind.com.br`

### Projeto API

- Nome atual: `aprovamind-api`
- App atendido: `apps/api`
- Framework: `Fastify`
- Root Directory: `apps/api`
- Domínio atual esperado: `aprovamind-api.vercel.app`

## Regra de Deploy

Monorepo não significa deploy único.

No AprovaMind:

- o repositório é único
- os projetos da Vercel são separados
- cada app tem build, envs e logs próprios

## Configuração Esperada na Vercel

### `aprova-flow`

- `Root Directory`: `apps/web`
- `Framework Preset`: `Next.js`
- `Build Command`: sem override
- `Output Directory`: sem override
- `Install Command`: sem override
- `Development Command`: sem override
- `Include files outside the root directory`: `Enabled`

### `aprovamind-api`

- `Root Directory`: `apps/api`
- `Framework Preset`: `Fastify`
- `Build Command`: sem override
- `Output Directory`: sem override
- `Install Command`: sem override
- `Development Command`: sem override
- `Include files outside the root directory`: `Enabled`

## Ambientes

### Local

Comandos principais a partir da raiz do monorepo:

```bash
npm run dev:web
npm run dev:api
npm run build:web
npm run build:api
npm run test:run
```

### Preview

Uso recomendado para:

- validar mudanças de estrutura
- validar mudanças de deploy
- validar integração entre `web` e `api`

### Production

Só deve receber:

- web já estável no root `apps/web`
- API com healthcheck funcionando
- configuração de envs revisada

## Estratégia de Corte

Quando houver mudança estrutural relevante:

1. mergear na `main`
2. ajustar `Root Directory` do app afetado
3. redeployar o projeto da Vercel
4. validar rotas básicas
5. só depois promover mudanças dependentes

## Variáveis de Ambiente

### `aprova-flow`

Devem ficar aqui:

- `NEXT_PUBLIC_*`
- Firebase client config
- flags visuais e de frontend
- configs usadas pelo app web

### `aprovamind-api`

Devem ficar aqui:

- segredos server-side
- credenciais de gateway
- credenciais Firebase Admin
- secrets de webhook

#### IA econômica e providers compatíveis

As chamadas pagas de IA devem ficar no runtime server-side. Para avaliar modelos
mais baratos sem expor segredo ao browser, configurar no ambiente da API ou do
BFF server-side:

- `AI_PROVIDER_DEFAULT`: provider padrão (`openrouter`, `gemini` ou `openai-compatible`)
- `AI_MODEL_DEFAULT`: modelo padrão quando a task não tiver override
- `AI_PROVIDER_CHAT`, `AI_MODEL_CHAT`
- `AI_PROVIDER_PLANNER_DAILY`, `AI_MODEL_PLANNER_DAILY`
- `AI_PROVIDER_SMART_SCHEDULE`, `AI_MODEL_SMART_SCHEDULE`
- `AI_PROVIDER_WEEKLY_MENTORING`, `AI_MODEL_WEEKLY_MENTORING`
- `AI_PROVIDER_ERROR_DIAGNOSIS`, `AI_MODEL_ERROR_DIAGNOSIS`
- `AI_OPENROUTER_API_KEY`: chave server-side do OpenRouter
- `AI_OPENROUTER_BASE_URL`: base URL do OpenRouter, normalmente `https://openrouter.ai/api/v1`
- `AI_OPENROUTER_SITE_URL`: URL pública do produto enviada no header `HTTP-Referer`
- `AI_OPENROUTER_APP_NAME`: nome enviado no header `X-Title`
- `AI_OPENAI_COMPAT_BASE_URL`: base URL para providers compatíveis diretos
- `AI_OPENAI_COMPAT_API_KEY`: chave server-side do provider compatível direto
- `AI_DAILY_USER_BUDGET_USD`: teto diário estimado por usuário
- `AI_MONTHLY_GLOBAL_BUDGET_USD`: teto mensal estimado do produto

OpenRouter é o default recomendado para beta porque permite uma única API key e
troca de modelo por tarefa. Gemini continua sendo fallback operacional. Qwen e
DeepSeek devem entrar por task, começando por chat ou fluxos de menor risco,
com monitoramento de custo, falha e fallback no painel beta/admin.

Configuração inicial sugerida:

```bash
AI_PROVIDER_DEFAULT=openrouter
AI_OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
AI_OPENROUTER_API_KEY=...
AI_MODEL_CHAT=qwen/qwen3-8b
AI_MODEL_PLANNER_DAILY=qwen/qwen3-8b
AI_MODEL_SMART_SCHEDULE=qwen/qwen3-14b
AI_MODEL_WEEKLY_MENTORING=deepseek/deepseek-v4-flash
AI_MODEL_ERROR_DIAGNOSIS=deepseek/deepseek-v4-flash
```

Regra:

- não duplicar secrets da API no projeto web
- não confiar em entitlement apenas no frontend

## Observações Operacionais

- o último deploy válido continua servindo produção se um novo deploy falhar
- `GET /health` é a primeira validação da API
- `GET /` na API não é obrigatório no início
- `500 FUNCTION_INVOCATION_FAILED` na API indica problema de runtime/bootstrap, não “API vazia”

## Checklist de Verificação

### Web

- home abre normalmente
- login funciona
- `/engine` abre
- domínio principal continua associado ao projeto certo

### API

- deploy sobe sem erro
- `GET /health` responde `200`
- logs não mostram crash de inicialização

## Rollback

Se algo quebrar:

### Web

- revisar `Root Directory`
- redeploy do último commit estável
- confirmar configuração do projeto `aprova-flow`

### API

- revisar `Root Directory`
- revisar `Framework Preset`
- revisar entrypoint Fastify
- revisar logs de runtime antes de adicionar complexidade nova
