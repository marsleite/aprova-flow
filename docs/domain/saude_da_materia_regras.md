# AprovaMind — Regra de Negócio: Saúde da Matéria (Subject Health)

## 1. Definição Conceitual
A **Saúde da Matéria** é o principal indicador de consistência e efetividade do estudo de uma disciplina dentro de um plano (edital). Ela responde à pergunta: _"Dado o peso desta matéria no meu concurso e o tempo que tenho disponível, estou estudando de forma suficiente e com qualidade?"_

A saúde não é um número estático (como % de acertos total). É um **estado dinâmico e temporal**, calculado a cada ciclo do Decision Engine, combinando esforço (tempo), direção (peso), consistência (dias) e resultado (acertos).

---

## 2. Subcomponentes da Saúde

A saúde final é composta por 5 indicadores independentes, cada um pontuado de 0 a 100.

### 2.1. Saúde de Volume (`volumeScore`)
- **O que mede:** O esforço bruto em horas estudadas na janela atual (ex: 7 dias) em relação à meta alvo da matéria.
- **Como calcula:** `(Horas Reais na Janela / Horas Alvo na Janela) * 100` (limitado a max 150 para identificar overtraining).
- **Meta alvo:** `(Peso da Matéria / 100) * Objetivo Semanal do Edital`.

### 2.2. Saúde de Frequência (`frequencyScore`)
- **O que mede:** A constância do contato com a matéria, evitando "estudar 10h num dia e passar 15 dias sem ver".
- **Como calcula:** Quantidade de dias distintos com pelo menos 1 sessão de estudo na janela de análise de frequência (ex: últimos 14 dias), dividida pelo número ideal de contatos (depende do peso).
- **Exemplo:** Matéria de peso alto (15%) deve ser vista pelo menos 4x em 14 dias. Se viu 2x, `frequencyScore = 50`.

### 2.3. Saúde de Aderência (`adherenceScore`)
- **O que mede:** O quão fiel o usuário está sendo à distribuição de pesos do edital.
- **Como calcula:** É o grau de desvio do *market share* da matéria no tempo estudado real vs. o peso alvo.
- **Cálculo:** `100 - | (% do Tempo Total Real da Semana - % Peso no Edital) | * Fator de Punição`. Estudar *menos* que o peso pune mais do que estudar *mais* que o peso.

### 2.4. Saúde de Recência (`recencyScore`)
- **O que mede:** O perigo de esquecimento devido ao afastamento. Intervém rapidamente antes que a métrica de volume da semana caia.
- **Como calcula:** Baseado em `dias desde a última sessão`. Decai não-linearmente após o "limite de segurança".
- **Limites:**
  - Peso Alto (> 10%): Limite 3 dias. Dia 4 o score cai.
  - Peso Baixo (< 5%): Limite 7 dias.

### 2.5. Saúde de Desempenho (`performanceScore`)
- **O que mede:** A efetividade do estudo traduzida em acertos em questões recentes (ex: últimos 30 dias).
- **Como calcula:** `% de acertos recentes`.
- **Validação de Amostra:** Só é calculado se houver um número mínimo de questões resolvidas (ex: > 15 questões). Se não, o score fica `null` (ausência de dados de aferição).

---

## 3. Regras de Composição da Nota Final

O **`OverallHealthScore`** (0-100) é uma média ponderada dos subcomponentes. Os pesos mudam dependendo da maturidade do estudo (se já há dados de desempenho ou não).

**Cenário A: Sem dados de desempenho suficientes (Iniciante / Zona Cega)**
- Volume: 40%
- Aderência: 30%
- Recência: 20%
- Frequência: 10%

**Cenário B: Com dados de desempenho (Estudo Ativo)**
- Desempenho: 35%
- Volume: 25%
- Aderência: 20%
- Recência: 10%
- Frequência: 10%

