# Guia para Implementar Pipeline LangChain no AprovaMind

Este documento descreve como construir um microserviço baseado em LangChain para analisar editais/PDFs e extrair dados estruturados (matérias, pesos, metas). Também inclui um prompt completo para futuros agentes IA gerarem o repositório automaticamente.

> Status (Fev/2026): guia de referência para serviço externo opcional. O app Next.js atual não depende deste pipeline para rodar em produção.

---

## 1. Visão Geral

- **Objetivo:** extrair informações de editais (PDF) e devolver JSON com matérias + pesos + meta semanal.
- **Arquitetura:** serviço separado do app principal (Next.js). Pode ser FastAPI (Python) ou Express (Node) consumido via API.
- **Pipeline (RAG):**
  1. Upload do PDF
  2. OCR (se necessário) + limpeza
  3. Chunking com sobreposição
  4. Embeddings + Vector Store (Chroma)
  5. Retrieval + LLM open-source (Llama3 via Ollama)
  6. Resposta estruturada em JSON

---

## 2. Stack Recomendada

| Camada           | Opção                           | Motivo |
|------------------|----------------------------------|--------|
| Linguagem        | Python 3.11+                     | Melhor suporte a loaders/OCR
| Framework        | FastAPI + Uvicorn                | API simples e performática
| Loader PDF       | `PyPDFLoader` (langchain)        | Lê texto nativo
| OCR              | `pytesseract` + `pdfplumber`     | Para PDFs escaneados
| Text Splitter    | `RecursiveCharacterTextSplitter` | Mantém contexto
| Embeddings       | `sentence-transformers/all-MiniLM-L6-v2` | Open-source, rápido
| Vector Store     | `Chroma` (persist_directory)     | Zero custo, fácil uso
| LLM              | `llama3` via `ollama`            | Local e gratuito
| Orquestração     | `langchain`, `langchain-community` | Blocos prontos 

