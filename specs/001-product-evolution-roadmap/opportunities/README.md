# Opportunity Scoring And Tradeoffs

## Scoring Rubric

| Field | Allowed Values | How to read it in this roadmap |
|---|---|---|
| Impact | `low`, `medium`, `high` | Potential to improve perceived value, retention, trust, or commercial learning |
| Effort | `low`, `medium`, `high` | Relative implementation effort across product, design, and engineering |
| Risk | `low`, `medium`, `high` | Risk of regression, rework, rollout instability, or false learning |
| Dependency | free text | What must be reasonably true before the opportunity becomes worth doing |
| Category | `quick-win`, `structural`, `strategic` | Whether the move gives immediate leverage, strengthens foundations, or opens later bets |

## Category Logic

- `quick-win`
  - Should improve clarity, trust, or discovery without asking for a new
    structural foundation first.
- `structural`
  - Should remove a real limit on trust boundaries, ownership, observability,
    testability, or scalability.
- `strategic`
  - Should depend on earlier learning or stronger foundations and should not be
    the first move even when attractive.

## Sequencing Rules

1. Protect trust boundaries before trusting any monetization or quota signal.
2. Improve journey coherence before opening more scope or heavier pro
   packaging.
3. Instrument blocked value and upgrade desire before deciding gateway rollout.
4. Consolidate runtime ownership before deepening performance work that spans
   both runtimes.
5. Reposition `pro` only after the `free -> pro` ladder becomes clearer in
   real usage.

## Consolidated Tradeoffs

### Tradeoff 1 - Retention first, but not at the cost of broken trust

- The spec prioritizes recurrence and routine.
- However, `ST-01` must come first because self-escalated plans and auth bypass
  would pollute every downstream retention and monetization signal.

### Tradeoff 2 - Coherence before feature expansion

- The product already has breadth.
- Adding more pro surface area before fixing the core narrative would
  increase the current feeling of dispersion.

### Tradeoff 3 - Instrument before charging

- Docs and current code already support manual beta learning.
- The missing layer is not "more billing code" yet; it is better evidence about
  blocked value, CTA quality, and quota pressure.

### Tradeoff 4 - Refactor only after the product question is clear

- The duplicated ownership between web and API is a real problem.
- But the refactor should serve clearer product goals: a coherent journey,
  trustworthy entitlements, and measurable learning loops.

## Opportunity Order Summary

### First wave

- `ST-01`
- `QW-01`
- `QW-02`
- `QW-03`
- `QW-04`
- `QW-05`
- `QW-06`

### Second wave

- `ST-03`
- `ST-04`

### Third wave

- `ST-02`
- `ST-05`
- `ST-06`

### Fourth wave

- `SG-01`

### Fifth wave

- `SG-02`
- `SG-03`
- `SG-04`
