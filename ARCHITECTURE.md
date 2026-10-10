# 🏛️ AprovaMind — Arquitetura Global do Ecossistema

> **Documento Oficial de Engenharia & Arquitetura**  
> **Última Atualização:** Outubro de 2026  
> **Versão do Sistema:** `v2.0-omnichannel`  
> **Status:** 🟢 Produção Ativa (Oracle Cloud Always Free + Cloudflare Edge)  
> **Público-Alvo:** Engenheiros de Software, Arquitetos e Agentes de IA Autônomos.

---

## 1. Visão Geral Executiva

O **AprovaMind** é um ecossistema inteligente de alta performance projetado para preparação acelerada em concursos públicos jurídicos de elite (Magistratura, Ministério Público, Defensoria Pública, Delegado de Polícia e Procuradorias).

### 🎯 Princípios Norteadores da Arquitetura
1. **Experiência Omnicanal Fluida**: O estudante pode tirar dúvidas rápidas por áudio/texto no WhatsApp enquanto está na rua; ao sentar no computador, o histórico completo está visível no painel Web com os canais identificados (`📱 WhatsApp` e `💻 Web`).
2. **Fechamento do Dia & Active Recall**: Ao final do dia, a IA sintetiza tudo o que foi debatido, gera alertas de pegadinhas de bancas examinadoras (Caderno de Erros), mapeia artigos de lei seca, recomenda vídeos do YouTube e cria Flashcards de fixação ativa (Verdadeiro ou Falso).
3. **Custo Operacional R$ 0,00 (Oracle Always Free)**: Infraestrutura auto-hospedada em VPS ARM64 (Ampere A1), gerenciada pelo Dokploy, com microsserviços ultraleves em **Go 1.27.2** e **Alpine Linux** (~15 MB de RAM).
4. **Semântica Rigorosa Anti-Alucinação**: Combinação de RAG com busca vetorial (`pgvector`), modelos de raciocínio profundo via OpenRouter (Gemini 2.5 Flash / Llama 3.3 70B) e julgamentos de bom senso programável com **TypeSafe Jev (System One)**.

---

## 2. Inventário de Repositórios e Serviços

| Repositório / Serviço | Stack Principal | Função no Ecossistema | Domínio / Porta |
|---|---|---|---|
| **`aprova-flow`** | Next.js 15, React 19, Tailwind, Firebase Auth | Cockpit Web do Estudante, cronômetro líquido, dashboard de métricas, timeline de resumos e chat web. | `https://www.aprovamind.com.br` |
| **`aprova-core-go`** | Go 1.27.2, Chi Router, OpenRouter, TypeSafe | Microsserviço central de regras de negócio, checagem de entitlements, chat omnicanal, webhooks Hotmart e gerador de digests. | `https://core.aprovamind.com.br` (Porta 8080) |
| **`aprova-mind`** | Python 3.12, FastAPI, Celery, Redis, Whisper | Gateway de WhatsApp, transcrição de áudio via Groq Whisper, classificação de intenções e RAG jurídico. | Container interno (Celery Worker + Webhook) |
| **`Evolution API v2`** | Node.js, Baileys | Gateway de integração direta com a rede do WhatsApp via QR Code / eSIM. | Container Dokploy interno (:8080) |
| **`Supabase (Self-Hosted)`** | PostgreSQL 15, `pgvector`, PostgREST | Banco relacional e vetorial para legislação, usuários, sessões de chat e flashcards. | `supabase-3e57-db` (Porta 5432 / 8000) |
| **`Dokploy + Traefik`** | Docker, Traefik, Dokploy | Orquestrador de contêineres, SSL automático e CI/CD via webhooks. | IP VPS: `144.22.193.41` |

---

## 3. Topologia Global do Ecossistema

