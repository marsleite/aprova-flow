# Feature Specification: Save AI Focus Schedule (Persistência do Cronograma de Foco)

**Feature Branch**: `005-save-ai-schedule`  
**Created**: 2026-05-19  
**Status**: Draft  
**Input**: User description: "Persistir o cronograma de foco gerado pela IA no banco de dados para evitar perda ao atualizar a pagina"

## Constitution Alignment *(mandatory)*

- **Architecture Impact**: `apps/web` (Modificações no componente `SmartScheduleCard.tsx`, nova biblioteca Firestore `apps/web/src/lib/firebase/smartSchedules.ts` ou similar, e rota do Next.js `/api/smart-schedule` se necessária, ou persistência direta pelo cliente).
- **Server-Side / AI / Entitlements Impact**: Nenhum impacto direto sobre chaves ou entitlements. O limite semanal de execuções de IA (`smart-schedule` quota) continua sendo validado e controlado no middleware da API Next.js.
- **Risk-Based Test Strategy**:
  - Testes unitários para a camada de persistência (Firestore mock/leitura/gravação).
  - Testes de integração/E2E simulando o fluxo de geração, recarregamento de página e verificação da persistência na tela `/dashboard`.
- **Documentation Impact**: Atualização das tabelas de dados do Firestore em `docs/architecture/current-architecture.md` para incluir a nova coleção `weekly_smart_schedules`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Carregamento Automático do Cronograma Salvo (Priority: P1)

Como um estudante ativo na plataforma, quero que o meu cronograma de foco previamente gerado seja exibido automaticamente ao abrir o `/dashboard`, para que eu não precise recalculá-lo toda vez que recarregar a página ou navegar pelo sistema.

**Why this priority**: Esta é a funcionalidade principal da persistência e resolve diretamente a dor do usuário de perder o cronograma ao atualizar a página.

**Independent Test**: Pode ser testado gerando um cronograma pela primeira vez, recarregando a página (F5) e verificando se os blocos recomendados e motivos continuam visíveis na interface sem exibir o estado inicial "Gerar".

**Acceptance Scenarios**:

1. **Given** que o usuário está autenticado e possui um cronograma salvo para a semana atual no Firestore, **When** o usuário acessa o `/dashboard`, **Then** o sistema deve carregar e exibir os blocos de estudos gerados com seus respectivos motivos e horas.
2. **Given** que o usuário está autenticado e **não** possui um cronograma para a semana atual, **When** ele acessa o `/dashboard`, **Then** o sistema deve exibir o estado inicial do cartão com a opção de "Gerar" o cronograma.

---

### User Story 2 - Salvamento Automático pós-Geração (Priority: P1)

Como um estudante ativo, quero que o cronograma gerado pela IA seja salvo automaticamente no banco de dados assim que a geração for concluída com sucesso, para que eu não precise me preocupar com ações manuais de salvamento.

**Why this priority**: Garante uma experiência contínua sem atrito de uso e previne perda acidental se o usuário fechar a aba imediatamente após a geração.

**Independent Test**: Gerar o cronograma de foco via interface, verificar se a gravação ocorreu com sucesso no Firestore associando o ID do usuário e a segunda-feira da semana atual como chave primária temporal.

**Acceptance Scenarios**:

1. **Given** que o usuário clica no botão "Gerar", **When** a API `/api/smart-schedule` responde com sucesso com as alocações da IA, **Then** o sistema deve gravar essas alocações no Firestore sob o ID do usuário e a data de início da semana (segunda-feira).
2. **Given** que o usuário clica em "Recalcular", **When** a IA gera uma nova versão do cronograma, **Then** o sistema deve sobrescrever a versão anterior gravada no Firestore para a semana atual.

---

### Edge Cases

- **Semana incompleta ou transição de semana**: O que acontece quando o usuário gera o cronograma no domingo de noite para a semana atual, e no dia seguinte (segunda-feira) acessa a tela?
  - *Comportamento desejado*: O sistema define a semana ativa com base na segunda-feira correspondente à data atual (do cliente). Se a data mudou para uma nova semana, um novo cronograma precisa ser gerado (estado "Gerar"). Cronogramas passados não são exibidos no painel principal da semana corrente.
- **Falha na gravação do banco de dados (Offline)**: Como o sistema lida se o usuário gerar um cronograma mas o Firestore falhar/estiver offline?
  - *Comportamento desejado*: O cronograma gerado é mantido em memória no estado do React para o usuário poder visualizar imediatamente, mas um aviso visual amigável (toast ou banner discreto) é exibido informando "Não foi possível salvar seu cronograma no banco de dados. Ele estará disponível apenas nesta sessão".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST identificar a semana atual usando a data da segunda-feira correspondente (ISO YYYY-MM-DD) do fuso horário local do usuário.
- **FR-002**: O sistema MUST salvar o cronograma na nova coleção do Firestore `weekly_smart_schedules` com os campos: `userId`, `planId`, `weekStart`, `schedule` (array de dias, horas e matérias), `generatedAt` e `updatedAt`.
- **FR-003**: O sistema MUST carregar silenciosamente o cronograma salvo ao montar o componente `SmartScheduleCard`.
- **FR-004**: O sistema MUST atualizar o Firestore automaticamente sempre que uma nova geração de IA (ou recalcular) for executada com sucesso.
- **FR-005**: O sistema MUST isolar os cronogramas por `planId` (edital ativo), permitindo que se o usuário alterar o plano de estudo padrão/ativo, um cronograma diferente seja carregado e persistido de forma independente.

### Key Entities *(include if feature involves data)*

- **WeeklySmartSchedule**:
  - `id` (string): Identificador único do documento (geralmente gerado no formato `userId_planId_weekStart` para acesso direto otimizado).
  - `userId` (string): ID do usuário dono do cronograma.
  - `planId` (string): ID do edital/plano de estudos ativo associado.
  - `weekStart` (string): String ISO da data de segunda-feira daquela semana (`YYYY-MM-DD`).
  - `schedule` (Array): Lista estruturada do cronograma contendo dia, total de horas e matérias com horas individuais e motivos.
  - `generatedAt` (string): Timestamp ISO de geração.
  - `updatedAt` (string): Timestamp ISO de atualização.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos usuários com cronogramas gerados na semana atual visualizam seu plano imediatamente ao carregar o `/dashboard` em menos de `1.5 segundos` (tempo de fetch no Firestore).
- **SC-002**: Reduzir a zero (0%) a necessidade de recalcular ou gerar o plano repetidas vezes no mesmo dia devido a atualização de página ou mudança de tela.
- **SC-003**: Garantir isolamento perfeito dos cronogramas ao trocar de plano ativo na tela de configurações do usuário.

## Assumptions

- Presume-se que o usuário tenha um edital ativo selecionado para que o cronograma possa ser associado a um `planId`. Se não houver plano ativo, usa-se um fallback de ID genérico (ex: `"default"` ou plano padrão do usuário).
- Presume-se que a gravação direta no Firestore a partir do cliente (Client SDK) é segura e viável, respeitando as regras de segurança existentes onde o usuário só pode ler/gravar seus próprios documentos.

## Exceptions & Justifications

- *Nenhuma exceção identificada.*
