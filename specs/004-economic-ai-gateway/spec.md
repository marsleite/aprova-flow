# Feature Specification: Economic AI Gateway

**Feature Branch**: `004-economic-ai-gateway`  
**Created**: 2026-05-10  
**Status**: Draft  
**Input**: User description: "Implementar uma camada de IA econômica e resiliente no AprovaMind, reduzindo dependência de chamadas caras e preparando o produto para múltiplos provedores de LLM. Centralizar chamadas em AI Gateway, roteamento por tarefa, orçamento por usuário e global, telemetria de uso/custo, fallbacks locais e ações guiadas no Coach IA."

## Constitution Alignment *(mandatory)*

- **Architecture Impact**: `apps/web`, `apps/api`, `packages/domain`, `packages/application`, `packages/contracts`, `packages/ai-gateway`.
- **Server-Side / AI / Entitlements Impact**: A feature affects AI usage controls, provider secrets, user and global budget enforcement, admin cost telemetry, quota/rate-limit handling, and paid/free access boundaries for expensive AI tasks.
- **Risk-Based Test Strategy**: Automated coverage is required for task routing decisions, budget blocking, fallback behavior, usage event recording, admin summaries, and existing AI user flows. Browser verification is required for Coach IA, daily plan, smart schedule, weekly mentoring, diagnosis, and the beta/admin usage panel.
- **Documentation Impact**: Update `docs/architecture/current-architecture.md` and `docs/architecture/deploy-and-environments.md` with the AI cost-control model, provider configuration expectations, fallback policy, and operational monitoring needs.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Keep Critical Study Flows Working (Priority: P1)

As a student, I want daily planning, schedule guidance, mentoring, and diagnosis features to keep working even when an AI provider fails, is unavailable, or budget is exhausted, so that my study workflow is not blocked by external AI costs or outages.

**Why this priority**: The product promise depends on reliable study execution. A solo product cannot afford user-facing failures whenever AI fails or becomes too expensive.

**Independent Test**: Can be tested by simulating unavailable AI and exhausted budget, then confirming that the student still receives useful local guidance in each critical flow.

**Acceptance Scenarios**:

1. **Given** a student has enough study data for a daily plan, **When** AI is unavailable, **Then** the product presents a usable resilient plan and clearly indicates that it was generated safely without presenting it as an error.
2. **Given** a student opens a smart schedule or mentoring flow, **When** the external AI answer fails, **Then** the product returns local guidance that preserves the user's next study action.
3. **Given** a student reaches the AI budget limit, **When** the student requests a critical flow, **Then** the product blocks paid AI usage but still offers the best available fallback where possible.

---

### User Story 2 - Control AI Spend Before It Exceeds Revenue (Priority: P1)

As the product owner, I want daily user budgets and global monthly budgets to limit AI usage, so that AI spend cannot silently exceed early-stage revenue.

**Why this priority**: Cost control is a business survival requirement for a solo/inicial product.

**Independent Test**: Can be tested by configuring low budgets, sending AI requests until the limit is reached, and verifying that new calls are blocked while fallbacks and clear status messages continue.

**Acceptance Scenarios**:

1. **Given** a user's daily AI budget is exhausted, **When** the user requests a non-critical chat response, **Then** the request is blocked with a friendly explanation and no paid AI response is attempted.
2. **Given** the product's monthly global AI budget is exhausted, **When** any user triggers an AI feature, **Then** expensive AI usage is prevented and the product chooses a local fallback or a clear unavailable state.
3. **Given** a request is blocked by budget, **When** the product owner reviews admin analytics, **Then** the block is counted with task, user segment, and cost context.

---

### User Story 3 - Measure AI Cost and Reliability (Priority: P2)

As an admin, I want to see AI cost, usage, fallback, provider failure, and budget-blocking signals for the last 7, 14, and 30 days, so that I can decide whether Gemini, Qwen, DeepSeek, or another model should be the default.

**Why this priority**: Provider decisions should be based on real product usage rather than guesses from price tables.

**Independent Test**: Can be tested by creating successful, failed, fallback, and blocked AI events, then confirming that the admin panel summarizes them accurately for each time window.

