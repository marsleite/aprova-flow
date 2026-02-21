# Classificação de Matérias por IA - Processo e Refinamento

**Data:** 17 de fevereiro de 2026  
**Contexto:** Importação e classificação das provas TRF1 Juiz Federal 2024

> Status atual do repositório: este documento é histórico. Os scripts operacionais citados aqui não fazem mais parte deste projeto Next.js e devem ser tratados como fluxo externo/server-side.

---

## Problema Identificado

Após a primeira importação das questões TRF1, identificamos que as matérias estavam com problemas:

### Sintomas Iniciais
- **Matérias duplicadas/compostas**: Ex: "Direito Constitucional, Direito", "Direito Civil, Direito Processual"
- **Origem do problema**: O parser estava capturando o texto completo dos blocos do PDF (que listam múltiplas matérias) e atribuindo tudo como uma única matéria
- **Impacto**: Filtros no Treino Rápido não funcionariam corretamente (match exato entre dropdown e banco)

### Exemplo do PDF
```
Bloco I - Direito Constitucional, Direito Previdenciário, 
Direito Penal, Direito Processual Penal e Direito Econômico 
e de Proteção ao Consumidor
```

Todas as questões do Bloco I recebiam essa string completa como matéria.

---

## Solução Implementada

### Decisão: Classificação por IA
Optamos por usar **classificação automática com IA local (Ollama + Llama3)** para analisar cada questão individualmente e inferir a matéria correta.

**Alternativas descartadas:**
1. ❌ Usar apenas primeira matéria do bloco (perda de granularidade)
2. ❌ Manter blocos compostos (poluído e não funcional para filtros)
3. ✅ **Classificação por IA** (mais preciso, preserva especificidade)

---

## Processo de Classificação

### Primeira Rodada - Classificação Inicial

**Script:** `parse_exam.py` com flag `--classify`

**Comando executado:**
```bash
python parse_exam.py \
  --prova ./data/provas/trf1/trf1-t1.pdf \
  --gabarito ./data/provas/trf1/trf1-gabaritos-para-publicacao.pdf \
  --output ./data/output/trf1-t1.json \
  --nome "TRF1 Juiz Federal 2024 - Tipo 1" \
  --banca "FGV" --ano 2024 --duracao 300 --columns 2 --tipo 1 \
  --classify --classify-provider ollama --classify-model llama3
```

**Modificação no código:**
```python
# parse_exam.py linha 277 (ANTES)
_, inferred_subtema = classify_question(...)
subtema = inferred_subtema or subtema

# parse_exam.py linha 277 (DEPOIS)
inferred_materia, inferred_subtema = classify_question(...)
materia = inferred_materia or materia  # Agora usa matéria inferida
subtema = inferred_subtema or subtema
```

**Resultado da primeira rodada:**
- ✅ 285 questões classificadas especificamente (73.5%)
- ⚠️ 103 questões permaneceram genéricas como "Direito" (26.5%)

**Distribuição por tipo:**
- Tipo 1: 24 questões genéricas
- Tipo 2: 29 questões genéricas
- Tipo 3: 25 questões genéricas
- Tipo 4: 25 questões genéricas

---

### Segunda Rodada - Refinamento em Lotes

Para as 103 questões genéricas restantes, criamos um script específico com processamento em lotes.

**Script:** `reclassify_batch.py`

**Características:**
- Processa apenas questões marcadas como "Direito" genérico
- Lotes de 10 questões por vez (controle de progresso)
- Prompt mais curto e direto
- Temperature: 0.1 (mais determinístico)
- Sleep de 0.5s entre requests (evita sobrecarga)

**Comandos executados:**
```bash
# Tipo 1 - 24 questões genéricas
python reclassify_batch.py 1 0 10   # Questões 1-10
python reclassify_batch.py 1 10 10  # Questões 11-20
python reclassify_batch.py 1 20 10  # Questões 21-24

# Tipo 2 - 29 questões genéricas
python reclassify_batch.py 2 0 10
python reclassify_batch.py 2 10 10
python reclassify_batch.py 2 20 10

# Tipo 3 - 25 questões genéricas
python reclassify_batch.py 3 0 10
python reclassify_batch.py 3 10 10
python reclassify_batch.py 3 20 10

# Tipo 4 - 25 questões genéricas
python reclassify_batch.py 4 0 10
python reclassify_batch.py 4 10 10
python reclassify_batch.py 4 20 10
```

**Resultado da segunda rodada:**
- ✅ 63 questões reclassificadas (61%)
- ⚠️ 40 questões ainda genéricas (39% das restantes, 10% do total)

---

### Terceira Rodada - Classificação Final Assertiva

Para as últimas 40 questões (10 por tipo), criamos um script com prompt ainda mais assertivo e específico.

**Script:** `reclassify_final.py`

