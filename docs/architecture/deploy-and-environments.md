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
