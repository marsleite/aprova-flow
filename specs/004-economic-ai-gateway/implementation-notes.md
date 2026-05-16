# Implementation Notes: Economic AI Gateway

## Current AI Entry Points

- `packages/ai-gateway/src/gateway.ts`: shared server-side gateway already used by API/web wrappers.
- `apps/api/src/modules/ai/routes.ts`: Fastify `/ai/text` and `/ai/pdf`, persists successful usage events.
- `apps/web/src/lib/server/dedicatedAi.ts`: web BFF client for dedicated API with direct gateway fallback.
- `apps/web/src/app/api/chat/route.ts`: Coach IA route with entitlement/rate-limit handling.
- `apps/web/src/app/api/planner-daily/route.ts`: daily plan route with deterministic fallback support.
- `apps/web/src/app/api/smart-schedule/route.ts`: smart schedule route.
- `apps/web/src/app/api/weekly-mentoring/route.ts`: weekly mentoring route.
- `apps/web/src/app/api/error-diagnosis/route.ts`: error diagnosis route.

## Migration Notes

- Keep OpenRouter as the default provider and Gemini as the operational fallback.
- Extend `packages/ai-gateway` first so existing web and API imports keep working.
- Add budget and decision metadata as optional/compatible fields on existing gateway responses.
- Persist non-success statuses through the same `ai_usage_events` collection when routes can safely do so.
- Keep browser responses filtered: no keys, raw prompts, stack traces, or raw provider errors.
