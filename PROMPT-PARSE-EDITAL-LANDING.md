# Prompt: Demo de Parse de Edital na Landing Page

## Contexto

O AprovaMind é uma plataforma de estudo para concursos. A landing page (`apps/web/src/app/page.tsx`) já existe e funciona. O app já tem parse real de edital via Gemini dentro do produto (após login).

**Decisão de produto**: NÃO expor o parse real na landing. Custo de Gemini por chamada é alto demais para tráfego público. A landing terá apenas um **demo estático** que mostra o resultado do parse — sem chamada a nenhuma API.

O objetivo é mostrar o "aha moment" visualmente e direcionar para criar conta.

## Stack

- Next.js 16 (App Router) + TypeScript + React 19
- Tailwind CSS, framer-motion, Lucide React
- Design system dark mode warm/orange (ver landing atual como referência de estilo)

## Documentação obrigatória

Leia `docs/aprovaflow-project-memory.mdc` antes de começar.

## O que implementar

### 1. Seção de Demo Estático na Landing

Adicionar uma seção na landing page (`apps/web/src/app/page.tsx`) entre as features existentes e o CTA final.

**Conteúdo visual**:
- Kicker: "PARSE DE EDITAL COM IA"
- Título: "Cole seu edital. Receba seu plano."
- Subtítulo: "O AprovaMind lê o PDF do edital e extrai matérias, pesos e meta semanal automaticamente."

**Card de demo** — simular visualmente o resultado de um parse real. Usar dados fictícios mas realistas de um edital de PGE-SP:

```
┌─────────────────────────────────────────────┐
│  PGE-SP 2026 — Procurador do Estado         │
│  12 matérias · Meta: 22h/semana             │
│  Prova: 13/09/2026                          │
│                                             │
│  Direito Constitucional  ████████████  18%  │
│  Direito Administrativo  ██████████░  15%   │
│  Direito Civil           ████████░░░  12%   │
│  Direito Processual      ███████░░░░  10%   │
│  Direito Tributário      ██████░░░░░   9%   │
│  Direito Penal           █████░░░░░░   8%   │
│  Direito do Trabalho     █████░░░░░░   7%   │
│  Português               ████░░░░░░░   6%   │
│  + 4 matérias            ░░░░░░░░░░░  15%   │
│                                             │
│  [Criar conta e analisar meu edital →]      │
└─────────────────────────────────────────────┘
```

**Implementação**:
- Criar `apps/web/src/components/landing/EditalDemoSection.tsx` como componente. Pode ser server component (sem `'use client'`) já que não tem interatividade.
- Barras horizontais com Tailwind (divs com width percentual e `bg-primary`)
- Animação de entrada com framer-motion (fade-in quando entra no viewport, se quiser usar `'use client'` para isso)
- CTA: link para `/login` com texto "Criar conta e analisar meu edital"
- Manter consistência visual com as outras seções da landing (mesmos espaçamentos, tipografia, borders)

**Dados do demo** — hardcoded no componente:
```typescript
const DEMO_SUBJECTS = [
  { subject: 'Direito Constitucional', weight: 18 },
  { subject: 'Direito Administrativo', weight: 15 },
  { subject: 'Direito Civil', weight: 12 },
  { subject: 'Direito Processual Civil', weight: 10 },
  { subject: 'Direito Tributário', weight: 9 },
  { subject: 'Direito Penal', weight: 8 },
  { subject: 'Direito do Trabalho', weight: 7 },
  { subject: 'Português', weight: 6 },
];
const DEMO_EXTRA_COUNT = 4;
const DEMO_EXTRA_WEIGHT = 15;
const DEMO_PLAN_NAME = 'PGE-SP 2026 — Procurador do Estado';
const DEMO_WEEKLY_GOAL = 22;
const DEMO_EXAM_DATE = '13/09/2026';
const DEMO_TOTAL_SUBJECTS = 12;
```

### 2. Opcional — Segundo demo com edital diferente

Se quiser reforçar que funciona para vários concursos, adicionar um toggle ou tabs mostrando dois exemplos:
- PGE-SP (carreiras jurídicas)
- Polícia Federal (carreiras policiais)

Isso é opcional e pode ser feito depois. Priorizar o demo único primeiro.

### 3. Atualizar documentação

Após implementar, atualizar `docs/aprovaflow-project-memory.mdc`:
- Adicionar `EditalDemoSection` à lista de componentes
- Marcar "Landing page com demo de parse de edital" como ✅
- Atualizar PRÓXIMA TASK para o próximo item (SEO / expansão de beta)

## Arquivos de referência

| Arquivo | Por que ler |
|---|---|
| `apps/web/src/app/page.tsx` | Landing page atual — inserir a nova seção aqui, manter estilo |
| `apps/web/src/app/api/parse-edital/route.ts` | Ver o SYSTEM_PROMPT e tipos de resposta para entender o que o parse retorna (usar como base para os dados do demo) |
| `docs/aprovaflow-project-memory.mdc` | Memória do projeto — LER PRIMEIRO, atualizar no final |

## Restrições

- **ZERO chamadas a API** — o demo é 100% estático, dados hardcoded
- **ZERO custo** — nenhuma interação com Gemini, Firebase ou qualquer backend
- NÃO criar formulário de upload na landing
- NÃO pedir email nesta seção (a waitlist já existe na tela de login)
- Manter o design consistente com o resto da landing
- CTA direciona para `/login`, não para nenhum endpoint