**Acceptance Scenarios**:

1. **Given** AI usage events exist across multiple tasks, **When** the admin selects a 7, 14, or 30 day window, **Then** the panel shows estimated cost, usage count, task breakdown, fallback rate, failure rate, and budget-block count for that window.
2. **Given** multiple providers or models are configured over time, **When** the admin views AI signals, **Then** the panel separates cost and reliability by provider/model.
3. **Given** some usage sources are temporarily unavailable, **When** the admin panel loads, **Then** it shows partial data with a clear warning rather than failing the whole panel.

---

### User Story 4 - Use Guided AI Instead of Open-Ended Chat (Priority: P2)

As a student, I want the Coach IA to offer focused actions and short answers, so that I get useful guidance without consuming unnecessary AI budget.

**Why this priority**: Guided actions improve quality and constrain prompt/response size, which directly protects cost.

**Independent Test**: Can be tested by opening Coach IA, using guided actions, and confirming that responses are concise, task-specific, and budget-aware.

**Acceptance Scenarios**:

1. **Given** a student opens Coach IA, **When** quick actions are available, **Then** the most relevant low-cost study actions are presented before encouraging free-form chat.
2. **Given** a student sends a free-form message, **When** the answer can be served by a guided study action, **Then** the product keeps the response concise and tied to the student's current study data.
3. **Given** a student is near or over budget, **When** Coach IA responds, **Then** the product favors short local guidance or a budget-aware unavailable message.

---

### User Story 5 - Change AI Provider Without Product Disruption (Priority: P3)

As the product owner, I want AI tasks to be assigned to different provider/model choices without changing the user experience, so that I can test cheaper alternatives such as Qwen and DeepSeek safely.

**Why this priority**: Provider flexibility lowers vendor risk, but it is less urgent than reliability and budget enforcement.

**Independent Test**: Can be tested by changing task-to-provider configuration in a safe environment and verifying that the same user-facing flows still behave correctly.

**Acceptance Scenarios**:

1. **Given** OpenRouter is the default provider, **When** task models are configured, **Then** existing AI features continue to work with budget, telemetry, and fallback controls applied.
2. **Given** an alternative provider is configured for a task, **When** that task runs, **Then** the product records which provider/model was used and preserves the same user-facing contract.
3. **Given** the alternative provider fails, **When** fallback is allowed for the task, **Then** the product returns resilient guidance and records the provider failure.

### Edge Cases

- AI provider credentials are missing, invalid, expired, or not allowed for the current environment.
- A configured provider responds slowly, returns malformed content, or returns content that does not match the requested task.
- Estimated cost cannot be calculated precisely because provider token counts are missing.
- A request is allowed at the start but would exceed budget after output is generated.
- A student has no study history, no active edital, or insufficient data for personalized guidance.
- Multiple AI requests are made close together by the same user and could race past the budget.
- Admin cost data is partially unavailable, delayed, duplicated, or missing for one provider.
- A fallback answer exists but should not be shown for a premium-only or diagnosis-only task.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST route every AI-assisted user feature through one centralized AI decision layer before any external AI usage is attempted.
- **FR-002**: The AI decision layer MUST classify requests by task, including coach chat, daily plan, smart schedule, weekly mentoring, and error diagnosis.
- **FR-003**: The product MUST support task-specific provider/model choices so that inexpensive models can serve simple tasks while higher-quality models are reserved for more valuable tasks.
- **FR-004**: OpenRouter MUST be supported as the default provider so model choices can be changed per task through one API.
- **FR-005**: The product MUST support at least one alternative provider profile so Qwen, DeepSeek, or similar options can be evaluated without changing the user-facing feature.
- **FR-006**: The product MUST enforce a daily AI budget per user before attempting non-critical paid AI usage.
- **FR-007**: The product MUST enforce a global monthly AI budget before attempting paid AI usage.
- **FR-008**: The product MUST return a friendly budget-aware response when a request is blocked by user or global budget.
- **FR-009**: The product MUST provide local deterministic fallback for daily plan generation when AI is unavailable, malformed, or blocked by budget.
- **FR-010**: The product MUST provide resilient fallback or clear unavailable states for smart schedule, weekly mentoring, and error diagnosis based on the user's available study data and task criticality.
- **FR-011**: The product MUST record an AI usage event for every AI decision attempt, including successful, failed, fallback, and budget-blocked outcomes.
- **FR-012**: Each AI usage event MUST include user identity context, task, provider, model, estimated input usage, estimated output usage, estimated cost, status, optional error reason, fallback indicator, and timestamp.
- **FR-013**: Cost estimates MUST use a configurable price table by provider/model and remain available even when exact provider billing data is not returned.
- **FR-014**: The admin/beta panel MUST summarize estimated AI cost, calls by task, provider/model reliability, fallback rate, and budget blocks for 7, 14, and 30 day windows.
- **FR-015**: The admin/beta panel MUST show partial results with a clear warning when one source of AI usage data cannot be read.
- **FR-016**: Coach IA MUST prioritize guided actions and concise answers over open-ended long chat responses.
- **FR-017**: Coach IA MUST display budget or fallback status in a way that feels operational and helpful, not like a broken error.
- **FR-018**: The product MUST prevent AI provider secrets from being exposed to browser users.
- **FR-019**: Existing AI flows MUST keep their current core user intent while gaining budget checks, telemetry, routing, and fallback behavior.
- **FR-020**: The feature MUST provide test coverage for routing, budget enforcement, fallback selection, usage event recording, and admin summaries without requiring live external AI calls.

