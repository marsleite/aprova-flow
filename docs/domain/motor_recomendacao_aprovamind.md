# AprovaMind — Regra de Negócio: Motor de Recomendação (Decision Engine)

## 1. Arquitetura do Motor

O Motor de Recomendação do AprovaMind não é uma "Caixa Preta" de Machine Learning. Ele é um **Sistema Especialista Determinístico**. Baseia-se em regras heurísticas claras, permitindo explicabilidade total ("Why am I seeing this?").

A arquitetura opera em um pipeline de 4 estágios executado no cliente ou edge (sem delay de LLM):

1. **Ingestão de Contexto:** Agrega as Entradas (Plano, Sessões, Questões, Metas).
2. **Avaliação de Saúde (Health Compute):** Calcula as notas de volume, frequência, aderência, recência e desempenho de cada matéria.
3. **Priorização (Priority Calculator):** Aplica a fórmula de urgência ponderada, gerando o `priorityScore` (0-100).
4. **Geração de Ação (Action Matcher):** Cruza a Saúde + Prioridade com os **Tipos de Recomendação** e emite o output acionável.

A Inteligência Artificial (Gemini) entra **após** o motor, apenas para formatar, contextualizar e conversar com o usuário sobre essas recomendações estruturadas.

---

## 2. Etapas de Cálculo (O Pipeline)

```mermaid
graph TD
    A[Raw Data: Sessions, Questions, Plan] --> B(Subject Health Computer)
    B -->|SubjectHealth[]| C(Priority Calculator)
    C -->|Prioritized Subjects| D(Action Matcher)
    D -->|Actionable Recs| E[UI / AI Persona Context]
```

### Etapa 1: Preparação da Janela
- Define a "Planning Window" (ex: últimos 7 dias para volume, últimos 30 dias para desempenho).
- Calcula os "Dias até a Prova" e define a Fase (Building, Consolidating, Sprinting, Final Push).

### Etapa 2: Cálculo de Saúde
Para cada matéria no edital, extrai métricas puras e roda a heurística de Saúde (veja item 4).

### Etapa 3: Cálculo de Prioridade
Com a saúde calculada, aplica os modificadores de peso do edital e urgência da prova para gerar um Score Absoluto que permite rankear todas as matérias.

### Etapa 4: *Action Matching*
Pega o top do ranking, avalia os "Gatilhos" da saúde da matéria (ex: Desempenho Baixo) e seleciona a melhor "Cápsula de Recomendação" (ex: Sessão de Questões de Diagnóstico).

---

## 3. Fórmula do Priority Score (`priorityScore`)

A prioridade é o que decide QUEM entra no plano de hoje.

`priorityScore = (HealthDeficit * 0.40) + (WeightFactor * 0.30) + (RecencyFactor * 0.20) + (ExamProximity * 0.10)`

- **HealthDeficit (0-100):** `100 - subjectHealth.overallScore`. Matéria doente ganha prioridade.
- **WeightFactor (0-100):** Se a matéria vale 20% da prova, o fator é alto. Se vale 1%, é baixo.
- **RecencyFactor (0-100):** Não estudo há 1 dia = 0. Não estudo há 10 dias = 100.
- **ExamProximity:** Fator dinâmico. Multiplica o resultado total por um *Urgency Multiplier* (1.0x a >90 dias; até 3.0x a <15 dias).

---

## 4. Fórmula Base de Subject Health

A saúde mede o "estado atual" do aluno na matéria.

`subjectHealth = (Performance * 0.35) + (Volume * 0.25) + (Adherence * 0.20) + (Recency * 0.10) + (Frequency * 0.10)`

- **Performance (% acertos recentes):** O fator principal se já houver base. Se não houver, o peso vai para Volume.
- **Volume:** Horas Reais na Semana / Horas Meta da Matéria na Semana.
- **Adherence:** O tempo gasto está condizente com o peso?
- **Recency:** Estudar muito de uma vez e abandonar derruba a nota.
- **Frequency:** Contatos na semana.

*(Nota: Esta é a versão resumida. A versão detalhada está no documento de Regras da Saúde da Matéria).*

---

## 5. Faixas e Thresholds (Bands)

As notas numéricas brutas geram ansiedade. O motor traduz scores para **Bandas (Bands)** de ação.

**Banda de Prioridade (Priority Bands):**
- 🔴 **1. Crítica (`Score >= 80`):** Alerta vermelho. Ação obrigatória hoje. Ex: Matéria de peso alto negligenciada há 15 dias na véspera da prova.
- 🟠 **2. Alta (`Score 60-79`):** Ação agendada para esta semana.
- 🟡 **3. Média (`Score 40-59`):** Manutenção regular. Entra no ciclo normal.
- 🔵 **4. Baixa (`Score 20-39`):** Matéria com peso baixo ou muito saudável. Estudos curtos pontuais.
- ⚪ **5. Opcional (`Score < 20`):** Pode ser pulada caso o tempo aperte.

**Fases da Preparação (Exam Phases):**
- **Building:** > 90 dias ou sem edital. Foco em volume e teoria.
- **Consolidating:** 30-90 dias. Transição para questões.
- **Sprinting:** 15-30 dias. Tiro curto. Volume alto.
- **Final Push:** < 15 dias. Só revisões e decoreba de matérias de peso alto.

---

## 6. Tipos de Recomendação

Toda recomendação gerada pelo motor tem um desses tipos e gera uma ação (Study, Review, Questions, Rest):