```mermaid
flowchart TB
    subgraph Clients["👥 Clientes & Interfaces"]
        StudentWA["📱 Estudante no WhatsApp"]
        StudentWeb["💻 Estudante no Web Cockpit"]
    end

    subgraph Edge["🌐 Camada Edge & DNS"]
        CF["Cloudflare Edge (WAF + SSL + Cache)"]
    end

    subgraph Dokploy["☁️ Oracle Cloud Always Free (Dokploy Host : 144.22.193.41)"]
        Traefik["Traefik Reverse Proxy"]
        
        subgraph WebApp["Front-end Web"]
            NextJS["aprovamind-web\n(Next.js 15 :3000)"]
        end
        
        subgraph GoCore["Microsserviço de Alta Performance"]
            GoAPI["aprova-core-go\n(Go 1.27.2 :8080)"]
        end

        subgraph WAGateway["Serviços WhatsApp & Celery"]
            Evo["Evolution API v2\n(WhatsApp Gateway)"]
            PyAPI["aprova-mind API\n(FastAPI Webhook)"]
            CeleryWorker["Celery Worker\n(Tasks Assíncronas)"]
            RedisCache[("Redis 7 Cache\n(:6379)")]
        end

        subgraph DataTier["Camada de Dados"]
            SupaDB[("Supabase PostgreSQL + pgvector\n(users, chat_sessions, digests, flashcards)")]
        end
    end

    subgraph ExternalSaaS["🔗 Serviços Externos de IA & Pagamentos"]
        Firebase["Google Firebase Auth\n(Identidade & JWKS)"]
        OpenRouter["OpenRouter API\n(Gemini 2.5 Flash / Llama 3.3)"]
        TypeSafe["TypeSafe API\n(Jev System One)"]
        Groq["Groq Cloud\n(Whisper Large v3 Turbo)"]
        Hotmart["Hotmart Webhooks\n(Assinaturas & Cobrança)"]
    end

    %% Fluxos de Usuário
    StudentWA <-->|Mensagens & Áudios| Evo
    StudentWeb <-->|HTTPS| CF
    CF <--> Traefik
    Traefik <--> NextJS
    Traefik <--> GoAPI

    %% WhatsApp Flow
    Evo -->|Webhook POST| PyAPI
    PyAPI -->|Enqueue Task| CeleryWorker
    CeleryWorker <--> RedisCache
    CeleryWorker -->|Transcrição de Áudio| Groq
    CeleryWorker -->|Classificação & Filtros| TypeSafe
    CeleryWorker <-->|RAG & Espelhamento| SupaDB
    CeleryWorker -->|Geração Jurídica| OpenRouter
    CeleryWorker -->|Disparo de Resposta| Evo

    %% Web Flow
    NextJS <-->|Auth Tokens| Firebase
    NextJS -->|Proxy /api/*| GoAPI
    GoAPI -->|Validação JWKS Stateless| Firebase
    GoAPI <-->|Persistência & Digests| SupaDB
    GoAPI -->|Geração Conversacional| OpenRouter
    GoAPI -->|Calibração Semântica| TypeSafe
    Hotmart -->|Webhook Assinatura| GoAPI
```

---

## 4. Fluxo Omnicanal de Conversa (WhatsApp ➔ Web)

O estudante pode interagir alternadamente pelo celular ou pelo computador. O histórico é rigorosamente unificado na tabela `chat_sessions` do Supabase.

```mermaid
sequenceDiagram
    autonumber
    actor Aluno as 📱 Estudante
    participant Evo as Evolution API
    participant Worker as Celery Worker (Python)
    participant Supa as Supabase (chat_sessions)
    participant Go as aprova-core-go (API)
    participant Web as Web Cockpit (ChatPanel)

    %% Cenário 1: Pergunta no WhatsApp
    Aluno->>Evo: Envia dúvida: "O que é excludente de ilicitude?"
    Evo->>Worker: Dispara webhook de mensagem
    Worker->>Worker: Classifica intenção & consulta RAG no pgvector
    Worker->>Aluno: Responde no WhatsApp via Evolution API
    Note over Worker,Supa: Espelhamento concorrente (persist_turn_to_supabase)
    Worker->>Supa: Grava mensagem com channel: "whatsapp"

    %% Cenário 2: Consulta na Web
    Aluno->>Web: Abre o Web Cockpit no navegador
    Web->>Go: GET /api/chat/history (com Bearer Token Firebase)
    Go->>Go: Valida token via JWKS do Firebase
    Go->>Supa: Consulta histórico unificado em chat_sessions
    Supa-->>Go: Retorna mensagens (incluindo as do WhatsApp)
    Go-->>Web: Retorna lista de mensagens
    Note over Web: Exibe balões com badges: 📱 WhatsApp e 💻 Web

    %% Cenário 3: Continuação na Web
    Aluno->>Web: Envia nova dúvida pelo ChatPanel
    Web->>Go: POST /api/chat (payload com mensagem + contexto)
    Go->>Go: Consulta Gemini 2.5 Flash via OpenRouter
    Go-->>Web: Resposta instantânea da IA
    Go->>Supa: Grava turno no banco com channel: "web" (desacoplado)
```

