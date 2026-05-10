# Feature Specification: App-Wide AI and Flow Stabilization

**Feature Branch**: `003-fix-ai-app-flow`  
**Created**: 2026-05-10  
**Status**: Draft  
**Input**: User description: "Prover consertos em todo o app a partir dos problemas observados nas telas: uso de IA falhando com erro interno, botao Gerar Plano Diario desabilitado/inacessivel apos registrar sessoes, avaliar se no inicio vale manter chat IA pelo custo, Revisao Geral levando para pagina Engine com estado vazio e botao Gerenciar Editais, e verificar pelo navegador todas as telas em localhost cobrindo web e api."

## Constitution Alignment *(mandatory)*

- **Architecture Impact**: `apps/web`, `apps/api`, `packages/application`, `packages/contracts`, and AI-related orchestration boundaries.
- **Server-Side / AI / Entitlements Impact**: Impacts AI routes, provider failure handling, user-facing fallback behavior, cost controls, usage limits, and entitlement messaging for AI-powered actions.
- **Risk-Based Test Strategy**: Requires automated coverage for AI failure states, daily plan eligibility, manual session registration effects, active edital gating, and navigation outcomes. Requires browser-based validation across localhost web screens and API health/AI endpoints using realistic empty, partial, and populated data states.
- **Documentation Impact**: Update `docs/architecture/current-architecture.md` or equivalent operational notes if AI chat availability, AI cost policy, or Engine gating changes user-visible behavior.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate a Daily Study Plan Reliably (Priority: P1)

As a student who has registered study or question activity, I want the "Gerar plano" action to become available when there is enough data and to clearly explain what is missing when it is not available, so that I can move from activity tracking to a practical plan for today.

**Why this priority**: The blocked daily plan button is the most direct break in the study workflow and prevents the user from receiving the core benefit promised by the app.

**Independent Test**: Can be tested by registering manual question/session data, returning to the daily plan section, and verifying whether the action is enabled or shows a precise requirement instead of remaining unavailable without explanation.

**Acceptance Scenarios**:

1. **Given** a user has no usable study data, **When** the user views Plano Diário, **Then** the page explains the minimum required data and keeps generation unavailable.
2. **Given** a user has registered enough study or question data for a daily plan, **When** the user views Plano Diário, **Then** "Gerar plano" is available and can be activated.
3. **Given** a user activates daily plan generation, **When** AI generation cannot complete, **Then** the user receives a useful fallback plan or a clear retry message that preserves their entered data.

---

### User Story 2 - Use AI Features Without Dead Ends (Priority: P1)

As a student using AI-powered features, I want every AI action to either produce useful guidance or explain the temporary limitation, so that "Erro interno ao consultar IA" and repeated generic chat failures do not make the app feel broken.

**Why this priority**: AI is visible in multiple primary surfaces. Repeated generic failures reduce trust and make users unsure whether the app, account, or provider is misconfigured.

**Independent Test**: Can be tested by forcing AI unavailable, rate-limited, and successful states, then verifying that each AI surface shows the correct user-facing outcome.

**Acceptance Scenarios**:

1. **Given** the AI provider is unavailable or misconfigured, **When** the user triggers an AI action, **Then** the app shows a specific recoverable state and does not expose an internal error as the main outcome.
2. **Given** an AI request exceeds the allowed usage policy, **When** the user triggers the action, **Then** the app explains the limit and offers the next useful non-AI path.
3. **Given** an AI request succeeds, **When** the user views the response, **Then** the response is tied to the current study context and does not navigate the user away unexpectedly.

---

### User Story 3 - Keep Early AI Costs Controlled (Priority: P2)

As the product owner, I want the initial AI experience to favor bounded study actions over open-ended chat, so that the app can deliver value without unpredictable AI spending during the early product stage.

**Why this priority**: Cost control affects launch viability. The current chat experience repeatedly fails and may not be the best first AI investment.

**Independent Test**: Can be tested by reviewing available AI entry points and confirming that bounded actions such as plan generation and session recommendations are prioritized, while chat is optional, limited, or hidden when not ready.

**Acceptance Scenarios**:

1. **Given** the app is in the early product phase, **When** a user opens AI surfaces, **Then** bounded actions are presented as the primary AI experience.
2. **Given** chat is unavailable, disabled, or over limit, **When** the user opens the coach area, **Then** the user sees a non-blocking explanation and useful guided actions instead of a broken chat loop.
3. **Given** chat remains enabled for a user, **When** the user sends messages, **Then** usage is constrained by clear daily or session limits.

---

### User Story 4 - Navigate Revision and Engine Flows Predictably (Priority: P2)

As a student reviewing recommendations, I want "Revisão Geral" and "Iniciar otimização" to keep me in the right learning flow or clearly explain why an active edital is required, so that I do not land on an empty Engine page without understanding what happened.

**Why this priority**: The current flow appears to route from a recommendation into an empty state, which makes the product feel inconsistent even if the active edital requirement is valid.

**Independent Test**: Can be tested by clicking Revisão Geral and optimization actions with no active edital, with one active edital, and with incomplete edital data.

**Acceptance Scenarios**:

1. **Given** no edital is active, **When** the user selects Revisão Geral or starts optimization, **Then** the app explains the dependency before or during navigation and offers a direct path to manage editais.
2. **Given** an edital is active, **When** the user selects Revisão Geral, **Then** the app shows the relevant recommendation or session setup instead of a generic empty state.
3. **Given** the user navigates to Engine intentionally, **When** required data is missing, **Then** the empty state identifies exactly what is missing and how to resolve it.

