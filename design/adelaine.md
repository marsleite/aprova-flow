# 🌿 Adaline Design System (ADS)

**Version:** 1.0 (2026 Edition)  
**Concept:** *Utility-First Intelligence.* Um sistema focado na jornada de LLMOps, equilibrando a estética orgânica de um "jardim digital" com a precisão cirúrgica de uma IDE.

---

## 🧭 1. Princípios de Design

* **Foco no "Prompt":** A interface deve recuar para que o texto do prompt e os dados de telemetria sejam os protagonistas.
* **Dualidade de Bordas:** Bordas arredondadas (`20px`) para marketing e ações humanas; bordas rígidas (`2px`) para controles de máquina e dashboards técnicos.
* **Densidade de Informação:** Interfaces projetadas para exibir métricas de custo, latência e tokens sem exigir scroll excessivo.

---

## 🎨 2. Fundações Visuais

### 2.1 Paleta de Cores (The Garden & Earth)

| Família | Token | Hex | Aplicação |
| :--- | :--- | :--- | :--- |
| **Meadow** | `Primary` | `#2D5A27` | CTAs principais, Success states, Badges ativos. |
| **Meadow** | `Soft` | `#F0F7F0` | Hovers, fundos de destaque leve. |
| **Pebble** | `Background` | `#1F1F1F` | Interface Dark Mode, superfícies de controle. |
| **Pebble** | `Muted` | `#D1D1D1` | Divisores, ícones secundários, bordas de widgets. |
| **Pebble** | `Light` | `#F9F9F8` | Background Light Mode. |

### 2.2 Sintaxe de Dados (Code Highlighting)
Extraído diretamente dos controladores de densidade da plataforma:
* **Strings:** `#A2DB3C` (Verde Lima)
* **Numbers:** `#2CC9FF` (Azul Ciano)
* **Booleans:** `#595959` (Cinza Neutro)

---

## 📐 3. Tipografia e Escala

### 3.1 Font Stacks
* **UI Sans (Interface):** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`.
* **Data Mono (Logs/Prompts):** `Menlo, Monaco, Consolas, "Droid Sans Mono", monospace`.

### 3.2 Escala de Texto
* **Small (GUI):** `11px` - Para controladores compactos e labels de widgets.
* **Base:** `14px` - Texto padrão de leitura e documentação.
* **Title:** `24px` - Cabeçalhos de painéis.
* **Hero:** `53px` - Chamadas de marketing (Landing Pages).

---

## 🧱 4. Componentes

### 4.1 Botão "Action Pill" (Marketing/Global)
* **Radius:** `20px`
* **Font:** `UI Sans Bold`
* **Padding:** `8px 24px`

### 4.2 Botão "System Widget" (Dashboard)
* **Radius:** `2px`
* **Font:** `UI Sans Medium (11px)`
* **Height:** `20px` ou `28px` fixos.

### 4.3 Evaluation Badges (Scoreboard)
Componentes de status para Evals (como ARC-AGI):
* **Fundo:** `Meadow-900`
* **Texto:** `Mono 11px`
* **Conteúdo:** Exibe `Score %`, `Latency (ms)` e `Cost ($)`.

---

## 🛠️ 5. Implementação Técnica

### CSS Variables (Tailwind Ready)
```css
:root {
  /* Colors */
  --meadow-700: #2d5a27;
  --pebble-900: #1f1f1f;
  --pebble-200: #d1d1d1;
  
  /* Syntax */
  --syntax-string: #a2db3c;
  --syntax-number: #2cc9ff;
  
  /* Sizing */
  --widget-height: 20px;
  --border-radius-pill: 20px;
  --border-radius-sharp: 2px;
  
  /* Layout */
  --grid-margin: 24px;
  --nav-height: 64px;
}