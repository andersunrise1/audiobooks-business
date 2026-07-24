# AI Usage Guidelines

Practical notes for working with the AI features in this backend (`services/aiService.js`). Written after Dia 35's quality/latency testing, updated through Dia 40's Etapa 3 review — see `tests/quality/` for the checks these numbers come from.

## Model choice

All three text-AI features use `@anthropic-ai/sdk`, chosen over the plan's original OpenAI pick (Dia 26 decision). Since Dia 37, there's real model tiering (the plan's "GPT-3.5 for simple, GPT-4 for complex" idea, adapted to Anthropic's lineup): `explain` uses **Claude Haiku 4.5** — it's short (`max_tokens: 150`), high-volume, and already cached, so it was the best candidate identified back on Dia 35/36 to try a cheaper/faster model on first. `chat` and `remedial` stay on **Claude Sonnet 5**, since they need more reasoning (full conversation history, or structured JSON output from a whole chapter transcript).

Deepgram-based pronunciation transcription (Dia 33) was built and then removed on 2026-07-24 at the user's request (deemed unnecessary) — pronunciation scoring is Web Speech API only again (Dia 18).

## Measured latency (Dia 40, real API, single-run local measurements — not a statistically rigorous benchmark)

| Endpoint                                   | Typical latency | Dia 35 (pre-tiering) |
| ------------------------------------------ | --------------- | -------------------- |
| `explainTechnicalTerm` (`/api/ai/explain`) | ~1.2-2.5s       | ~2.2-2.6s            |
| `chatReply` (`/api/ai/chat`)               | ~5.4-6.2s       | ~5.4-6.2s            |
| `getRemedialContent` (`/api/ai/remedial`)  | ~3.7-4.6s       | ~4.5-5.1s            |

`explain` got noticeably faster after Dia 37's move to Haiku (a real, measured effect, not just a cost saving). `chat` is still the slowest — it's the only one with no caching, always calls the API fresh, and can carry a full conversation history plus chapter/word context; it's also the only endpoint with no streaming (see "Known limitations" below), so the user waits the full ~6s with no partial output. `remedial` sits in between (bigger `max_tokens: 400` for structured JSON output, but a single-turn request like `explain`).

Re-run `npm run test:ai-quality --workspace=packages/backend` to get current numbers — pricing, model versions, and API load all drift over time.

## Cost

Anthropic billing is pay-as-you-go per token (input + output), not a flat subscription.

What reduces cost, as of Dia 37:

