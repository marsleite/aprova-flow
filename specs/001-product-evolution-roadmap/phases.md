# Roadmap Phases

## Phase 0 - Trust Boundary Hardening

- Phase ID: `PH-00`
- Objective: restore trustworthy server-side enforcement for auth,
  entitlements, and quota state before broader beta learning continues.
- Entry criteria:
  - critical risks in auth and entitlement mutation are documented
  - current beta still depends on manual tester operations
- Included opportunities:
  - `ST-01`
  - `QW-05`
- Exit signals:
  - end users can no longer mutate `planTier` or usage from the client path
  - dedicated API does not accept public sandbox auth bypass in production paths
  - settings copy no longer implies real billing where only beta operations exist

## Phase 1 - Coherent Activation

- Phase ID: `PH-01`
- Objective: make the main journey easier to understand and easier to start.
- Entry criteria:
  - trust boundary hardening is sufficiently complete for clean beta learning
- Included opportunities:
  - `QW-01`
  - `QW-02`
  - `QW-03`
  - `QW-04`
  - `QW-06`
- Exit signals:
  - onboarding and nav reinforce the same `planner -> dashboard -> engine`
    story
  - simulation entry path feels canonical
  - empty/error states clarify when the product lacks data

## Phase 2 - Measurement And Retention Learning

- Phase ID: `PH-02`
- Objective: learn from blocked value, recurrence, and upgrade intent with more
  confidence.
- Entry criteria:
  - main journey is more coherent
  - entitlement and auth trust boundaries are stable enough not to poison data
- Included opportunities:
  - `ST-03`
  - `ST-04`
- Exit signals:
  - product-event instrumentation exists for blocked features, upgrade CTAs, and
    quota pressure
  - weekly beta review can correlate usage, blockers, and qualitative feedback
  - journey-level regressions are covered by automated checks

## Phase 3 - Runtime Consolidation And Performance

- Phase ID: `PH-03`
- Objective: reduce duplicated ownership and remove the most visible scale
  bottlenecks.
- Entry criteria:
  - event baseline is available
  - team knows which runtime paths matter most to the core journey
- Included opportunities:
  - `ST-02`
  - `ST-05`
  - `ST-06`
- Exit signals:
  - AI/engine/entitlements ownership is clearer
  - planner and caderno-erros handle growth more gracefully
  - docs reflect the current monorepo truth

## Phase 4 - Commercial Calibration

- Phase ID: `PH-04`
- Objective: validate what truly sells `pro` before introducing real payment
  infrastructure.
- Entry criteria:
  - blocked-value events and weekly beta learning are working
  - core journey coherence is materially better
- Included opportunities:
  - `SG-01`
- Exit signals:
  - team can name which features and moments reliably pull `free -> pro`
    movement
  - quotas and upgrade copy are calibrated enough for gateway planning

## Phase 5 - Pro Differentiation And Adaptive Intelligence

- Phase ID: `PH-05`
- Objective: deepen the product where complexity and coordination genuinely
  justify a pro layer.
- Entry criteria:
  - `free -> pro` ladder is clearer
  - runtime ownership and instrumentation are stable enough to support larger
    bets
- Included opportunities:
  - `SG-02`
  - `SG-03`
  - `SG-04`
- Exit signals:
  - pro is framed around complex-routine coordination
  - the product loop feels more unified across planner, dashboard, engine,
    simulations, and error notebook
  - broader beta expansion happens on top of a more trustworthy base