---

### User Story 5 - Verify the Whole Local App Surface (Priority: P3)

As the product owner, I want all visible localhost screens and API health paths checked after stabilization, so that the next implementation phase is based on verified user-visible defects rather than screenshots alone.

**Why this priority**: A full pass catches related regressions and confirms whether failures are isolated to AI or broader routing/state issues.

**Independent Test**: Can be tested by running the local web and API applications, visiting each primary navigation item, checking important actions, and recording pass/fail outcomes with screenshots or notes.

**Acceptance Scenarios**:

1. **Given** the local web and API apps are running, **When** the reviewer visits Planner, Dashboard, Engine, Mentoria, Analises, Historico, edital management, and AI surfaces, **Then** each screen loads without unhandled errors or incoherent empty states.
2. **Given** the API is available locally, **When** health and AI-related paths are exercised, **Then** failures are classified as configuration, entitlement, provider, validation, or application errors.

### Edge Cases

- AI credentials are absent, invalid, expired, or intentionally disabled in local development.
- The provider is slow, rate-limited, returns malformed content, or times out.
- A user has no active edital, multiple editais, or an active edital with incomplete subject metadata.
- Manual question registration includes zero questions, zero correct answers, invalid values, or a subject that does not yet exist.
- The user registers activity in one screen and immediately expects dependent buttons or recommendations to update.
- AI chat history contains prior failed messages, repeated retries, or user prompts unrelated to study planning.
- Local web is running while local API is down, or the API is running with missing environment configuration.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST define and display clear eligibility rules for generating a daily plan.
- **FR-002**: The system MUST enable the daily plan action when the user has enough registered data and no blocking account or configuration issue exists.
- **FR-003**: The system MUST explain which specific data or setup step is missing when daily plan generation is unavailable.
- **FR-004**: The system MUST preserve user-entered manual registration data when downstream plan generation or AI consultation fails.
- **FR-005**: The system MUST replace generic internal AI error messages with user-facing states that distinguish unavailable provider, missing configuration, usage limit, insufficient data, and unexpected failure.
- **FR-006**: The system MUST provide a useful non-AI fallback or next action for every AI-powered surface that can fail.
- **FR-007**: The system MUST prioritize bounded AI actions such as daily plan generation, focus allocation, and next-session recommendation over open-ended chat in the initial product experience.
- **FR-008**: The system MUST allow AI chat to be hidden, disabled, limited, or replaced by guided prompts without blocking the core study workflow.
- **FR-009**: The system MUST apply clear usage boundaries to any enabled AI chat experience.
- **FR-010**: The system MUST keep Revisão Geral and optimization navigation consistent with active edital requirements.
- **FR-011**: The system MUST provide actionable empty states for Engine, Dashboard, and recommendation surfaces when no active edital or insufficient data exists.
- **FR-012**: The system MUST verify primary localhost web screens and API readiness as part of the stabilization acceptance process.
- **FR-013**: The system MUST record any discovered screen-level defects with the screen, user action, expected outcome, actual outcome, and severity.
- **FR-014**: The system MUST avoid exposing provider names, secrets, stack traces, or raw internal errors in user-facing app screens.
- **FR-015**: The system MUST make state changes from manual registration visible to dependent recommendations without requiring unclear reload behavior.

### Key Entities

- **Study Activity**: User-entered or imported study/question performance data, including subject, total questions, correct answers, and session context.
- **Daily Plan**: A generated or fallback plan for the current day, including recommended study blocks, subject focus, and rationale.
- **AI Capability State**: The current availability and limits for AI features, including enabled, disabled, limited, unavailable, or misconfigured states.
- **Active Edital**: The selected study program/syllabus that drives Dashboard, Engine, recommendations, and review flows.
- **Screen Verification Result**: A record of browser validation findings, including screen name, path, action, observed result, and severity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of daily plan eligibility checks show either an enabled action or a specific missing requirement within 2 seconds of viewing the section.
- **SC-002**: 100% of AI failure states across visible AI surfaces avoid generic "internal error" messaging and show a recoverable next step.
- **SC-003**: A user with sufficient activity data can generate or receive a fallback daily plan in under 30 seconds.
- **SC-004**: Open-ended chat accounts for no more than 20% of available AI entry points in the initial experience unless explicitly enabled for a test cohort.
- **SC-005**: 100% of primary navigation screens load in localhost verification without unhandled crashes or unexplained empty states.
- **SC-006**: Revisão Geral and Engine flows produce the expected destination or dependency explanation in all tested active-edital states.
- **SC-007**: All high-severity defects discovered in the localhost pass are captured with reproducible steps before implementation is considered ready.

## Assumptions

- The early product experience should reduce AI cost exposure by making bounded AI actions more important than free-form chat.
- Chat can remain in the product only if it is clearly limited, reliable, or visually downgraded from the primary workflow.
- Localhost verification will use representative seeded or locally available data rather than production user data.
- Existing authentication and entitlement concepts remain in place; this feature clarifies behavior rather than redefining account plans.
- The user-visible language remains Portuguese, matching the current product UI.
- Mobile responsiveness should be checked where practical, but the screenshots indicate desktop is the immediate priority.

## Exceptions & Justifications

None.
