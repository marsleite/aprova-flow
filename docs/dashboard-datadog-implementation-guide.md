# Dashboard Datadog-like no Outro Mac

Este guia documenta como continuar a implementacao da dashboard com comportamento estilo Datadog (widgets independentes, drag + resize, compaction sem buracos) em outro Mac onde seja possivel instalar dependencias externas.

## 1) Objetivo

Implementar uma dashboard com:

- widgets independentes (cada card e um widget)
- modo de edicao
- drag and drop para reordenar
- resize por widget
- layout responsivo por breakpoint (`lg`, `md`, `sm`)
- persistencia no Firestore por usuario
- compactacao vertical para reduzir buracos visuais

## 2) Estado atual no repositorio

Arquivos ja envolvidos no trabalho:

- `src/components/Dashboard.tsx`
- `src/lib/firebase/dashboard.ts`
- `firestore.rules`

Observacoes importantes:

- Existe uma implementacao intermediaria sem engine externa de grid.
- Essa versao pode gerar buracos em alguns cenarios.
- Existem erros TypeScript pre-existentes em `src/components/SessionHistory.tsx` (nao relacionados ao grid da dashboard).

## 3) Preparar o ambiente no outro Mac

## 3.1 Clonar e abrir branch

```bash
mkdir -p ~/workspace
cd ~/workspace
git clone <URL_DO_REPO> aprova-flow
cd aprova-flow
git checkout <SUA_BRANCH>
```

## 3.2 Node e dependencias

Ideal usar Node 22 (ou pelo menos a mesma major usada no projeto atual).

```bash
node -v
npm -v
npm ci
```

## 3.3 Instalar bibliotecas do grid

```bash
npm install react-grid-layout react-resizable
```

## 3.4 Rodar app

```bash
npm run dev
```

---

## 4) Arquitetura recomendada (Datadog-like)

## 4.1 Biblioteca

Usar `react-grid-layout` na versao responsiva:

- `Responsive`
- `WidthProvider`

Exemplo de inicializacao:

```tsx
import { Responsive, WidthProvider, Layouts, Layout } from 'react-grid-layout';

const ResponsiveGridLayout = WidthProvider(Responsive);
```

## 4.2 Configuracao base do grid

Sugestao:

- `breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}`
- `cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}`
- `rowHeight={16}`
- `margin={[16, 16]}`
- `containerPadding={[0, 0]}`
- `compactType="vertical"`
- `preventCollision={false}`

Esses parametros ajudam a reduzir espacos vazios e aproximar do comportamento Datadog.

## 4.3 Modelo de widget

Criar um registro de widgets com metadados:

- `id`
- `label`
- `defaultLayout` por breakpoint
- `minW`, `maxW`, `minH`, `maxH`
- `enabled` (ex.: `ai-telemetry` somente admin)
- `render()`

Exemplo de tipo:

```ts
type DashboardWidgetId =
  | 'daily-summary'
  | 'study-timer'
  | 'subject-radar'
  | 'question-tracker'
  | 'accuracy-chart'
  | 'weekly-bar'
  | 'recent-sessions'
  | 'activity-heatmap'
  | 'goal-streak'
  | 'study-plan'
  | 'session-history'
  | 'calendar'
  | 'insights'
  | 'gemini-coach'
  | 'mentor'
  | 'benchmark'
  | 'weekly-mentoring'
  | 'ai-daily-planner'
  | 'provas-simulados'
  | 'summary-cards'
  | 'ai-telemetry';
```

## 4.4 Layout state

No estado da dashboard, separar:

- `layoutsDraft: Layouts` (quando em edicao)
- `layoutsSaved: Layouts`
- `hiddenWidgets: DashboardWidgetId[]`
- `isEditMode: boolean`

### Fluxo

- Abrir edicao: copia `saved -> draft`
- Alterar grid: atualiza `draft`
- Salvar: persiste `draft + hidden`
- Cancelar: descarta `draft`

---

## 5) Persistencia no Firestore

Arquivo: `src/lib/firebase/dashboard.ts`

## 5.1 Formato sugerido

```ts
interface DashboardLayoutPrefs {
  hidden: string[];
  layouts: {
    lg: Array<{ i: string; x: number; y: number; w: number; h: number }>;
    md: Array<{ i: string; x: number; y: number; w: number; h: number }>;
    sm: Array<{ i: string; x: number; y: number; w: number; h: number }>;
    xs?: Array<{ i: string; x: number; y: number; w: number; h: number }>;
  };
}
```

Documento por usuario em `dashboard_layouts/{userId}`.

## 5.2 Compatibilidade com schema anterior

