# Estratégia de IA do AprovaMind (Produto + Tecnologia)

Data de referência: 21/02/2026

## 1) Objetivo de Produto

Transformar a IA de "assistente que responde" para "copiloto de aprovação".

Resultado esperado:
- Aumentar retenção semanal (usuário volta para executar plano diário).
- Aumentar taxa de conversão para plano pago (valor percebido claro).
- Controlar custo por usuário ativo sem perda de qualidade.

## 2) Diagnóstico do Estado Atual

Uso de IA atual no app:
- `/api/chat`: coach conversacional.
- `/api/parse-edital`: extração de matérias/pesos de PDF.
- `/api/weekly-mentoring`: mentoria semanal com cache.

Pontos fortes:
- Boas rotas de IA já em produção.
- Contexto de estudo real já integrado (dados Firestore).
- Mentoria semanal com cache reduz custo e evita chamadas desnecessárias.

Gaps de produto (oportunidade):
- IA está mais reativa do que executiva (responde, mas não conduz rotina diária).
- Valor premium ainda não está ancorado em "ganho de desempenho mensurável".
- Falta loop diário de decisão: "o que estudar agora e por quê".

Gaps técnicos:
- Falta camada única de roteamento de modelos (provider abstraction).
- Falta observabilidade robusta por rota (tokens, custo, latência, qualidade).
- Parse de JSON ainda depende de limpeza manual em texto livre.
- Rate limit em memória (`Map`) não escala bem em ambiente distribuído.

## 3) Qual IA usar: Gemini ou GPT?

Recomendação pragmática: usar estratégia híbrida por tarefa.

### 3.1 Preços de referência (API, por 1M tokens)

OpenAI:
- GPT-5 mini: input $0.25, cached input $0.025, output $2.00
- GPT-5 nano: input $0.05, cached input $0.005, output $0.40

Google Gemini Developer API:
- Gemini 2.5 Flash: input $0.30, output $2.50
- Gemini 2.5 Flash-Lite: input $0.10, output $0.40

Observação:
- Preços mudam com frequência; revisar antes de decisões comerciais finais.

### 3.2 Decisão por caso de uso

- Parse de edital (PDF multimodal): manter Gemini 2.5 Flash inicialmente.
- Chat premium e mentoria textual: A/B entre GPT-5 mini e Gemini 2.5 Flash.
- Classificação/sumarização barata: GPT-5 nano ou Gemini Flash-Lite.

### 3.3 Escolha padrão inicial sugerida

Se for escolher um stack principal agora:
- GPT-5 mini como padrão para texto estratégico (chat/mentoria/planner).
- Gemini 2.5 Flash mantido para parse de PDF até benchmark interno confirmar troca.

## 4) Unit Economics (estimativa inicial)

Cenário de referência por usuário ativo/mês:
- Chat: 20 interações/mês, média ~3k input + 400 output por chamada
- Mentoria semanal: 4 chamadas/mês, média ~2.5k input + 900 output
- Parse edital: 0.2 chamada/mês, média ~40k input + 1k output

Totais aproximados/mês por usuário ativo:
- Input: ~78k tokens
- Output: ~11.8k tokens

Custo estimado por usuário ativo/mês:
- Gemini 2.5 Flash: ~US$ 0.053
- GPT-5 mini: ~US$ 0.043
- Gemini Flash-Lite (qualidade menor): ~US$ 0.013

Conclusão:
- O principal gargalo não é custo de token, é captura de valor de produto.
- O maior retorno vem de funcionalidades que aumentam retenção e assinatura.

## 5) Funcionalidades de IA que geram assinatura premium

### 5.1 Feature âncora premium

Plano de Aprovação Adaptativo (diário):
- "Próxima melhor sessão" com matéria + duração + objetivo.
- Replanejamento automático pós-sessão.
- Plano de recuperação de 7 dias ao detectar desvio de meta.
- Priorização por edital + risco por matéria.

### 5.2 Feature premium de alto impacto

Pós-Simulado Inteligente:
- Diagnóstico por matéria (causa raiz: conhecimento x execução x tempo).
- Trilha de revisão acionável (24h, 72h e 7 dias).
- Metas táticas para o próximo simulado.

### 5.3 Benefício percebido para venda

Mensagem comercial clara:
- "Não é só chat: você recebe um plano diário executável e adaptativo para aumentar sua chance de aprovação."

## 6) Arquitetura Recomendada

### 6.1 Camada de IA única (AI Gateway)

Criar abstração única para todos os endpoints:
- Rotear por tarefa: `chat`, `planner`, `mentoring`, `pdf_parse`, `classification`.
- Escolher modelo por política de custo/latência/qualidade.
- Fallback automático por erro/quota.
- Log centralizado de custo e qualidade.

Estrutura sugerida:
- `src/lib/ai/gateway.ts`
- `src/lib/ai/providers/openai.ts`
- `src/lib/ai/providers/gemini.ts`
- `src/lib/ai/router.ts`
- `src/lib/ai/schemas.ts`
- `src/lib/ai/metrics.ts`

### 6.2 Structured Outputs

Aplicar JSON estruturado (schema) em rotas críticas:
- `/api/weekly-mentoring`
- `/api/parse-edital`
- futuras rotas de planner e pós-simulado

Objetivo:
- reduzir falhas de parsing
- aumentar confiabilidade para UI e automações

### 6.3 Observabilidade mínima obrigatória

Registrar por chamada:
- `provider`, `model`, `route`, `latencyMs`
- `inputTokens`, `outputTokens`, `estimatedCostUsd`
- `success/failure`, `errorCode`
- `userId`, `planId` (quando aplicável)

Coleção sugerida no Firestore:
- `ai_usage_events`

