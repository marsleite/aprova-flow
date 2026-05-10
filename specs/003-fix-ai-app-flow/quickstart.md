# Quickstart: App-Wide AI and Flow Stabilization

## Goal

Validate that AI-powered study flows, daily plan generation, Revisão Geral/Engine navigation, and the main localhost web/API surfaces are stable after implementation.

## Setup

1. Install dependencies if needed.

   ```bash
   npm install
   ```

2. Start the API.

   ```bash
   npm run dev:api
   ```

3. Start the web app.

   ```bash
   npm run dev:web
   ```

4. Open the local web app in the browser, usually `http://localhost:3000`.

## Automated Checks

Run the focused suites before browser verification:

```bash
npm run lint
npm run test:run -w @aprovamind/web
npm run test -w @aprovamind/api
```

Expected coverage areas:

- Daily plan eligibility with missing data, sufficient activity, AI unavailable, and fallback states.
- AI capability/error normalization for disabled, limited, provider unavailable, misconfigured, and unexpected failure states.
- Chat availability or degradation policy.
- Active edital gating for Dashboard/Engine/Revisão Geral flows.
- API health and AI/engine route behavior.

## Browser Verification Pass

Record each check using the fields from `contracts/localhost-verification-contract.md`.

### Planner

1. Open Planner.
2. In Registro Manual, submit invalid values and confirm validation blocks or explains them.
3. Register a valid subject/question result.
4. Confirm Plano Diario updates from missing-data state to enabled or fallback-eligible state.
5. Trigger Gerar plano and confirm success, fallback, or recoverable failure copy.

### Coach IA / Mentoria

1. Open the coach surface.
2. Send a normal study question.
3. Confirm chat is either reliable, visibly limited, or replaced by guided bounded actions.
4. Confirm repeated failures do not show a broken loop.

### Revisao Geral / Engine

1. Trigger Revisão Geral or Iniciar otimização with no active edital.
2. Confirm the app explains the active edital dependency and offers a manage-editais path.
3. Activate or seed an edital if available.
4. Repeat the flow and confirm it opens a relevant recommendation/session path instead of a generic empty state.

### Primary Navigation

Visit and verify:

- Planner
- Dashboard
- Engine
- Mentoria
- Analises
- Historico
- Edital management path

Each screen should load without unhandled errors, incoherent empty states, or actions that appear clickable but cannot be used.

## API Verification

Check health and behavior classification:

```bash
curl -sS http://localhost:3001/health
```

Then exercise available AI, daily-plan, and engine endpoints through the app or direct local requests. Classify failures as:

- configuration
- entitlement or usage limit
- provider unavailable
- validation or insufficient data
- application error

## Completion Criteria

- All automated tests pass.
- Primary localhost screens pass or have documented defects with severity and reproduction steps.
- AI surfaces avoid raw internal error messaging.
- Daily plan generation is available when eligible or explains missing requirements.
- Chat is bounded, disabled, or downgraded according to launch-stage cost policy.
- Revisão Geral/Engine behavior matches the active edital state.