Hoje pode existir dado legado com:

- `order`
- `hidden`
- `sizes`

Durante leitura:

1. Se `layouts` existir e estiver valido, usar direto.
2. Senao, converter legado (`order` + `sizes`) para `layouts` e usar fallback de defaults.

Na escrita, salvar apenas o formato novo (`layouts + hidden`) e manter `version`.

## 5.3 Firestore rules

Garantir permissao:

```txt
match /dashboard_layouts/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## 6) Refatoracao do `Dashboard.tsx`

## 6.1 Quebrar blocos agrupados

Separar o que hoje esta em blocos combinados:

- `timer-radar` -> `study-timer` + `subject-radar`
- `questions-accuracy` -> `question-tracker` + `accuracy-chart`
- `weekly-recent` -> `weekly-bar` + `recent-sessions`
- `goal-plan` -> `goal-streak` + `study-plan`
- `insights-coach` -> `insights` + `gemini-coach`
- `mentor-benchmark` -> `mentor` + `benchmark`

Cada widget vira item individual no grid.

## 6.2 Render com `ResponsiveGridLayout`

Cada widget:

```tsx
<div key={widget.id} data-grid={layoutItem}>
  {widget.render()}
</div>
```

No modo edicao:

- `isDraggable={true}`
- `isResizable={true}`
- mostrar controles de ocultar/mostrar no painel lateral

No modo visualizacao:

- `isDraggable={false}`
- `isResizable={false}`

## 6.3 Evitar “buracos”

Aplicar:

- `compactType="vertical"`
- `preventCollision={false}`

E manter alturas coerentes (`h`) entre widgets para reduzir saltos extremos.

## 6.4 CSS necessario

Adicionar import dos estilos da lib (global):

- `react-grid-layout/css/styles.css`
- `react-resizable/css/styles.css`

Em Next, normalmente no `src/app/globals.css` via `@import` ou import em um componente client raiz (avaliar abordagem do projeto).

---

## 7) Checklist de qualidade

## 7.1 Funcional

- [ ] Entrar em modo edicao
- [ ] Arrastar widget e soltar
- [ ] Redimensionar widget
- [ ] Ocultar widget
- [ ] Mostrar widget oculto
- [ ] Salvar layout
- [ ] Recarregar pagina e confirmar persistencia
- [ ] Trocar de breakpoint (desktop/tablet/mobile) e validar layout
- [ ] Confirmar `ai-telemetry` visivel apenas para admin

## 7.2 UX

- [ ] Sem buracos grandes apos reordenacoes comuns
- [ ] Resize sem quebrar cards internos
- [ ] Mobile usavel (especialmente widgets altos)

## 7.3 Tecnico

```bash
npm run lint -- src/components/Dashboard.tsx src/lib/firebase/dashboard.ts
npx tsc --noEmit
```

Observacao: se `tsc` falhar por `SessionHistory.tsx`, registrar que e pre-existente.

---

## 8) Prompt pronto para usar no Codex no outro Mac

Copie e cole no novo chat:

```text
Continuar implementacao da dashboard estilo Datadog no projeto aberto.

Objetivo tecnico:
1) Migrar dashboard para react-grid-layout (Responsive + WidthProvider).
2) Tornar cada card um widget independente.
3) Habilitar drag + resize apenas no modo edicao.
4) Salvar layouts por breakpoint (lg/md/sm/xs) no Firestore em dashboard_layouts/{userId}.
5) Manter hide/show de widgets.
6) Eliminar buracos usando compactType='vertical' e preventCollision=false.
7) Preservar regras de acesso (ex.: ai-telemetry so admin).
8) Manter compatibilidade com layout legado (order/hidden/sizes) na leitura.
9) Rodar lint e tsc no final e reportar claramente o que for pre-existente.

Arquivos principais:
- src/components/Dashboard.tsx
- src/lib/firebase/dashboard.ts
- firestore.rules
- src/app/globals.css (se precisar importar css da lib)
```

---

## 9) Fluxo de entrega sugerido no outro Mac

1. Implementar grid responsivo com dados default hardcoded dos widgets.
2. Conectar persistencia (`get/save`) sem legacy.
3. Adicionar migracao de leitura do formato legado.
4. Polir painel de edicao (ocultar/mostrar + reset + salvar/cancelar).
5. Validar e commitar.

Comandos finais:

```bash
git add src/components/Dashboard.tsx src/lib/firebase/dashboard.ts firestore.rules src/app/globals.css package.json package-lock.json
git commit -m "feat: dashboard datadog-like com widgets drag/resize e layouts responsivos"
git push
```