1. **🚨 Rescue (Resgate):** Status Crítico/Negligenciado. Ação: "Sessão urgente de revisão/questões para cobrir o buraco de 12 dias sem contato."
2. **⚖️ Rebalance (Reequilíbrio):** Status Attention. Ação: "O volume de D. Constitucional caiu 30% essa semana. Compense com uma sessão teórica de 45m."
3. **🧠 Deepen (Aprofundamento):** Status Ineficiente. Diagnóstico: Estudou muito, rendeu pouco (Acertos < 60%). Ação: "Trocar teoria por bateria densa de questões para achar lacunas."
4. **🏃 Sprint Push:** Fase Sprint + Matéria de Peso alto. Ação: "Intensivão pré-prova de 60m focada direto no Sumário."
5. **🛌 Rest (Descanso / Moderação):** Status Overloaded. Ação: "Você estudou 150% da meta de Raciocínio Lógico. Reduza. Transfira esforço para matérias atrasadas."
6. **🌱 Maintain (Manutenção):** Status Saudável. Ação: "Estudo teórico normal acompanhando o cronograma."
7. **🎉 Celebrate (Celebração):** Status Maduro. Ação: "Você masterizou (85% acertos). Faça apenas 15min de revisão espaçada e sinta orgulho."

---

## 7. Exemplos Fictícios

**João - Concurso: TRT (Prova em 25 dias / Fase: Sprinting)**

### Exemplo A: Português (Peso Real: 20%)
- **Entradas:** Estudou 0h nos últimos 7 dias. Acertos: 80%.
- **Output do Motor:**
  - `Health`: 45 (Atenção - Salva apenas pelo desempenho alto, mas Volume/Recência zero).
  - `PriorityScore`: 85 (Banda Crítica 🔴 - Peso muito alto + Sprint).
  - `Recomendação`: **Rescue + Sprint Push**.
  - `Ação Direta`: "Você não toca em Português há 8 dias e a prova é mês que vem. Interrompa outras matérias menores e faça 60min de questões hoje."

### Exemplo B: Direito Administrativo (Peso Real: 15%)
- **Entradas:** Estudou 12h nos últimos 7 dias (Meta era 5h). Acertos: 52%.
- **Output do Motor:**
  - `Health`: 62 (Atenção -> *Ineficiente*. Volume explodiu, desempenho fraco).
  - `PriorityScore`: 65 (Banda Alta 🟠 - Tem peso, mas o que falta é método, não tempo).
  - `Recomendação`: **Deepen**.
  - `Ação Direta`: "Sinal vermelho em Administrativo. Você está rodando teoria à toa. Sessão de Diagnóstico: 40min SÓ de questões. Sem teoria hoje."

---

## 8. Pseudocódigo Core

```typescript
function recommend(subject, stats, planContext) {
    const health = computeSubjectHealth(stats);
    const priority = calculatePriority(health, planContext);
    
    let recType = 'MAINTAIN';
    let action = 'Estudo regular';
    let duration = 45; // default

    if (health.status === 'CRITICAL') {
        recType = 'RESCUE';
        action = 'Sessão imediata de revisão rápida e exercícios';
        duration = 60;
    } else if (health.volumeScore > 130 && health.performanceScore < 60) {
        recType = 'DEEPEN';
        action = 'Cortar teoria. Foco exclusivo em bateria de questões.';
        duration = 50;
    } else if (planContext.phase === 'FINAL_PUSH' && subject.weight > 10) {
        recType = 'SPRINT_PUSH';
        action = 'Intensivão pré-prova';
        duration = 90;
    }

    return {
        subject: subject.name,
        type: recType,
        priorityBand: getBand(priority),
        action: action,
        reason: formatReason(health), // Ex: "7 dias sem estudar"
        suggestedMinutes: duration
    };
}
```

---

## 9. Riscos, Vieses e Precauções

Para garantir que o motor não gere o "Efeito GPS" (obedecer cegamente e cair num lago), implementamos amarras:

1. **Viés da Falsa Precisão (Garbage In, Garbage Out):**
   - *Risco:* Recomendar abandono de teoria porque o usuário chutou questões no app de concurso e registrou 100% de acerto.
   - *Proteção:* O motor exige um `MIN_QUESTIONS_FOR_SIGNIFICANCE` (ex: 20 unids) antes de habilitar a nota de Desempenho. Até lá, a nota de Saúde depende majoritariamente do Volume (Tempo suado real).

2. **Espiral da Morte da Negligência:**
   - *Risco:* Uma matéria chata fica atrasada. O PriorityScore sobe pra 99 e suga todas as horas da pessoa, destruindo as matérias boas.
   - *Proteção:* Limite de *"Budget Cap"* no Planejador. O motor nunca aloca mais que X% do dia para uma única matéria, mesmo em estado Crítico, forçando o respiro.

3. **Julgamento de Valor / Ansiedade:**
   - *Risco:* Dizer "Você está muito mal em Matemática".
   - *Proteção:* O Motor gera os *dados puros* ("Desvio de -40% na meta"). A I.A. na camada de apresentação (Gemini) traduz isso com tom encorajador: "Matemática ficou um pouco para trás na correria. Vamos focar nela hoje e recuperar terreno."

4. **Zona Morte Pós-Prova:**
   - *Risco:* Recomendar "Sprint" de edital que passou ontem porque o usuário não deletou o plano.
   - *Proteção:* O primeiro passo do Engine checa a propriedade `daysToExam < 0`. Se sim, a Fase vira `POST_EXAM` e o PriorityScore de todas as matérias desse plano despenca, não recebendo alocação de horas (a menos que seja a única ativa).
