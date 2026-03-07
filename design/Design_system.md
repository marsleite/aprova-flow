# 🛠️ Design System: Precision Core v1.0
**Conceito:** Engineering Premium / Industrial Dark / High-Performance UI

Este sistema de design foi projetado para aplicações SaaS que exigem uma percepção de precisão técnica, robustez e sofisticação. Inspirado na estética de engenharia de alta performance (carbono, metais e interfaces de dados).

---

## 1. Fundações (Design Tokens)

### 🎨 Paleta de Cores
| Categoria | Token | Valor HEX | Uso |
| :--- | :--- | :--- | :--- |
| **Surface** | `surface-primary` | `#0A0A0A` | Fundo principal da aplicação. |
| **Surface** | `surface-secondary`| `#141414` | Cards, modais e áreas de destaque. |
| **Action** | `accent-primary` | `#FFFFFF` | Textos principais, botões e ícones. |
| **Action** | `accent-secondary`| `#C3C4CC` | Textos de suporte e estados desativados. |
| **Signal** | `brand-highlight` | `#00F0FF` | Apenas para métricas críticas ou focos. |
| **Stroke** | `border-thin` | `rgba(255,255,255,0.1)` | Divisores e bordas de componentes. |

### ✍️ Tipografia
* **Font Family:** `Geist Sans` ou `Inter` (UI), `Geist Mono` ou `Roboto Mono` (Dados/Código).
* **Headings (H1-H4):** `Uppercase`, `Font-weight: 700`, `Letter-spacing: -0.04em`.
* **Body:** `Font-weight: 400`, `Line-height: 1.6`.
* **CTA Text:** `Uppercase`, `Font-weight: 800`, `Size: 12px-14px`.

---

## 2. Componentes Estruturais

### 🔳 Botão "Engineering Plus"
O botão não possui `border-radius`. Ele deve transmitir a ideia de uma peça usinada.
* **Estilo:** Fundo sólido (`accent-primary`), texto em contraste (`surface-primary`).
* **O Detalhe:** Um ícone de cruz (`+`) em cada um dos 4 cantos em estado de hover, ou um ícone de cruz fixo no canto superior direito.
* **Hover:** Transição suave para `opacity: 0.9` ou mudança para `brand-highlight`.

### 💳 Cards de Dados (SaaS Dashboard)
* **Fundo:** `#141414`.
* **Borda:** `1px solid border-thin`.
* **Textura:** Aplicação de um `Grain Overlay` (ruído sutil) com 3% de opacidade para evitar gradientes flat.

### ⌨️ Inputs e Forms
* **Campos:** Apenas borda inferior (`border-b`) ou bordas completas mas extremamente finas.
* **Foco:** A borda muda para `White` com um brilho externo (`drop-shadow`) de 2px.

---

## 3. Padrões de Layout e UX

1.  **Grid Técnico:** Uso de linhas de grade de 1px visíveis em certas seções para simular um desenho técnico.
2.  **Motivo "The Cross":** Em cruzamentos de linhas de grade ou cantos de seções, inserir um caractere `+` como elemento decorativo.
3.  **Scroll Progress:** Linha vertical fina no lado esquerdo da tela indicando a progressão da página ou dashboard.
4.  **Animações:** `Framer Motion` com `type: spring`, `stiffness: 100`, `damping: 20`. Movimentos curtos, rápidos e secos.

---

## 4. Implementação Técnica (Instruções para IA)

> **Instrução Global:** "Desenvolva os componentes usando Next.js e Tailwind CSS. O tema é estritamente Dark Mode. Use bordas retas (rounded-none) em todos os elementos. O fundo deve ser sempre #0A0A0A."

### Configuração do Tailwind (Extensão)
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend