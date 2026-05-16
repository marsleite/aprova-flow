# Research: Economic AI Gateway

## Decision: Evolve the existing AI gateway instead of creating a new runtime

**Rationale**: The repository already contains `packages/ai-gateway` with Gemini, OpenAI-compatible text generation, pricing, usage extraction, and task defaults. Extending this package keeps AI execution behind the server-side trust boundary and avoids another service to deploy, monitor, and secure.

**Alternatives considered**:

- Add a separate AI proxy service. Rejected because it adds operational cost and deployment complexity before product-market validation.
- Keep per-route AI calls. Rejected because budget, fallback, and telemetry rules would continue to drift across chat, planner, mentoring, and diagnosis.

## Decision: Use task-based routing with OpenRouter as the default

**Rationale**: The product has distinct AI intents with different value and risk. Chat and lightweight guidance can use cheaper models; mentoring and diagnosis may need stronger models; PDF parsing remains provider-specific until a comparable multimodal path is proven. OpenRouter keeps the beta operationally simple with one API key while allowing explicit model choices per task.

**Alternatives considered**:

- One global model for every task. Rejected because cheap chat and high-value diagnosis should not have the same cost/quality profile.
- Switch directly to individual Qwen or DeepSeek vendor APIs globally. Rejected because the beta benefits more from fast model experimentation through one integration.

## Decision: Treat Qwen and DeepSeek as OpenRouter/OpenAI-compatible model profiles

**Rationale**: Qwen and DeepSeek can be evaluated through OpenRouter's chat-completions style API with configurable API key and model name. This lets the product test cheaper models without adding a full provider-specific abstraction for each vendor in the first iteration.

**Alternatives considered**:

- Build vendor-specific SDK adapters for each cheaper provider now. Rejected because it creates more maintenance before real usage data justifies it.
- Use direct-provider-only access. Rejected as the first path because it increases integration and billing complexity before real usage data justifies it.

## Decision: Enforce estimated spend budgets before paid provider calls

**Rationale**: Early-stage spend risk comes from unbounded calls, especially chat. A pre-call policy can block or redirect non-critical requests before paid usage begins. Because final output tokens are not known before generation, the first iteration should reserve or estimate cost using task/model defaults, then record actual or estimated usage after completion.

**Alternatives considered**:

- Only show usage after the fact. Rejected because it detects overspend too late.
- Require exact provider billing before decisions. Rejected because providers differ in token metadata and invoices may lag.

## Decision: Record every AI decision outcome, not only successful provider calls

**Rationale**: The admin panel needs to know why users did or did not receive AI value. Successful calls, provider failures, deterministic fallbacks, and budget blocks all explain product health and cost pressure. Recording every decision also lets the owner compare Gemini, Qwen, DeepSeek, and fallback rates by task.

**Alternatives considered**:

- Log only paid usage. Rejected because budget blocks and fallback rate are essential product signals.
- Use console-only logs. Rejected because admin/beta analytics already summarize Firestore event collections and need durable signals.

## Decision: Keep deterministic fallback as part of each critical task contract

**Rationale**: Daily planning and study guidance are product-critical. Fallback should be explicit per task, with "fallback used" presented as resilient guidance rather than a broken error. This keeps the app useful when budget is exhausted, model output is malformed, or a provider is down.

**Alternatives considered**:

- Fail fast when AI is unavailable. Rejected because it blocks core study workflows.
- Hide all AI sections when budget is exhausted. Rejected because local guidance can still create user value and preserve trust.

## Decision: Make Coach IA guided-first and budget-aware

**Rationale**: Open-ended chat is costly and unpredictable. Guided actions compress prompts, cap answer length, and align with the most common study intents: plan today, recover delay, choose review, explain performance, and generate a plan B. Free-form chat can remain, but should be shorter, budget-aware, and secondary.

**Alternatives considered**:

- Remove chat completely. Rejected because bounded chat can still help retention and learning.
- Keep chat as the primary affordance. Rejected because it is the least predictable cost surface.

## Decision: Extend existing beta/admin signals instead of adding a new dashboard

**Rationale**: The current beta panel already consolidates product usage, upgrade, quota, and AI usage signals. Extending it with provider/model cost, fallback, and budget-block metrics keeps operations in one place and aligns with existing partial-data warning behavior.

**Alternatives considered**:

- Build a separate AI cost dashboard. Rejected because the owner needs one early-stage operating view, not another admin surface.
- Leave cost review to provider dashboards. Rejected because provider dashboards cannot connect spend to product tasks, users, fallbacks, or upgrade signals.
