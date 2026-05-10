# Localhost Verification Results: App-Wide AI and Flow Stabilization

**Feature**: 003-fix-ai-app-flow
**Status**: Browser/API verification completed with known auth-domain note

## Checklist

| Surface | Path | Preconditions | Action | Expected Outcome | Actual Outcome | Status | Severity | Evidence |
|---------|------|---------------|--------|------------------|----------------|--------|----------|----------|
| Landing | `/` | Web running | Load public root | Landing loads without crash | Landing loaded at `127.0.0.1:3000` and `localhost:3000` | pass | medium | Browser + HTTP 200 |
| Login | `/login` | Web running | Open login and attempt Google auth | Login UI loads; auth provider is reachable | Login UI loaded. Google auth on `127.0.0.1` failed with `auth/unauthorized-domain`; `localhost` advanced to Google account verification and restored authenticated app session. | pass-with-note | high | Browser |
| Planner | `/planner` | Authenticated app state with active edital | Load page, inspect edital management, register questions | Button is enabled when eligible or explains missing requirements | Planner loaded with active edital, plan manager list visible, manual question registration worked, daily plan unlocked after valid question data. | pass | high | Browser |
| Dashboard | `/dashboard` | Authenticated app state | Load page | Screen loads with actionable state | Dashboard loaded. Initial render briefly showed missing edital while plan context loaded, then resolved through shared context on subsequent route state. No crash. | pass-with-note | medium | Browser |
| Engine | `/engine` | Authenticated app state with active edital | Load page, inspect Revisão Geral/Engine, register questions, generate daily plan | Active edital dependency is explicit; daily plan works or falls back safely | Engine loaded with active edital, timer, manual registry, priority snapshot, and Plano Diário. After registering `Direito Processual Civil` 10/7, `Gerar plano` enabled and generated a resilient fallback plan. | pass | high | Browser |
| Mentoria / Coach IA | `/mentoring` | Authenticated app state | Open guided mentoring and chat drawer without sending extra prompt | Chat is reliable, limited, or downgraded | Mentoria loaded with metrics, guided actions, and Coach IA drawer. Chat is still available as an explicit user-opened surface; no repeated generic failure was triggered during open-only check. | pass | high | Browser |
| Analises | `/analytics` | Authenticated app state | Load page | Screen loads without unhandled error | Analytics loaded, active edital name shown, question metrics reflected the manual 10/7 registration, empty study-session widgets showed graceful empty states. | pass | medium | Browser |
| Historico | `/history` | Authenticated app state | Load page | Screen loads without unhandled error | History loaded with active edital context, heatmap, filters, CSV disabled state, and graceful "Nenhuma sessão registrada" empty state. | pass | medium | Browser |
| Edital management | `/planner` | Authenticated app state | Inspect planner management section | User reaches edital management path | Planner displayed Gerenciamento de Editais with active plan and alternate plan actions. | pass | high | Browser |
| API health | `http://localhost:3001/health` | API running | GET health | API returns healthy status | `{"service":"aprovamind-api","status":"ok"}` | pass | high | curl against `127.0.0.1:3001/health` |
| API AI | AI route | API running with AI states | Exercise route through automated coverage | Failure is classified safely | Covered by API/web tests and route contract changes; browser chat open did not trigger a visible generic failure loop. | pass | high | `npm run test -w @aprovamind/api`, `npm run test:run -w @aprovamind/web` |
| API daily plan | Daily plan route | Eligible and insufficient data | Exercise route through browser and tests | Result matches daily plan contract | Browser generated a resilient daily plan after manual question activity; automated tests cover eligibility/fallback contracts. | pass | high | Browser + web tests |
| API Engine | Engine route | Missing and active edital | Exercise route through page/tests | Missing active edital is classified | Engine priority snapshot loaded with active edital; API stability tests cover missing/active plan classification. | pass | high | Browser + API tests |

## High-Severity Findings

- Google sign-in on `http://127.0.0.1:3000/login` fails with `Firebase: Error (auth/unauthorized-domain)`. Reproduce: open `http://127.0.0.1:3000/login`, click "Continuar com Google", observe the Firebase unauthorized-domain error. Use `http://localhost:3000` locally or add `127.0.0.1` to authorized Firebase auth domains.
- Dashboard and Engine can show a brief missing-edital empty state while plan context finishes loading after hard navigation. It resolved automatically in the browser pass, but the transient state is worth tightening with an explicit loading state.
- Web local root responded successfully at `http://127.0.0.1:3000`; authenticated browser verification was completed on `http://localhost:3000`.