Dependências (principal):
```
pip install "langchain==0.2.*" "langchain-community==0.2.*" chromadb \
            sentence-transformers pdfplumber pytesseract pillow fastapi uvicorn
pip install python-multipart  # uploads
```
Ferramentas extras:
- Instalar [Ollama](https://ollama.com) e rodar `ollama pull llama3`.
- Tesseract: `brew install tesseract` (mac) ou `sudo apt install tesseract-ocr` (Linux).

---

## 3. Estrutura do Repositório (sugerida)

```
aprova-langchain/
├── app.py                    # FastAPI: upload + delega pipeline
├── pipelines/
│   └── parse_edital.py       # Função principal de parsing
├── loaders/
│   └── edital_loader.py      # Helpers de OCR/limpeza (opcional)
├── vectorstore/
│   └── chroma/               # Persistência do Chroma
├── requirements.txt
└── README.md
```

---

## 4. Pipeline Passo a Passo

### 4.1. Upload
- End-point `POST /parse-edital`
- Recebe `UploadFile` (FastAPI) ou `multipart/form-data` (Node).
- Salva temporariamente para processamento (usar `tempfile`).

### 4.2. Loader + OCR
- Use `PyPDFLoader`. Se `page.extract_text()` vier vazio, rodar OCR com `pdfplumber` + `pytesseract`.
- Armazene metadados (número da página, título).

### 4.3. Limpeza
- Remover cabeçalhos/rodapés repetitivos.
- Normalizar espaços, corrigir encoding.

### 4.4. Chunking
```python
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=150,
    separators=["\n\n", "\n", ".", " "]
)
chunks = splitter.split_documents(pages)
```

### 4.5. Embeddings + Vetor
```python
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
vector_store = Chroma.from_documents(chunks, embeddings, persist_directory="./vectorstore/chroma")
retriever = vector_store.as_retriever(search_kwargs={"k": 6})
```

### 4.6. LLM + Chain
```python
llm = ChatOllama(model="llama3", temperature=0.1)
prompt = """Você é um assistente...
Responda somente em JSON: {
  \"metaSemanalHoras\": number,
  \"materias\": [{ \"nome\": string, \"pesoPercentual\": number }]
}.
"""

chain = RetrievalQA.from_chain_type(
    llm,
    retriever=retriever,
    chain_type="stuff",
    chain_type_kwargs={"prompt": prompt}
)
result = chain({"query": "Liste matérias, pesos e meta semanal do edital."})
```

### 4.7. Validação e Retorno
- Fazer `json.loads(result["result"])`.
- Se falhar, pedir “Reformule em JSON válido”.
- Retornar JSON para o Next.js salvar no Firestore.

---

## 5. Boas Práticas
1. **Persistência no Chroma**: evita reprocessar mesmo PDF (use hash MD5 do arquivo).
2. **Limitar tamanho**: rejeite PDFs > 20 MB ou > 500 páginas para evitar travar worker.
3. **Logging/Observabilidade**: use callbacks do LangChain ou `langsmith` para rastrear latência.
4. **Segurança**: sanitize uploads, delete arquivos temporários após uso.
5. **Fallback**: se LLM não encontrar dados, retorne campos vazios com mensagem para revisão manual.
6. **Testes**: mantenha um diretório `samples/` com editais reais para regressão.

---

## 6. Prompt para Agente IA (gerar repo automaticamente)
Use este prompt quando quiser que um agente (ex.: GitHub Copilot Workspace, Cursor Composer) crie o repositório `aprova-langchain`:

```
Você é responsável por criar um repositório chamado "aprova-langchain" para o projeto AprovaMind.
Objetivo: microserviço FastAPI que recebe um PDF de edital e retorna JSON com matérias, pesos e meta semanal.

Requisitos obrigatórios:
1. Linguagem: Python 3.11+. Use FastAPI + Uvicorn.
2. Dependências no requirements.txt: langchain==0.2.*, langchain-community==0.2.*, chromadb,
   sentence-transformers, pdfplumber, pytesseract, pillow, fastapi, uvicorn, python-multipart.
3. Estrutura de pastas:
   - app.py (FastAPI com endpoint POST /parse-edital)
   - pipelines/parse_edital.py (função parse_edital(file_path: str) -> dict)
   - vectorstore/chroma/ (adicione .gitkeep)
   - README.md (explicando setup, dependências, como rodar, exemplo de request)
4. Pipeline em parse_edital.py deve:
   a) Carregar PDF com PyPDFLoader.
   b) Rodar OCR em páginas sem texto usando pytesseract (crie helper em loaders/ se quiser).
   c) Limpar texto e fazer chunking com RecursiveCharacterTextSplitter (1000/150).
   d) Gerar embeddings com sentence-transformers/all-MiniLM-L6-v2.
   e) Persistir no Chroma (./vectorstore/chroma) e criar retriever (k=6).
   f) Usar ChatOllama(model="llama3", temperature=0.1) com prompt exigindo JSON.
   g) Executar RetrievalQA e retornar JSON estruturado (metaSemanalHoras + lista de matérias e pesos).
   h) Validar JSON (usar json.loads). Se falhar, pedir reformatação ao modelo.
5. app.py deve:
   - Expor POST /parse-edital recebendo arquivo PDF (UploadFile).
   - Salvar arquivo temporário (tempfile).
   - Chamar parse_edital e retornar JSON.
   - Limpar arquivo após processamento.
6. README precisa incluir:
   - Passos para instalar dependências.
   - Instruções para instalar Tesseract e Ollama (com `ollama pull llama3`).
   - Comando para rodar: `uvicorn app:app --reload --port 8001`.
   - Exemplo de request CURL com PDF e de resposta JSON.
7. Adicione script `make run` (opcional) ou instruções claras para rodar o servidor.
8. Inclua `.env.example` se precisar de configs futuras (por enquanto pode estar vazio).
9. Garanta que o projeto passa em `ruff check` ou `flake8` básico (opcional, mas preferível).
10. Após gerar o repo, explique como integrar com o Next.js (consumir endpoint e salvar no Firestore).

Saída esperada: repositório completo com os arquivos mencionados, prontos para rodar.
```

---

## 7. Próximos Passos
1. Criar repositório `aprova-langchain` usando o prompt acima.
2. Testar localmente com um PDF real.
3. Integrar com Next.js (rota `/api/parse-edital` → worker FastAPI → Firestore).
4. Opcional: configurar CI básico (lint/test) e deploy em Railway/Fly.io.

Pronto! Este guia + prompt servem como blueprint para você (ou outro agente IA) criar o serviço LangChain sempre que precisar. Boa construção!
