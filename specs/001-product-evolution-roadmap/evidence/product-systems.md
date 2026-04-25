# Product Systems Audit

## Product Value And Positioning

### Strengths

- `README.md` clearly frames AprovaMind as a coach for study routine, not as a
  content-teaching app.
- `/Users/marleite/workspace/aprova-flow/apps/web/src/app/page.tsx` and
  `/Users/marleite/workspace/aprova-flow/apps/web/src/app/login/page.tsx`
  present a premium-feeling product with a strong performance-oriented visual
  identity.
- The app surface is already broader than a timer: planner, dashboard, engine,
  mentoring, simulations, and error notebook are live.

### Weaknesses

- The marketing story leans heavily on AI, performance, and multi-edital
  sophistication before the core single-plan routine is fully clarified.
- `README.md` still emphasizes the older "cronometro -> dados -> IA" story and
  a legacy single-app architecture, while the current spec and beta docs treat
  journey coherence and `free -> pro` learning as the central priority.

## UX, UI, And Navigation

### Strengths

- Route pages are visually intentional and differentiated, not generic admin
  screens.
- Upgrade surfaces are contextual instead of being isolated in a pricing page.
- The main study pages already explain the next best action more clearly than a
  static dashboard would.

### Weaknesses

- `/Users/marleite/workspace/aprova-flow/apps/web/src/components/layout/Sidebar.tsx`
  orders `Dashboard -> Sessao de Estudo -> Planner`, which contradicts the
  canonical journey card.
- `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/simulations/page.tsx`
  works as an overview layer, while `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/provas/page.tsx`
  still acts as the execution hub. The split is functional but cognitively more
  expensive than it should be.
- Naming still oscillates between "Agenda Estrategica", "Planner", "Sessao",
  "Motor do Dia", "Mentoria", and "Mentoria Analitica".

## Onboarding And Retention

### Strengths

- The beta docs already define what should be learned about activation,
  recurrence, blocked features, and upgrade intent.
- The main app loop already contains a useful progression from plan to weekly
  rhythm to execution.

### Weaknesses

- New users are sent to `/dashboard` immediately after login even though the
  product story says they should start from the macro plan.
- Beta invite control is honest in the error message, but the flow still lets
  the user enter registration/login UI before hitting the hard boundary.
- There is no explicit first-run checklist or activation milestone telling the
  user "create or confirm plan -> read weekly picture -> run first session".

## Monetization Experience

### Strengths

- `/Users/marleite/workspace/aprova-flow/docs/product/entitlements-matrix.md`
  is precise about what belongs to `free`, `pro`, and `premium`.
- `EntitlementUpgradeCard` is used across planner, simulations, mentoring, and
  error notebook with context-specific copy.
- `/Users/marleite/workspace/aprova-flow/docs/product/beta-operations-checklist.md`
  and `/Users/marleite/workspace/aprova-flow/docs/product/beta-test-plan.md`
  show that the team already treats monetization as a learning loop, not as
  final billing.

### Weaknesses

- `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/settings/page.tsx`
  labels the modal as "Gerenciar Faturamento", but
  `/Users/marleite/workspace/aprova-flow/apps/web/src/components/AccountPlanModal.tsx`
  and `/Users/marleite/workspace/aprova-flow/apps/web/src/lib/firebase/entitlements.ts`
  actually perform direct plan-tier mutation, not real billing.
- Upgrade surfaces exist, but the product still lacks the event layer needed to
  learn which blocked moments actually pull conversion.

## What Already Improved Since The Previous Audit

- The gap analyzer now explicitly communicates that it reads a capped sample of
  filtered errors instead of hiding that detail.
- The `StudyJourneyCard` makes the macro-week-day sequence much more explicit
  than the older audit state suggested.
- Simulations now pull real accuracy-derived metrics instead of relying only on
  decorative placeholders.

## Product-System Verdict

- The product already feels substantive and differentiated.
- The main product risk is not missing breadth; it is that the experience still
  introduces breadth before the central story feels inevitable.