## 7) Roadmap em Fases (implementação)

### Fase 0 — Base de decisão (1 semana)

Objetivo:
- Medir antes de otimizar.

Entregáveis:
- Instrumentação de tokens/custo/latência nas 3 rotas atuais.
- Dashboard interno de custo por endpoint.
- Definição de KPIs de produto e IA.

Checklist:
- [x] Criar `ai_usage_events`.
- [x] Logar métricas em `/api/chat`, `/api/weekly-mentoring`, `/api/parse-edital`.
- [x] Painel simples (console/admin) com custo diário e taxa de erro.

### Fase 1 — Fundação técnica de IA (2 semanas)

Objetivo:
- Escalar com segurança e baixo risco de lock-in.

Entregáveis:
- AI Gateway com roteamento por tarefa/modelo.
- Structured outputs nas rotas de mentoria e parse.
- Fallback entre provedores.
- Rate limit persistente (não in-memory).

Checklist:
- [x] Implementar `src/lib/ai/*`.
- [x] Migrar rotas para gateway.
- [x] Substituir parse manual de JSON por schema/parse estruturado resiliente.
- [ ] Migrar rate limit para armazenamento compartilhado.

### Fase 2 — Produto premium diário (3 semanas)

Objetivo:
- Criar loop diário de valor.

Entregáveis:
- Nova rota `/api/planner-daily`.
- Card "Plano de Hoje" com CTA direto para iniciar cronômetro.
- Replanejamento automático após sessão salva.

Checklist:
- [x] Definir schema do plano diário (3 a 6 blocos).
- [x] Criar UI com ações de execução (iniciar agora, adiar, concluído).
- [x] Salvar histórico de planos executados.
- [x] Replanejamento automático após sessão salva (com contexto de execução).

### Fase 3 — Pós-simulado premium (3 semanas)

Objetivo:
- Conectar IA diretamente à evolução de nota.

Entregáveis:
- Nova rota `/api/post-simulado`.
- Diagnóstico por matéria + trilha de revisão (24h/72h/7d).
- Ações automáticas para agenda/calendário.

Checklist:
- [ ] Definir ingestão dos dados de prova/tentativas.
- [ ] Gerar plano de recuperação objetivo.
- [ ] Botão "Aplicar plano" para popular calendário.

### Fase 4 — Monetização e embalagem (2 semanas)

Objetivo:
- Converter mais usuários para plano pago.

Entregáveis:
- Limites por plano (Free / Pro / Premium).
- Paywall contextual com valor claro.
- Trial de 7 dias para recursos premium de IA.

Checklist:
- [ ] Definir quotas por recurso (não só por mensagens de chat).
- [ ] Exibir ganho de resultado no paywall.
- [ ] Instrumentar conversão por feature premium.

### Fase 5 — Otimização contínua (contínuo)

Objetivo:
- Melhorar qualidade e margem continuamente.

Entregáveis:
- A/B de modelos por endpoint (GPT vs Gemini).
- Prompt/versionamento com experimentos.
- Alertas de custo e degradação de qualidade.

Checklist:
- [ ] Criar dataset interno de avaliação (casos reais anonimizados).
- [ ] Rodar benchmark mensal de qualidade/custo.
- [ ] Ajustar roteamento automático por performance real.

## 8) KPIs de Sucesso

Produto:
- WAU/MAU
- Retenção D7 e D30
- % usuários que seguem plano diário
- Conversão para Pro/Premium

IA:
- Custo por usuário ativo
- Custo por feature (chat, mentoria, planner, pós-simulado)
- Taxa de erro por endpoint
- Satisfação explícita da resposta (thumb up/down)

Aprendizado:
- Melhora de acurácia em simulados após uso de plano IA
- Redução de matérias "negligenciadas"
- Aumento de aderência à meta semanal

## 9) Backlog Técnico Objetivo

Prioridade alta:
- [ ] AI Gateway unificado com suporte OpenAI + Gemini.
- [ ] Structured outputs para saídas críticas.
- [ ] Observabilidade de custo e tokens por chamada.
- [ ] Rate limit distribuído.

Prioridade média:
- [ ] Persistir memória curta do chat por usuário/plano.
- [ ] Cache de contexto para reduzir tokens repetidos.
- [ ] Guardrails de segurança para respostas fora do escopo.

Prioridade baixa:
- [ ] Fine-tuning de prompts por edital/perfil.
- [ ] Recomendador com bandit para ordenação de blocos de estudo.

## 10) Riscos e Mitigações

Risco: custo subir com uso intenso de chat.
- Mitigação: rotear chat básico para modelo mais barato + caching + limites por plano.

Risco: resposta inconsistente quebrar UX.
- Mitigação: structured outputs + validação + fallback de modelo.

Risco: lock-in de provedor.
- Mitigação: AI Gateway com contratos únicos e troca transparente de provider.

Risco: IA "genérica" sem impacto real em aprovação.
- Mitigação: foco em features executáveis (plano diário, pós-simulado, recuperação) e métricas de resultado.

## 11) Decisão Recomendada Agora

Decisão para iniciar imediatamente:
1. Implementar Fase 0 e Fase 1 (fundação + medição).
2. Em paralelo, construir Fase 2 (Plano Diário Adaptativo) como principal driver de assinatura.
3. Manter estratégia híbrida de modelos por tarefa até benchmark interno fechar vencedor por endpoint.

## 12) Referências Oficiais (preço/modelos)

- OpenAI API Pricing: https://openai.com/api/pricing/
- OpenAI GPT-5 mini: https://developers.openai.com/api/docs/models/gpt-5-mini
- Gemini API Pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini Models: https://ai.google.dev/models/gemini