---

## 5. Fechamento do Dia & Flashcards Interativos

O Fechamento do Dia consolida as interações diárias em uma timeline de estudo ativa.

```mermaid
flowchart LR
    subgraph Input["Coleta de Dúvidas"]
        CS[("Supabase\nchat_sessions")]
        DateFilter["Filtro por Data\n(Hoje / Data Selecionada)"]
    end

    subgraph CoreEngine["Engine de Síntese (aprova-core-go)"]
        DigestSvc["DigestGeneratorService"]
        PromptEngine["Prompt Pedagógico grounded"]
        LLM["OpenRouter\n(Gemini 2.5 Flash)"]
        JevJudge["TypeSafe Jev\n(Validação de Rigor)"]
    end

    subgraph Output["Dossiê Estruturado"]
        Resumo["1. Síntese Didática em Markdown"]
        Traps["2. Alertas de Prova (Pegadinhas de Banca)"]
        Artigos["3. Artigos de Lei Seca Citados"]
        Videos["4. Aulas Recomendadas no YouTube"]
        Flashcards["5. Flashcards Ativos (True/False)"]
    end

    subgraph StorageAndUI["Armazenamento & Apresentação"]
        DBDigests[("daily_study_digests\n& daily_flashcards")]
        UIFeed["Web Feed (/resumos)\nTimeline Interativa"]
    end

    CS --> DateFilter --> DigestSvc
    DigestSvc --> PromptEngine --> LLM
    LLM --> JevJudge --> DigestSvc
    DigestSvc --> Resumo & Traps & Artigos & Videos & Flashcards
    Resumo & Traps & Artigos & Videos & Flashcards --> DBDigests
    DBDigests --> UIFeed
```

### Regras do Fechamento do Dia:
1. **Caderno de Erros Inteligente**: Se a dúvida envolvia uma distinção perigosa (ex: *estado de necessidade justificante vs exculpante*), a IA rotula com `Alertas de Prova`.
2. **Lei Seca Mapeada**: Todos os artigos debatidos (ex: *CP, art. 23, 24, 25*) são listados diretamente.
3. **Flashcards de Active Recall**: Cada dúvida dá origem a 3 ou 4 afirmações de Verdadeiro ou Falso. O aluno pode testar seus conhecimentos clicando diretamente no card na Web para validar seu aprendizado.
4. **Favoritos**: O estudante pode marcar com estrela os dias mais importantes para revisar nas vésperas da prova.

---

## 6. Modelo de Dados Unificado (Supabase PostgreSQL)

```mermaid
erDiagram
    USERS ||--o{ CHAT_SESSIONS : "possui"
    USERS ||--o{ DAILY_STUDY_DIGESTS : "possui"
    USERS ||--o{ STUDENT_QUIZ_SUBMISSIONS : "registra"
    DAILY_STUDY_DIGESTS ||--o{ DAILY_FLASHCARDS : "contém"

    USERS {
        uuid id PK
        varchar phone UK
        varchar firebase_uid UK
        varchar target_career
        varchar target_board
        varchar status
        timestamptz created_at
    }

    CHAT_SESSIONS {
        uuid id PK
        uuid user_id FK
        jsonb history "Array de {role, content, channel, timestamp}"
        timestamptz updated_at
    }

    DAILY_STUDY_DIGESTS {
        uuid id PK
        uuid user_id FK
        date date
        varchar title
        text summary_markdown
        text[] tags
        text[] exam_traps
        text[] law_articles
        jsonb video_recommendations
        boolean is_favorite
        timestamptz created_at
    }

    DAILY_FLASHCARDS {
        uuid id PK
        uuid digest_id FK
        uuid user_id FK
        text statement
        boolean is_correct
        text explanation
        boolean user_choice
        timestamptz user_answered_at
    }

    LEGISLATION_CHUNKS {
        bigserial id PK
        varchar law_name
        varchar article_ref
        text content
        vector_1536 embedding
        jsonb metadata
    }

    STUDENT_QUIZ_SUBMISSIONS {
        bigserial id PK
        varchar phone
        varchar selected_option
        varchar official_answer
        boolean is_correct
        float justification_score
        varchar topic
        timestamptz created_at
    }
```

---

## 7. Fluxo de Assinaturas e Entitlements (Hotmart ➔ Go Core)