- **Redis caching** (Dia 30): `explain` and `remedial` responses are cached 24h and keyed by their exact input, so identical requests (a popular word explained by many users, a chapter's remedial content requested by many students) only hit the API once per cache window.
- `chat` is intentionally **not cached** — conversations are unique per history, caching wouldn't produce hits.
- **Model tiering** (Dia 37): `explain` runs on Claude Haiku 4.5 instead of Sonnet — see "Model choice" above.
- **Per-user rate limiting** (Dia 37): every `/api/ai/*` route (and the voice assistant's `explain` intent) is capped at `AI_DAILY_RATE_LIMIT` requests/user/day (default 50, env-overridable), enforced by `middleware/rateLimiter.js` + `services/rateLimitService.js` via a Redis fixed-window counter. Fails open (allows the request) if Redis is unreachable — same tradeoff as the cache, since a hard block on infra failure would be worse than a temporarily uncapped user. This is checked before the cache/API-key logic, so a cache hit still consumes a slot; the alternative (not counting cache hits) would let a user attempt unlimited real generations by supplying slightly different inputs that always miss cache, defeating the point of the limit.
- **Cost tracking**: `services/costTrackingService.js` logs every real (non-cached) API call to the `ai_usage_log` table — `user_id`, `endpoint`, `model`, `input_tokens`/`output_tokens` (from the Anthropic response's `usage` field), and an `estimated_cost_usd` computed from a hardcoded per-model price table (approximate, update `MODEL_PRICING` if pricing changes). Logging is best-effort: a DB failure is caught and logged server-side, never surfaced to the user or allowed to fail the actual AI response. `GET /api/admin/analytics` (Dia 38) surfaces cost per user, among other signals.
- **Prompt engineering**: every system prompt now explicitly says "no greeting/preamble" (`vá direto à explicação`/`vá direto ao ponto`) — LLMs often spend output tokens on filler ("Claro! Vou explicar...") that costs money and adds latency without adding value in a small popup or chat bubble.

### Actual spend so far (Dia 40 snapshot, `ai_usage_log`)

Real numbers from this project's development/testing usage, not a projection: **16 calls, $0.0146 total**, since cost tracking started on Dia 37 (2026-07-24). `chat` accounts for most of it (3 calls, $0.0103 — ~$0.0034/call) despite being the least-used endpoint, because Sonnet plus full conversation history is inherently more expensive per call than the cached, Haiku-tiered `explain` (13 calls, $0.0044 total — ~$0.0003/call). At this volume the cost is trivially sustainable; the honest caveat is this is dev/test traffic from a handful of manual verification sessions, not real user load — see "Known limitations" below.

## Prompt engineering conventions used so far

- System prompts are short and state the constraint explicitly rather than relying on the model to infer it (e.g. `explain`'s prompt says "no markdown" outright because the response renders in a small popup, not a chat window).
- Structured output (`remedial`) asks for **raw JSON only, no markdown fences**, and the caller (`getRemedialContent`) wraps the parse in a `try/catch` that falls back to treating the whole response as plain text — a malformed model response degrades gracefully instead of crashing the request.
- Context is folded into the **system prompt**, not the user message (`chat`'s `buildChatContext`) — keeps the actual conversation history clean and lets the model treat context as background rather than something the user "said".
- System prompts explicitly forbid greetings/preambles (Dia 37) — cuts wasted output tokens and matches how the response is actually displayed (a popup or chat bubble, not a letter).

## Known limitations (Dia 40 review)

Honest gaps, not oversights — each is a real, deliberate scope decision, listed so a future day can pick one up if it becomes a priority:

- **No streaming responses.** Every endpoint waits for the full generation before responding — worst for `chat` (~6s of dead air with no partial output). A streaming implementation would need `client.messages.stream()` plus an SSE or chunked-response path on both ends; not built because nothing in the plan asked for it yet and the current latency, while not great, hasn't blocked any feature.
- **No automated retry on transient failures.** A single thrown error from `client.messages.create` goes straight to the Dia 39 fallback — there's no "retry once before giving up," so a one-off network blip degrades to fallback content instead of quietly succeeding on a second attempt.
- **Cost model is approximate.** `costTrackingService.js`'s `MODEL_PRICING` table is a hardcoded snapshot of per-token pricing; it isn't fetched from Anthropic and will silently drift out of date if pricing changes. Treat `estimated_cost_usd` as directional, not billing-accurate.
- **Rate limit default is a guess.** `AI_DAILY_RATE_LIMIT=50` (Dia 37) was chosen for plausibility, not tuned against real usage data — there isn't any at meaningful volume yet. It's also one shared bucket across `explain`/`chat`/`remedial` combined, not per-endpoint.
- **Fallback content is generic, not context-aware** (Dia 39). The FAQ/docs/support shown when a real call fails doesn't know what the user actually asked — only `explain`'s dictionary lookup is genuinely responsive to the input; `chat`/`remedial` fallbacks are the same static text regardless of the question or chapter.
- **No conversation memory across sessions.** `chat_messages` stores every turn, but nothing re-injects a user's prior conversations into a new chat session's context — each `ChatWidget` mount starts blank (by design, since it's keyed per-chapter, but worth naming as a real limitation of the tutor's "memory").
- **Content is Portuguese-explanation / English-example only.** Prompts, error messages, and fallback text are hardcoded in Portuguese; there's no locale support, so the product can't currently serve a non-Portuguese-speaking learner.

## Review checklist (Dia 40, closing Etapa 3)

The plan's four checklist items, answered honestly rather than assumed:

- **"IA funciona em 95% dos casos"**: the `tests/quality/` suite (6 checks across explain/chat/remedial, live API) passes 6/6 as of this review. That's a genuine, currently-passing signal, but it's a small curated set of scenarios, not a measurement across real, varied user input at volume — there's no real usage yet to compute an actual success rate against. **Unverified at scale; positive on the available signal.**
- **"Custo é sustentável"**: yes, trivially, at current volume (see "Actual spend so far" above — $0.0146 across 16 calls). This doesn't validate sustainability at real user scale, since dev/test traffic isn't representative — but the levers built across Dias 30/37 (caching, model tiering, rate limiting) are exactly the right shape to keep it sustainable as volume grows.
- **"Usuários acham útil"**: **unverified — there is no real user base.** This is the one item this review genuinely cannot check; the satisfaction-tracking mechanism (Dia 38) exists and works, but has no real feedback volume to report on.
- **"Performance está boa"**: mixed. `explain` is fast and feels instant (~1.2-2.5s, faster since Dia 37's Haiku switch). `chat` at ~6s with no streaming is the weakest point — flagged above as the top candidate for a future latency-focused day.

## Adding a new AI feature — checklist

1. Check `isAiConfigured()` (or the relevant key) before calling out, and return `503` with `AI_NOT_CONFIGURED_ERROR` if it's missing — every existing endpoint does this (see `aiController.js`). Wrap the actual call in `try/catch` and serve fallback content from `aiFallbackService.js` on failure (Dia 39).
2. If the output is a pure function of the input (same inputs → acceptable to reuse the same output), cache it (`cacheService.js`) with a key derived from the inputs. If it's conversational/stateful, don't.
3. Pick the cheapest model that reliably handles the task — short/simple/high-volume favors Haiku, anything needing more reasoning or a longer context window favors Sonnet.
4. Route the endpoint through `aiRateLimit` (or call `rateLimitService.checkRateLimit` directly, as `voiceController.js` does) if it triggers a real API call, and pass `{ userId, endpoint }` into the `aiService` function so `costTrackingService` can log it.
5. Add a quality test to `tests/quality/aiResponseQuality.js` asserting _properties_ of the response (contains X, avoids Y, under N chars) rather than exact text — model output isn't deterministic.
6. Add a latency entry to `tests/quality/aiLatency.js` if the feature is user-facing and latency-sensitive.
7. Update `API.md` with the new endpoint's contract, and this file if the feature changes the cost/latency picture meaningfully.
