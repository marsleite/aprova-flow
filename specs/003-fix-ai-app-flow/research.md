# Research: App-Wide AI and Flow Stabilization

## Decision: Treat AI availability as a typed capability state

**Rationale**: The current user experience shows generic failure copy such as "Erro interno ao consultar IA" and repeated chat fallback messages. A typed capability state lets all surfaces distinguish success, disabled, missing configuration, provider unavailable, usage limited, insufficient data, and unexpected failure without exposing secrets or raw provider details.

**Alternatives considered**:

- Keep generic errors and only improve copy. Rejected because different root causes require different user actions.
- Handle each AI surface independently. Rejected because Planner, Mentoring/chat, Engine recommendations, and web/API AI routes would drift.

## Decision: Prioritize bounded AI actions over open-ended chat for launch-stage value

**Rationale**: Daily plan generation, focus allocation, and next-session recommendation have constrained inputs, easier cost control, clearer fallback behavior, and stronger study value than open-ended chat. Chat can remain available only when bounded by entitlement, quota, or feature flag, and should not be the primary path while reliability and cost are unresolved.

**Alternatives considered**:

- Keep chat as the main AI affordance. Rejected because it creates unpredictable usage and currently fails repeatedly.
- Remove every chat entry point immediately. Rejected because guided or limited chat may still be useful for controlled cohorts and future testing.

## Decision: Daily plan generation must have explicit eligibility and deterministic fallback

**Rationale**: The disabled "Gerar plano" button appears unexplained after activity registration. The system needs a single eligibility decision that can say "enabled" or list missing requirements. When AI generation fails, a deterministic plan fallback keeps the workflow useful and protects entered user data.

**Alternatives considered**:

- Enable the button unconditionally and let generation fail later. Rejected because it moves the confusing error later in the flow.
- Require AI success for any daily plan. Rejected because the daily study workflow should not collapse when the provider is unavailable.

## Decision: Active edital gating should be visible before or during navigation

**Rationale**: Revisão Geral and optimization can route into Engine where the user sees an empty state asking for an active edital. The dependency may be valid, but it must be communicated as part of the originating action or as an actionable Engine empty state.

**Alternatives considered**:

- Leave the current Engine empty state as the only explanation. Rejected because it makes the recommendation click look broken.
- Block all recommendation cards unless an edital is active. Rejected because some surfaces may still show useful setup guidance.

## Decision: Keep contracts shared and implementation-specific diagnostics internal

**Rationale**: UI and API both need stable names for capability state, plan eligibility, and verification results. Shared contracts prevent copy/paste enums across apps while allowing server logs to keep provider-specific details private.

**Alternatives considered**:

- Define only local UI types. Rejected because API and web routes already share contracts and behavior needs consistency.
- Expose provider-specific errors to the browser. Rejected because this leaks implementation detail and may reveal sensitive configuration clues.

## Decision: Validate locally through both automated tests and browser pass

**Rationale**: The feature includes bug fixes and navigation behavior, so automated tests are required by risk. Browser validation remains necessary for the visible localhost surfaces shown in screenshots, including layout, disabled controls, empty states, and routing.

**Alternatives considered**:

- Manual browser validation only. Rejected because the feature changes behavior and error handling.
- Automated tests only. Rejected because the user specifically requested localhost screen verification and the defects are visible UX issues.
