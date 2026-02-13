# AprovaFlow

Plataforma inteligente de estudo para concursos. Rastreie horas líquidas de estudo, visualize seu progresso por matéria e mantenha a consistência nos estudos.

## Stack Técnica

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Estilização:** Tailwind CSS + Lucide React (ícones)
- **Backend:** Firebase (Authentication + Firestore)
- **Gráficos:** Recharts (preparado para Radar e Barras)
- **IA:** Integração futura com Google Gemini API

## Funcionalidades

- **Login social** com Google via Firebase Auth
- **Cronômetro inteligente** com cálculo de horas líquidas (Page Visibility API)
- **Pausa automática** quando a aba fica inativa
- **Dashboard** com resumo diário, semanal e mensal
- **Seleção de matérias** padrão para concursos

## Como Iniciar

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Ative **Authentication** > **Google** como provedor de login
3. Crie um banco **Firestore Database**
4. Adicione um **app Web** e copie as credenciais
5. Copie `.env.local.example` para `.env.local` e preencha:

```bash
cp .env.local.example .env.local
```

### 3. Rodar o projeto

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## Estrutura do Projeto

```
src/
├── app/
│   ├── globals.css          # Estilos globais (dark mode)
│   ├── layout.tsx           # Layout raiz
│   └── page.tsx             # Página principal (Login/Dashboard)
├── components/
│   ├── Dashboard.tsx         # Dashboard principal
│   ├── Header.tsx            # Header com logo e logout
│   ├── LoginScreen.tsx       # Tela de login
│   ├── StudyTimer.tsx        # Cronômetro de estudo
│   └── SummaryCards.tsx      # Cards de resumo
├── contexts/
│   └── AuthContext.tsx       # Contexto de autenticação
├── hooks/
│   ├── useAuth.ts            # Hook de autenticação Firebase
│   └── useStudyTimer.ts      # Hook do cronômetro (Page Visibility API)
├── lib/
│   ├── firebase/
│   │   ├── config.ts         # Configuração do Firebase
│   │   └── sessions.ts       # CRUD de sessões no Firestore
│   └── utils.ts              # Funções utilitárias
└── types/
    └── index.ts              # Tipos TypeScript
```

## Schema do Firestore

**Coleção:** `sessions`

| Campo      | Tipo   | Descrição                          |
|------------|--------|------------------------------------|
| userId     | string | UID do usuário                     |
| subject    | string | Matéria estudada                   |
| subtopic   | string | Subtópico (opcional)               |
| startTime  | string | ISO String do início               |
| endTime    | string | ISO String do fim                  |
| duration   | number | Duração líquida em segundos        |
| date       | string | Data (YYYY-MM-DD)                  |
| createdAt  | string | Timestamp de criação               |

## Horas Líquidas — Como Funciona

O cronômetro usa a **Page Visibility API** do navegador para garantir que apenas tempo ativo de estudo seja contabilizado:

1. Quando o usuário inicia o cronômetro, o tempo começa a contar
2. Se a aba ficar **inativa** (troca de aba, minimizar), o timer **pausa automaticamente**
3. Ao **retornar** para a aba, o timer **retoma** de onde parou
4. Ao parar, apenas o tempo líquido é salvo no Firestore

## Próximos Passos

- [ ] Gráfico de Radar por matéria (Recharts)
- [ ] Gráfico de Barras — evolução semanal
- [ ] Integração com Google Gemini para sugestões de estudo
- [ ] Histórico detalhado de sessões
- [ ] Edição/exclusão de sessões
- [ ] PWA (Progressive Web App) para uso mobile