**Melhorias no prompt:**
- Instrução explícita: "NÃO retorne 'Direito' genérico"
- Lista completa de matérias válidas no prompt
- Truncamento do enunciado (primeiras 500 chars) + 3 primeiras alternativas
- Temperature: 0.05 (máximo determinismo)
- Top_p: 0.9
- Múltiplas estratégias de match (exato, parcial, keywords)

**Código de fallback para match:**
```python
# Match robusto com fallbacks
for mat in materias_validas:
    if mat.lower() in result.lower() or result.lower() in mat.lower():
        return mat

# Fallback por keywords
if "constitucional" in result.lower():
    return "Direito Constitucional"
elif "administrativo" in result.lower():
    return "Direito Administrativo"
# ... etc
```

**Comandos executados:**
```bash
python reclassify_final.py 1  # 10 questões do Tipo 1
python reclassify_final.py 2  # 10 questões do Tipo 2
python reclassify_final.py 3  # 10 questões do Tipo 3
python reclassify_final.py 4  # 10 questões do Tipo 4
```

**Resultado da terceira rodada:**
- 🎉 **40/40 questões reclassificadas com sucesso (100%)**
- ✅ **Zero questões genéricas restantes**

---

## Resultado Final

### Estatísticas Consolidadas
**Total:** 388 questões (4 tipos × 97 questões)

| Matéria                     | Questões | %     |
|-----------------------------|----------|-------|
| Direito Constitucional      | 64       | 16.5% |
| Direito Administrativo      | 64       | 16.5% |
| Direito Civil               | 60       | 15.5% |
| Direito Processual Civil    | 28       | 7.2%  |
| Direito Processual Penal    | 26       | 6.7%  |
| Direito Penal               | 23       | 5.9%  |
| Direitos Humanos            | 23       | 5.9%  |
| Direito Previdenciário      | 20       | 5.2%  |
| Direito Tributário          | 19       | 4.9%  |
| Direito Internacional       | 13       | 3.4%  |
| Direito Ambiental           | 12       | 3.1%  |
| Direito Empresarial         | 6        | 1.5%  |
| Direito Comercial           | 5        | 1.3%  |
| Outros (Constituição, Trabalho, etc.) | 25 | 6.4% |

### Taxa de Sucesso
- **100%** das questões classificadas especificamente
- **0** questões genéricas
- **15 matérias** distintas identificadas

---

## Integração com o App

### Dropdown Dinâmico
Implementamos carregamento dinâmico das matérias no componente Treino Rápido:

**Função criada:** `getAvailableSubjects()` em `src/lib/firebase/questions.ts`

```typescript
export async function getAvailableSubjects(): Promise<string[]> {
  const snapshot = await getDocs(collection(db, QUESTIONS_COLLECTION));
  const subjects = new Set<string>();
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.materia) {
      subjects.add(data.materia);
    }
  });
  
  return Array.from(subjects).sort();
}
```

**Componente:** `TreinoRapidoTab` em `src/app/provas/page.tsx`
- Carrega matérias ao montar o componente
- Popula dropdown com matérias reais do banco
- Filtro agora funciona com match exato

---

## Scripts Criados

### 1. `reclassify_batch.py`
**Localização:** `/Users/marleite/workspace/aprova-script/reclassify_batch.py`

**Propósito:** Reclassificar questões genéricas em lotes controláveis

**Uso:**
```bash
python reclassify_batch.py <tipo> <start_index> <batch_size>
```

**Exemplo:**
```bash
python reclassify_batch.py 1 0 10  # Processa questões 0-9 do tipo 1
```

### 2. `reclassify_final.py`
**Localização:** `/Users/marleite/workspace/aprova-script/reclassify_final.py`

**Propósito:** Reclassificação final assertiva para questões difíceis

**Uso:**
```bash
python reclassify_final.py <tipo>
```

**Exemplo:**
```bash
python reclassify_final.py 1  # Reclassifica todas as genéricas do tipo 1
```

### 3. `delete_all_trf1.ts`
**Localização:** fluxo externo/server-side (não versionado neste repositório)

**Propósito:** Remove todos os exames TRF1 do Firestore (limpeza antes de reimportação)

**Uso:**
```bash
# Executar no ambiente externo de ingestão/admin
```

### 4. `clean_duplicates.ts`
**Localização:** fluxo externo/server-side (não versionado neste repositório)

**Propósito:** Remove exames duplicados mantendo apenas primeira ocorrência

**Uso:**
```bash
# Executar no ambiente externo de ingestão/admin
```

---

## Fluxo Completo de Reimportação

### Passo 1: Parsear e Classificar
```bash
cd /Users/marleite/workspace/aprova-script

for tipo in 1 2 3 4; do
  python parse_exam.py \
    --prova ./data/provas/trf1/trf1-t${tipo}.pdf \
    --gabarito ./data/provas/trf1/trf1-gabaritos-para-publicacao.pdf \
    --output ./data/output/trf1-t${tipo}.json \
    --nome "TRF1 Juiz Federal 2024 - Tipo ${tipo}" \
    --banca "FGV" --ano 2024 --duracao 300 --columns 2 --tipo ${tipo} \
    --classify --classify-provider ollama --classify-model llama3
done
```

