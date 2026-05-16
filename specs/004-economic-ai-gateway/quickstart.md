# Quickstart: Economic AI Gateway

## Goal

Validate that AI usage is routed through the shared gateway, protected by budget policy, logged for admin review, and resilient when providers fail.

## Local Setup

1. Install dependencies if needed.
2. Configure `AI_OPENROUTER_API_KEY` for the default provider.
3. Keep Gemini credentials available as an operational fallback for provider outages and PDF parsing.
4. Set very low local budget values to test blocking behavior safely.
5. Start the API and web apps.

## Verification Flow

1. Run typecheck for the AI gateway, web, and API packages.
2. Run gateway, application, web route, and API module tests.
3. Open the app locally and sign in through the authorized localhost domain.
4. In Planner, generate a daily plan with normal provider access and confirm usage/cost headers or event data are recorded.
5. Force provider failure or remove provider credentials locally, then generate the daily plan again and confirm resilient fallback is shown.
6. Open Coach IA and confirm guided actions are visible before free-form chat.
7. Exhaust a low local budget and confirm non-critical chat is blocked with friendly copy while critical flows use fallback where allowed.
8. Open smart schedule, weekly mentoring, and error diagnosis surfaces and confirm they return either useful AI output, local fallback, or clear unavailable states.
9. Open the beta/admin panel and verify 7/14/30 day AI cost, task counts, fallback rate, failure rate, and budget blocks.
10. Confirm partial data warnings appear if one usage source is unavailable, without breaking the full panel.

## Expected Evidence

- Automated tests passing for routing, budget policy, fallback behavior, usage event recording, and admin summaries.
- Browser verification notes for Coach IA, daily plan, smart schedule, weekly mentoring, diagnosis, and beta/admin signals.
- No provider keys or raw provider errors visible in browser responses.
- Critical study flows remain usable when the provider is unavailable or budget is exhausted.

## Useful Commands

```bash
npm run typecheck -w @aprovamind/ai-gateway
npm run typecheck -w @aprovamind/web
npm run typecheck -w @aprovamind/api
npm run test -w @aprovamind/ai-gateway
```

## Rollout Notes

- Keep OpenRouter as default for the first rollout, with explicit model choices per task.
- Move individual tasks between Qwen, DeepSeek, Gemini, or another OpenRouter model only after telemetry proves acceptable quality.
- Start with conservative response size caps for chat and guided actions.
- Monitor budget blocks, fallback rate, and failed provider responses daily during beta.
