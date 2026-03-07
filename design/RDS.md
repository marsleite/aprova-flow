# 💎 Refract Design System (RDS)

**Versão:** 1.0 (Enterprise Edition)  
**Conceito:** *Digital Identity Orchestration.* **Visão:** Um sistema de alta fidelidade visual que funde a precisão do código com a elegância do design premium, focado em criar autoridade digital através de profundidade, luz e movimento.

---

## 🧭 1. Princípios de Design

* **Sinalização de Autoridade:** Uso de contrastes dramáticos e tipografia bold para transmitir confiança.
* **Profundidade Atmosférica:** Camadas de luz (gradientes radiais) e desfoque (*glassmorphism*) para criar hierarquia visual.
* **Hibridismo Técnico:** Mistura de elementos orgânicos (pills) com elementos de engenharia (mono fonts e snippets de código).

---

## 🎨 2. Fundações Visuais

### 2.1 Paleta de Cores (Atmosphere)

| Nome | Token | Hex | Aplicação |
| :--- | :--- | :--- | :--- |
| **Deep Space** | `Background` | `#0A0A0A` | Fundo principal (Dark Mode). |
| **Midnight** | `Surface` | `#0E111B` | Cards, painéis e seções secundárias. |
| **Refract Blue** | `Primary` | `#3150AA` | Sombras, glows de fundo e badges de status. |
| **Refract Amber** | `Primary-2` | `#F59768` | CTAs principais e indicadores ativos. |
| **Muted** | `Text-Low` | `#666666` | Texto secundário e bordas desativadas. |

### 2.2 Texturas e Efeitos
* **Backdrop Blur:** Utilização de `blur(20px)` ou superior em overlays.
* **Radial Mask Grid:** Grid de fundo (`8px x 8px`) revelado por máscaras radiais para profundidade técnica.

---

## 📐 3. Tipografia

O RDS utiliza um sistema de fontes duplo para equilibrar marketing e tecnologia.

* **Brand Sans:** `Inter Tight`
    * *Uso:* Headlines de impacto, títulos de seções.
    * *Peso:* `Bold (700)` ou `Semibold (600)`.
    * *Espaçamento:* `tracking-tight`.
* **System Mono:** `Geist Mono`
    * *Uso:* Navegação, labels de sistema, botões e código.
    * *Vibe:* Developer-centric.

---

## 🧱 4. Componentes Principais

### 4.1 Button "Identity" (Primary)
* **Estilo:** `rounded-full` (Pill shape).
* **Background:** Radial gradient (`var(--primary2)` em direção ao `var(--primary)`).
* **Efeito:** `box-shadow` com inset branco no topo (`#FFFFFF66`) para simular reflexo de luz.
* **Hover:** `hover:-translate-y-[2px]` + `brightness-110`.

### 4.2 Floating Navigation Area
* **Layout:** Centralizado, `rounded-full`.
* **Glassmorphism:** `bg-white/5` + `backdrop-blur`.
* **Interação:** Letras animadas com efeito de "swap" vertical no hover.

### 4.3 Engineering Card
* **Borda:** `0.6px border-white/10`.
* **Animação:** Glow interno que segue o movimento do cursor ou scroll.

---

## 🎞️ 5. Movimento e Animação (GSAP/Motion)

O sistema deve parecer "vivo" e reativo ao usuário:
1.  **Line Masking:** Textos principais entram na tela deslizando de baixo para cima através de uma máscara invisível.
2.  **Character Typing:** Snippets de código em cards devem possuir delay individual por caractere (`opacity: 0` para `1`).
3.  **Smooth Scroll:** Implementação obrigatória de **Lenis** ou similar para fluidez de scroll.

---

## 💻 6. Implementação Técnica (Tailwind Config)

```javascript
// tailwind.config.js snippet
module.exports = {
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        surface: '#0E111B',
        primary: '#3150AA',
        accent: '#F59768',
      },
      borderRadius: {
        'pill': '9999px',
        'card': '1rem',
      },
      backgroundImage: {
        'identity-grad': 'radial-gradient(57.04% 86.47% at 50% 105%, #F59768 0%, #3150AA 100%)',
      }
    }
  }
}