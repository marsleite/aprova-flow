# Core Journey Audit

## Sequence Under Review

`onboarding -> planner -> dashboard -> engine`

## Observed State

### 1. Access And Onboarding

**Observed facts**

- `/Users/marleite/workspace/aprova-flow/apps/web/src/app/login/page.tsx`
  redirects authenticated users to `/dashboard`, not to `/planner`.
- `/Users/marleite/workspace/aprova-flow/apps/web/src/hooks/useAuth.ts` and
  `/Users/marleite/workspace/aprova-flow/apps/web/src/lib/beta-access.ts`
  enforce beta access with a hardcoded email allowlist.
- `/Users/marleite/workspace/aprova-flow/apps/web/src/components/LoginScreen.tsx`
  and `/Users/marleite/workspace/aprova-flow/apps/web/src/app/login/page.tsx`
  expose full login and registration UI before invite restriction is resolved.

**Interpretation**

- The first-run path still behaves more like "log in and discover" than a
  guided activation flow.
- The product says the macro plan should be step 1, but access flow sends the
  user to the weekly layer first.

### 2. Planner (Macro Layer)

**Observed facts**

- `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/planner/page.tsx`
  already frames the page as "Agenda Estrategica" and includes:
  - plan creation and active-plan management
  - next-best-session guidance
  - multi-edital premium messaging
  - `StudyJourneyCard current="planner"`
- The planner page actively links the next action toward `/engine`.

**Interpretation**

- The planner already carries the strongest "why/what/next" layer in the
  current product.
- It is well-positioned to be the first serious activation surface, but the
  current app shell does not consistently treat it that way.

### 3. Dashboard (Weekly Layer)

**Observed facts**

- `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/dashboard/page.tsx`
  consolidates:
  - weekly pulse
  - subject focus
  - heatmap consistency
  - strategy cards and AI insights
  - `StudyJourneyCard current="dashboard"`
- The dashboard topbar pushes the user directly to `/engine`.

**Interpretation**

- The weekly layer is rich and already useful.
- Because the dashboard is the post-login landing page, it currently behaves as
  the de facto activation hub, even though the conceptual journey says planner
  comes first.

### 4. Engine (Today Layer)

**Observed facts**

- `/Users/marleite/workspace/aprova-flow/apps/web/src/app/(app)/engine/page.tsx`
  combines:
  - timer
  - question tracker
  - daily AI planner
  - active-plan context bar
  - engine snapshot upgrade surface
  - `StudyJourneyCard current="engine"`
- The engine is clearly the strongest "do the work now" page in the app.

**Interpretation**

- The execution layer is concrete and aligned with the product promise of
  turning data into action.
- The main challenge is not lack of function here; it is getting the user to
  arrive with the right context and expectation.

## Cross-Step Coherence Check

### What already helps

- `StudyJourneyCard` explicitly explains `Planner = macro`, `Dashboard =
  semana`, `Engine = hoje`.
- Planner, dashboard, and engine all have context-aware CTAs toward the next
  action.
- The app already shows plan context and readiness cues instead of behaving like
  a generic timer.

### What currently breaks the story

- The login redirect goes to `/dashboard`, not to the start of the declared
  journey.
- The global sidebar order is `Dashboard -> Sessao de Estudo -> Planner`,
  which conflicts with the canonical `Planner -> Dashboard -> Engine` story.
- Naming varies between "Agenda Estrategica", "Dashboard", "Sessao",
  "Motor do Dia", and "Sessao de Estudo", which weakens memorability.

## Journey Verdict

- The product already has the components needed for a strong macro-to-week-to-
  day story.
- The main issue is orchestration: the app explains one journey but routes and
  labels still prioritize a different one.