### Key Entities *(include if feature involves data)*

- **AI Task Request**: A normalized request for an AI-assisted action. Key attributes include task type, user identity, input summary, budget tier, maximum answer size, fallback permission, and request timestamp.
- **AI Provider Profile**: A configurable provider/model option available for one or more tasks. Key attributes include provider name, model name, task eligibility, cost profile, availability state, and environment scope.
- **AI Budget Policy**: The spend guardrail applied before external AI usage. Key attributes include per-user daily limit, global monthly limit, consumed estimate, remaining estimate, and block behavior.
- **AI Usage Event**: A record of each AI decision outcome. Key attributes include user identity context, task, provider, model, estimated usage, estimated cost, status, fallback use, error reason, and created time.
- **Fallback Response**: A local response generated without paid external AI. Key attributes include task type, source data used, message, confidence/limitations, and whether it satisfies the user's requested action.
- **Admin AI Summary**: Aggregated operational view of AI usage. Key attributes include time window, estimated total cost, task breakdown, provider/model breakdown, success/failure counts, fallback rate, and budget-block count.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of AI-assisted product flows continue to return either a useful answer, a local fallback, or a clear budget/unavailable state when the external provider is unavailable.
- **SC-002**: 100% of paid AI attempts are evaluated against user and global budget limits before paid external usage is attempted.
- **SC-003**: At least 95% of AI decisions create an auditable usage event with task, outcome, provider/model when applicable, and estimated cost.
- **SC-004**: Admin users can review estimated AI cost and reliability for 7, 14, and 30 day windows in under 30 seconds.
- **SC-005**: Coach IA guided actions reduce free-form chat dependence by making at least four common study intents available as one-click actions.
- **SC-006**: Daily plan generation succeeds with a usable plan in at least 99% of attempts, including provider failure and budget exhaustion scenarios.
- **SC-007**: The product owner can switch a non-critical AI task to an alternative provider in a safe environment and verify behavior without changing the student-facing workflow.
- **SC-008**: Critical AI flows remain testable in automated checks without live external provider calls.

## Assumptions

- Initial rollout keeps OpenRouter as the default provider while retaining Gemini as an operational fallback.
- Qwen and DeepSeek evaluation is intended for cost/quality comparison through task-specific model settings.
- Budget limits are soft business guardrails based on estimated spend; final invoices from providers may differ slightly.
- The product already has authenticated user context for AI features that need per-user budgets.
- Existing beta/admin reporting is the preferred place to expose AI cost and reliability signals.
- Existing deterministic planning and recommendation logic can be reused or extended for fallback responses.
- The first version focuses on web product flows and server-side AI usage, not mobile-native clients.

## Exceptions & Justifications

- None.
