# Fase 1 — GPS do Estudo (Smart Schedule)

## Objetivo
Criar um sistema de cronograma inteligente onde a IA analisa o tempo disponível, peso das matérias do edital e desempenho passado para recomendar exatamente o que estudar a cada dia.

## Dados de Entrada (Contexto para o Gemini)
1. **Edital (Study Plan):** Matérias e pesos.
2. **Histórico:** Horas dedicadas a cada matéria + taxas de acerto.
3. **Meta da Semana:** Disponibilidade em horas.
4. **Dia atual:** Dia da semana + horas já estudadas na semana.

## Arquitetura

### Backend
- **Rota:** `POST /api/smart-schedule`
- **Prompt:** Instrui o Gemini a agir como algoritmo de otimização, priorizando matérias com alto peso e baixa assertividade.
- **Output:** JSON estrito com dias da semana e matérias/duração recomendadas.

### Frontend
- **`SmartScheduleCard.tsx`:** Card no Dashboard com recomendação do dia e botão "Recalcular Rota".

### Fluxo
1. Dashboard extrai dados do Firestore.
2. Usuário clica "Gerar Cronograma IA" ou "Recalcular Rota".
3. Chamada `POST /api/smart-schedule` com métricas.
4. JSON retornado é renderizado na interface.

---

# Fase 2 — Modo Interrogatório (Active Recall)

## Objetivo
Forçar recuperação ativa após cada sessão de estudo. O aluno digita um resumo do que aprendeu e a IA avalia a retenção.

## Decisões de Design
- **Entrada:** Somente texto (sem transcrição de áudio neste momento — evolução futura).
- **Obrigatoriedade:** O modal é **opcional** — o aluno pode pular se estiver cansado.
- **Threshold:** O modal só aparece se a sessão durou ≥ 60 segundos.

## Arquitetura

### Backend
- **Rota:** `POST /api/interrogation`
- **Prompt de Sistema:** Gemini atua como professor corretor severo e analítico.
- **Output forçado em JSON:**
```json
{
  "score": 85,
  "strengths": "Boa cobertura dos princípios constitucionais.",
  "weaknesses": "Faltou mencionar o controle difuso de constitucionalidade."
}
```

### Frontend
- **`InterrogationModal.tsx`:** Modal com 3 fases animadas:
  1. **Input** — Textarea + botões "Pular" e "Enviar para Mentoria"
  2. **Evaluating** — Loader "O Mentor está avaliando..."
  3. **Result** — Score circular + cards de Pontos Fortes / Pontos Cegos

### Integração (`StudyTimer.tsx`)
- `handleStop` interceptado: se sessão ≥ 60s, abre o modal antes de salvar.
- `onSessionSaved` recebe `retentionScore` opcional quando o aluno não pula.

## Fluxo
```
Finaliza Sessão ≥ 60s → Modal Interrogatório
  ├─ Pular → Salva sessão sem score
  └─ Digitar resumo → POST /api/interrogation → Gemini avalia → Exibe Score → Salva com retentionScore
```