> 🚨 **Gatilhos de Rebaixamento Imediato (Veto):**
> Independentemente do score composto, gatilhos derrubam a classificação final:
> - Se `dias_sem_estudar > 10` e peso > 5% ➔ Força status **Negligenciada** ou **Crítica**.
> - Se `Volume > 120` (muito estudo) mas `Desempenho < 60%` ➔ Força status **Ineficiente** (esforço burro).

---

## 4. Classificação Final (Estados Estratégicos)

O `SubjectHealthStatus` tipifica o score em categorias acionáveis.

1. **🌿 Saudável (Healthy)**
   - `OverallScore >= 70`. Volume em dia, aderência boa, desempenho ok (ou sem dados, mas cumprindo horas).
   - *Ação:* Manter o ritmo.

2. **⭐ Madura (Mature)**
   - `OverallScore >= 80` **E** `performanceScore >= 80%`. O topo da cadeia. Alto domínio e esforço ajustado.
   - *Ação:* Focar apenas em manutenção (revisões espaçadas e simulados).

3. **🚧 Atenção (Warning)**
   - `OverallScore entre 50 e 69`. Começou a descolar do peso, volume caiu levemente nas últimas semanas, ou desempenho está mediano (60-70%).
   - *Ação:* Pequenos ajustes na rota da semana.

4. **🚑 Crítica (Critical)**
   - `OverallScore < 50` **E** matéria tem Peso > 8% (Relevante pro concurso). Alta defasagem.
   - *Ação:* Sessão de resgate imediata no planejamento diário.

5. **👻 Negligenciada (Neglected)**
   - Acionada pelo gatilho de *Recência*: > 7 a 10 dias sem contato (dependendo do peso).
   - *Ação:* Recomendação para inserir ao menos uma sessão curta de "retomada" ou revisão rápida.

6. **💸 Estudo Ineficiente (Inefficient)**
   - Acionada pelo gatilho cruzado: `volumeScore >= 100` (muito tempo gasto) + `performanceScore < 60%`.
   - *Diagnóstico:* Bate cabeça na teoria ou erro de método.
   - *Ação:* Trocar teoria por questões de nivelamento ou revisar material base.

7. **👁️ Zona Cega (Blind Spot)**
   - `volumeScore >= 80` (muito estudo de teoria) MAS `performanceScore é null` (nunca fez questões suficientes).
   - *Diagnóstico:* Falsa sensação de segurança. Estudou muito, não testou nada.
   - *Ação:* Alerta para fazer sessão puramente de questões diagnósticas.

8. **⚪ Sem Dados (No Data)**
   - Nada registrado nos últimos 30 dias.

---

## 5. Exemplos Concretos

| Cenário | Volume | Ader. | Recên. | Desemp. | Score | Gatilho Ativo? | Status Final |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **Matéria 1:** Cumpriu metas, acertou 85% das 50 Qs recentes. | 95 | 90 | 100 (1d) | 85 | **88** | Nenhum | ⭐ **Madura** |
| **Matéria 2:** Estudou as horas da semana, mas nunca faz questões. | 100 | 95 | 90 (2d) | `null` | **75** | `Volume Alto + Qs nulas` | 👁️ **Zona Cega** |
| **Matéria 3:** Peso alto (15%). Estudou 10h há 12 dias e sumiu. | 110 | 80 | **10** (12d) | 70 | **55** | `Recência > 10d` | 👻 **Negligenciada** |
| **Matéria 4:** Estudando 140% da meta, mas acerta só 55%. | 140 | 70 | 90 (2d) | **55** | **62** | `Vol Alto + Desemp Baixo` | 💸 **Ineficiente** |
| **Matéria 5:** Faltou a semana toda, acertos ruins (60%), peso 10%. | 20 | 30 | 50 (5d) | 60 | **41** | Nenhum | 🚑 **Crítica** |

---

## 6. Proposta de Tipos TypeScript

