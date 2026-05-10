# Dependency Order

## Recommended Execution Order

1. `ST-01`
2. `QW-01`, `QW-02`, `QW-03`, `QW-04`, `QW-05`, `QW-06`
3. `ST-03`, `ST-04`
4. `ST-02`, `ST-05`, `ST-06`
5. `SG-01`
6. `SG-02`, `SG-03`, `SG-04`

## Why This Order Makes Sense

### 1. Trust before learning

- If users can self-escalate plan tier or the dedicated API still accepts
  sandbox bypass, blocked-value and monetization signals are unreliable.
- Because of that, `ST-01` is a true dependency, not a nice-to-have.

### 2. Coherence before instrumentation depth

- The product already has a strong core, but its journey is not introduced in
  the same order it is conceptually sold.
- It is better to fix that coherence before interpreting activation and
  recurrence at scale.

### 3. Instrument before gateway thinking

- `SG-01` depends on knowing which blocked moments and surfaces actually create
  upgrade desire.
- Without `ST-03`, the team would still be deciding commercial packaging with
  weak evidence.

### 4. Consolidate runtime after the product question is clearer

- `ST-02`, `ST-05`, and `ST-06` are important, but they become safer and more
  purposeful once the team knows which user flows need the cleanest ownership.

### 5. Pro after the main ladder

- `SG-02` and `SG-03` should not lead the roadmap because they add strategic
  depth to a product that still needs stronger clarity around the single-plan
  core.

## Cost Of Executing Out Of Order

- Skipping `ST-01`
  - Risks false monetization learning, unfair access, and security exposure.
- Jumping to `SG-01` before `ST-03`
  - Produces gateway decisions without knowing what actually pulls upgrade.
- Jumping to `SG-02` before `SG-01`
  - Over-invests in pro differentiation before the main ladder is proven.
- Doing `ST-02` before journey coherence work
  - Can spend significant refactor effort without reducing the most visible user
    confusion first.

## First Three Recommended Moves

1. Lock server-side trust boundaries for plan tier, usage, and API auth.
2. Realign onboarding and navigation so the product consistently says
   `planner -> dashboard -> engine`.
3. Add event instrumentation for blocked value and upgrade intent before any
   gateway decision.
