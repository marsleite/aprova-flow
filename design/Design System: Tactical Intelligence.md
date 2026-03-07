# 🛰️ Design System: Tactical Intelligence (ShiftCore)
**Versão:** 1.1
**Conceito:** Tactical UI / Cyber-Resilience / Operational Data Visualization

Este sistema é focado em aplicações SaaS de alta densidade de dados, monitoramento em tempo real e segurança. A estética é inspirada em centros de comando (NOC/SOC) e interfaces táticas militares.

---

## 1. Fundações Visuais (Design Tokens)

### 🎨 Paleta de Cores (Signal & Stealth)
| Categoria | Token | Valor HEX | Uso |
| :--- | :--- | :--- | :--- |
| **Base** | `stealth-black` | `#212121` | Fundo principal (profundo e fosco). |
| **Signal** | `mission-orange` | `#FF5841` | Cor de destaque, botões principais e alertas. |
| **Data** | `binary-grey` | `#8B8B8B` | Textos de suporte, dados binários e linhas de grid. |
| **Status** | `status-online` | `#00FF41` | Indicadores de sistema ativo (Matrix Green). |
| **Surface**| `panel-dark` | `#202020` | Superfícies de cards e footers contrastantes. |

### ✍️ Tipografia (Command & Control)
* **Headings (Títulos):** Sans-serif robusta e moderna (ex: *Geist Sans*, *Inter* ou *Archivo*).
    * *Estilo:* Peso 600, Tracking levemente aberto para parecer "tela de radar".
* **Technical/Labels:** Monospaced (ex: *JetBrains Mono*, *Geist Mono*).
    * *Estilo:* Uppercase obrigatório para labels de status. Tamanho: 10px-12px.
* **Métricas:** Fontes mono-espaçadas para leitura rápida de números e códigos binários.

### 🔳 Grid e Bordas (Tactical Grid)
* **Bordas:** `Radius: 8px` para grandes blocos; `Radius: 24px` para botões (pill shape).
* **Overlay:** "Noise Texture" (ruído estático) sutil persistente em todo o background.
* **Linhas:** Uso de eixos X e Y (linhas finas de 1px) cruzando a tela para simular coordenadas.

---

## 2. Componentes de Interface (UI)

### 🚨 Status Indicators
* **Componente:** Pequenos círculos (`.dot`) com animação de "pulse" sutil.
* **Uso:** Indicar integridade de módulos (GPS, Radar, Engines, DB).

### 🔳 Botões "Mission Action"
* **Primário:** Fundo `mission-orange`, texto `stealth-black`, formato "pill" (arredondado).
* **Secundário:** Outline `binary-grey` com texto em monospaced.
* **Ícones:** Setas diagonais (↗) para links externos.

### 📊 Assets de Dados (Binary Visualization)
* **Binary Stream:** Blocos de texto com números `0` e `1` em baixa opacidade servindo como textura de fundo em cards.
* **Graph Bars:** Barras verticais finas com `mix-blend-mode: difference`.

---

## 3. Padrões de UX e Animação

1.  **Reveals (Masking):** Uso de `clip-path` para revelar seções de baixo para cima (Pull-up effect) conforme o scroll.
2.  **Sticky Asides:** Painéis laterais com status do sistema que permanecem fixos enquanto o conteúdo central rola.
3.  **Micro-interações:** Hover em links deve acionar um "underline" que cresce do centro para as bordas.

---

## 4. Instruções para a IA (System Prompt)

> "Aja como um Engenheiro de Interface Tática. Desenvolva os componentes usando Next.js e Tailwind CSS.
> 
> **Diretrizes de Implementação:**
> 1. O fundo deve usar o token #212121 com uma camada de ruído (noise) fixa.
> 2. Use a cor #FF5841 exclusivamente para chamadas de ação e estados de 'alerta'.
> 3. Implemente labels de sistema usando fontes Monospaced em Uppercase com tamanho reduzido (text-xs).
> 4. Crie um componente 'StatusDot' que aceita as cores 'green' ou 'orange' com um efeito de pulsação (animate-ping).
> 5. Seções de dados devem ser separadas por linhas finas de 1px com opacidade 10%.
> 6. Adicione elementos decorativos de 'código binário' estático nos cantos de cards de informação.
> 
> **Exemplo de Card Tático:**
> 'bg-[#202020] rounded-lg p-6 border-l-2 border-[#FF5841] shadow-2xl relative overflow-hidden'"

---

## 5. Checklist de Qualidade "ShiftCore"
* [ ] O contraste entre o Laranja e o Fundo Escuro passa no teste de acessibilidade?
* [ ] Todos os labels técnicos estão em fonte Monospaced?
* [ ] Existe uma textura de 'Noise' aplicada ao fundo?
* [ ] As animações de transição usam 'Masking' ou 'Clip-path'?
* [ ] Os botões de ação principal têm o formato de pílula (rounded-full)?