```typescript
// Os novos 8 estados baseados no documento
export type SubjectHealthStatus =
  | 'healthy'
  | 'mature'
  | 'warning'
  | 'critical'
  | 'neglected'
  | 'inefficient'
  | 'blind_spot'
  | 'no_data';

// Os componentes internos que explicam o status ao usuário
export interface SubjectHealthMetrics {
  volumeScore: number;       // 0-100 (ou até 150)
  frequencyScore: number;    // 0-100
  adherenceScore: number;    // 0-100
  recencyScore: number;      // 0-100
  performanceScore: number | null; // 0-100 ou null se < mín. Qtd
  overallScore: number;      // O % composto final dependendo dos pesos (A ou B)
}

// O output completo do Service de domínio
export interface SubjectHealth {
  subject: string;
  planId: string;
  weight: number;

  status: SubjectHealthStatus;
  metrics: SubjectHealthMetrics;

  // Dados brutos úteis para as Recomendações
  raw: {
    weeklyActualHours: number;
    weeklyTargetHours: number;
    daysSinceLastStudy: number;
    recentQuestionsCount: number;
  };
}
```

---

## 7. Função de Domínio (Pseudocódigo Core)

```typescript
function computeSubjectHealth(ctx): SubjectHealth {
  // 1. Calcula SubComponentes
  const vol = computeVolumeScore(ctx.actualHours, ctx.targetHours);
  const freq = computeFrequencyScore(ctx.studyDaysInWindow, ctx.weight);
  const adh = computeAdherenceScore(ctx.actualShare, ctx.weightShare);
  const rec = computeRecencyScore(ctx.daysSinceLast, ctx.weight);
  const perf = computePerformanceScore(ctx.correct, ctx.total, min=15);

  // 2. Calcula Overall Score (Pesos Cenario A ou B)
  let overall = 0;
  if (perf !== null) {
      overall = (perf * 0.35) + (vol * 0.25) + (adh * 0.20) + (rec * 0.10) + (freq * 0.10);
  } else {
      overall = (vol * 0.40) + (adh * 0.30) + (rec * 0.20) + (freq * 0.10);
  }

  // 3. Aplica Gatilhos e Status
  let status: SubjectHealthStatus;

  if (ctx.totalHours === 0) status = 'no_data';
  else if (ctx.daysSinceLast >= getNeglectThreshold(ctx.weight)) status = 'neglected';
  else if (vol >= 100 && perf !== null && perf < 60) status = 'inefficient';
  else if (vol >= 80 && perf === null) status = 'blind_spot';
  else if (overall >= 80 && perf !== null && perf >= 80) status = 'mature';
  else if (overall >= 70) status = 'healthy';
  else if (overall >= 50) status = 'warning';
  else status = 'critical';

  return { status, metrics: { volumeScore: vol, /*...*/ overallScore: overall }, raw: ctx };
}
```

---

## 8. Ideias de Como Exibir isso no Dashboard UI

1. **Card Principal (Visão Rápida):**
   - Um grid com cards para cada matéria. O card tem a cor do status (Verde, Laranja, Vermelho, Roxo para Madura, Cinza para Zona Cega).
   - O título é a matéria e o subtítulo é o motivo: `"Atenção · Desempenho em 55% e o volume de estudo alto"`.

2. **Gráfico de Radar (Radar Chart):**
   - Ao abrir o detalhe de uma matéria, exibir um gráfico hexagonal/radar com os 5 eixos (`Volume`, `Frequência`, `Aderência`, `Recência`, `Desempenho`).
   - Facilita muito ver por que uma matéria está "Atenção". Exemplo: O radar está super cheio na direita (Volume, Recência), mas o eixo de Desempenho está murcho no meio.

3. **Tags de Diagnóstico (Labels):**
   - Ao lado da barra de progresso semanal na UI, tags coloridas: `[🎯 Alta Aderência]` `[🔥 Zona Cega]` `[🚨 Negligenciada]`.
   - Isso transforma um App de "Cronômetro" num App "Prescritivo e Diagnóstico", que é a nova visão do AprovaMind.