```mermaid
sequenceDiagram
    autonumber
    actor Comprador as Aluno (Checkout)
    participant Hotmart as Hotmart Pay
    participant Go as aprova-core-go (/billing/webhook/hotmart)
    participant Cache as Entitlements Cache (Go sync.RWMutex)
    participant WA as Bot WhatsApp (Companion)

    Comprador->>Hotmart: Efetua pagamento do Plano Pro / Anual
    Hotmart->>Go: POST com payload de evento (PURCHASE_APPROVED)
    Note over Go: Validação de Segurança via token Hottok
    Go->>Go: Converte evento para domínio Entitlements
    Go->>Cache: Atualiza cache local instantaneamente (sub-ms)
    Go->>WA: Dispara webhook de sincronização companheira
    WA-->>Comprador: Mensagem de boas-vindas no WhatsApp com recursos Pro liberados
    Go-->>Hotmart: 200 OK
```

---

## 8. Segurança e Autenticação

1. **Tokens de Usuário (Firebase Auth)**:
   * O frontend web autentica via Google Popup e obtém um JWT assinado pelo Firebase.
   * O backend em Go (`aprova-core-go`) valida o token utilizando a biblioteca `MicahParks/keyfunc/v3`, que baixa e faz cache automático do JWKS público do Google (`https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`).
   * **Vantagem**: Validação stateless sem chamadas de rede bloqueantes para o Firebase Admin SDK.
2. **Segurança entre Serviços Internos**:
   * Comunicação interna protegida via cabeçalho `x-service-key: aprovamind-secret-service-key-2026`.
3. **Webhooks de Pagamento**:
   * Validação obrigatória do token `Hottok` configurado no painel da Hotmart.

---

## 9. Guia de CI/CD e Deploys Automáticos (Dokploy)

Todos os microsserviços estão conectados por **Webhooks de Deploy Automático** no GitHub. Cada `git push origin main` dispara imediatamente a compilação no Dokploy.

### Configuração de Webhooks no GitHub:
* **`aprova-flow`**: `http://144.22.193.41:3000/api/deploy/compose/9Z2PvBMa1y7BLPhR3OeCu`
* **`aprova-core-go`**: Webhook cadastrado na aba Deployments da aplicação `aprovacorego` no Dokploy.
* **`aprova-mind`**: Webhook cadastrado na aplicação de worker/python no Dokploy.

### Padrão de Build em Produção:
* **Frontend Web (`Dockerfile.web`)**: Multi-stage build com Node 20 Alpine, gerando saída standalone do Next.js.
* **Backend Go (`Dockerfile`)**:
  ```dockerfile
  FROM golang:1.27-alpine AS builder
  WORKDIR /app
  COPY go.mod go.sum ./
  RUN go mod download
  COPY . .
  RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/api ./cmd/api

  FROM alpine:latest
  RUN apk --no-cache add ca-certificates tzdata
  COPY --from=builder /app/bin/api /app/api
  EXPOSE 8080
  CMD ["/app/api"]
  ```

---

## 10. Manual de Diagnóstico Rápido (Runbook)

### 1. Testar Saúde da API Go:
```bash
curl -i https://core.aprovamind.com.br/health
# Resposta esperada: HTTP/2 200 OK -> {"runtime":"go","service":"aprova-core-go","status":"ok"}
```

### 2. Testar Validação de Entitlements no Go Core:
```bash
curl -i -X POST https://core.aprovamind.com.br/api/entitlements/check \
  -H "x-service-key: aprovamind-secret-service-key-2026" \
  -H "Content-Type: application/json" \
  -d '{"feature":"mentor_ia"}'
# Resposta esperada: HTTP/2 200 OK -> {"decision":{...},"success":true}
```

### 3. Testar Rota da Timeline de Estudos no Web App:
```bash
curl -I https://www.aprovamind.com.br/resumos
# Resposta esperada: HTTP/2 200 OK
```

### 4. Forçar Deploy Manual do Web App via Webhook:
```bash
curl -i -X POST \
  -H "Content-Type: application/json" \
  -H "x-github-event: push" \
  -d '{"ref":"refs/heads/main"}' \
  http://144.22.193.41:3000/api/deploy/compose/9Z2PvBMa1y7BLPhR3OeCu
```

---

*Documento mantido pela equipe de Engenharia do AprovaMind. Toda alteração de rotas ou esquemas de banco deve ser refletida neste arquivo nos 3 repositórios.*