### Passo 2: Verificar Questões Genéricas
```bash
python - <<'PY'
import json
for tipo in [1, 2, 3, 4]:
    with open(f'data/output/trf1-t{tipo}.json', 'r') as f:
        data = json.load(f)
    genericas = sum(1 for q in data['questions'] if q['materia'] == 'Direito')
    print(f'Tipo {tipo}: {genericas} questões genéricas')
PY
```

### Passo 3: Reclassificar Genéricas (se necessário)
```bash
# Lotes de 10 questões por vez
for tipo in 1 2 3 4; do
  python reclassify_batch.py ${tipo} 0 10
  python reclassify_batch.py ${tipo} 10 10
  python reclassify_batch.py ${tipo} 20 10
done

# Rodada final assertiva
for tipo in 1 2 3 4; do
  python reclassify_final.py ${tipo}
done
```

### Passo 4: Limpar Firestore
Executar no pipeline/admin externo com credenciais de serviço (fora deste app Next.js).

### Passo 5: Importar JSONs Corrigidos
Executar no pipeline/admin externo que publica em `exams` e `questions_bank`.

---

## Lições Aprendidas

### O Que Funcionou Bem
1. **Abordagem iterativa**: Três rodadas de refinamento progressivo foram mais eficazes que uma única tentativa
2. **Processamento em lotes**: Permitiu controle de progresso e debugging
3. **Prompt engineering**: Refinamento gradual do prompt melhorou dramaticamente os resultados
4. **Temperature baixo**: 0.05-0.1 gerou classificações mais consistentes e confiáveis
5. **Fallback robusto**: Múltiplas estratégias de match garantiram que nenhuma questão fosse perdida

### O Que Poderia Melhorar
1. **Cache de classificações**: Evitar reclassificar questões já corretas
2. **Validação humana**: Sample aleatório para validar precisão da IA
3. **Métricas de confiança**: Ollama retorna probabilidades que poderiam ser usadas
4. **Paralelização**: Processar múltiplas questões em paralelo (respeitando rate limits)

### Para Próximas Importações
1. **Verificar blocos no PDF**: Se possível, extrair matérias individualmente por questão
2. **Usar classificação desde o início**: Não esperar ter problemas, já aplicar IA preventivamente
3. **Documentar exceções**: Questões interdisciplinares ou edge cases
4. **Criar testes**: Validar que filtros funcionam após importação

---

## Requisitos e Dependências

### Software Necessário
- **Ollama** rodando localmente (serve em `http://localhost:11434`)
- **Modelo Llama3** instalado (`ollama pull llama3`)
- **Node.js** + TypeScript para scripts de importação
- **Python 3.x** para scripts de parsing e classificação
- **Firebase Admin SDK** configurado

### Variáveis de Ambiente (Firestore)
```bash
FIREBASE_ADMIN_PROJECT_ID=track-84c17
FIREBASE_ADMIN_CLIENT_EMAIL=<da-service-account>
FIREBASE_ADMIN_PRIVATE_KEY=<da-service-account>
```

### Tempo Estimado
- **Parsing inicial** (4 tipos): ~5 min
- **Classificação IA primeira rodada** (388 questões): ~20-25 min
- **Refinamento lotes** (103 questões): ~10 min
- **Classificação final** (40 questões): ~4 min
- **Limpeza e reimportação Firestore**: ~2 min

**Total:** ~40-45 minutos para processo completo

---

## Validação Final

### Checklist de Qualidade
- [x] Zero questões com matéria "Direito" genérico
- [x] Zero questões com matérias compostas duplicadas
- [x] Distribuição realista entre matérias (top 3 com ~16% cada)
- [x] Todas as 388 questões importadas no Firestore
- [x] Dropdown dinâmico carrega matérias corretas
- [x] Filtro por matéria funciona com match exato

### Teste Manual
1. Acessar `/provas` no app
2. Clicar na aba "Treino Rápido"
3. Abrir dropdown de "Matéria"
4. Verificar que aparecem 15 matérias específicas (sem "Direito" genérico)
5. Selecionar uma matéria e clicar "Começar Treino"
6. Validar que questões retornadas são da matéria selecionada

---

## Contato e Manutenção

**Responsável:** Processo documentado em 17/02/2026  
**Repositório web:** `/Users/marleite/workspace/aprova-flow`  
**Pipeline de ingestão:** mantido externamente ao app web

Para dúvidas ou problemas, consultar:
- Este documento
- Repositório/pipeline externo de ingestão
- Código de classificação IA do pipeline externo
