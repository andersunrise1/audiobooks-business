# AI Usage Guidelines

Practical notes for working with the AI features in this backend (`services/aiService.js`). Written after Dia 35's quality/latency testing — see `tests/quality/` for the checks these numbers come from.

## Model choice

All three text-AI features use `@anthropic-ai/sdk`, chosen over the plan's original OpenAI pick (Dia 26 decision). Since Dia 37, there's real model tiering (the plan's "GPT-3.5 for simple, GPT-4 for complex" idea, adapted to Anthropic's lineup): `explain` uses **Claude Haiku 4.5** — it's short (`max_tokens: 150`), high-volume, and already cached, so it was the best candidate identified back on Dia 35/36 to try a cheaper/faster model on first. `chat` and `remedial` stay on **Claude Sonnet 5**, since they need more reasoning (full conversation history, or structured JSON output from a whole chapter transcript).

Deepgram-based pronunciation transcription (Dia 33) was built and then removed on 2026-07-24 at the user's request (deemed unnecessary) — pronunciation scoring is Web Speech API only again (Dia 18).

## Measured latency (Dia 35, real API, single-run local measurements — not a statistically rigorous benchmark)

| Endpoint                                   | Typical latency |
| ------------------------------------------ | --------------- |
| `explainTechnicalTerm` (`/api/ai/explain`) | ~2.2-2.6s       |
| `chatReply` (`/api/ai/chat`)               | ~5.4-6.2s       |
| `getRemedialContent` (`/api/ai/remedial`)  | ~4.5-5.1s       |

`explain` is fastest (short `max_tokens: 150`, no context injection). `chat` is slowest — it's the only one with no caching, always calls the API fresh, and can carry a full conversation history plus chapter/word context. `remedial` sits in between (bigger `max_tokens: 400` for structured JSON output, but a single-turn request like `explain`).

Re-run `npm run test:ai-quality --workspace=packages/backend` to get current numbers — pricing, model versions, and API load all drift over time.

## Cost

Anthropic billing is pay-as-you-go per token (input + output), not a flat subscription.

What reduces cost, as of Dia 37:

- **Redis caching** (Dia 30): `explain` and `remedial` responses are cached 24h and keyed by their exact input, so identical requests (a popular word explained by many users, a chapter's remedial content requested by many students) only hit the API once per cache window.
- `chat` is intentionally **not cached** — conversations are unique per history, caching wouldn't produce hits.
- **Model tiering** (Dia 37): `explain` runs on Claude Haiku 4.5 instead of Sonnet — see "Model choice" above.
- **Per-user rate limiting** (Dia 37): every `/api/ai/*` route (and the voice assistant's `explain` intent) is capped at `AI_DAILY_RATE_LIMIT` requests/user/day (default 50, env-overridable), enforced by `middleware/rateLimiter.js` + `services/rateLimitService.js` via a Redis fixed-window counter. Fails open (allows the request) if Redis is unreachable — same tradeoff as the cache, since a hard block on infra failure would be worse than a temporarily uncapped user. This is checked before the cache/API-key logic, so a cache hit still consumes a slot; the alternative (not counting cache hits) would let a user attempt unlimited real generations by supplying slightly different inputs that always miss cache, defeating the point of the limit.
- **Cost tracking**: `services/costTrackingService.js` logs every real (non-cached) API call to the `ai_usage_log` table — `user_id`, `endpoint`, `model`, `input_tokens`/`output_tokens` (from the Anthropic response's `usage` field), and an `estimated_cost_usd` computed from a hardcoded per-model price table (approximate, update `MODEL_PRICING` if pricing changes). Logging is best-effort: a DB failure is caught and logged server-side, never surfaced to the user or allowed to fail the actual AI response. Nothing queries this table yet (no cost dashboard) — that's a natural Etapa 4+ addition once there's a reason to build one.
- **Prompt engineering**: every system prompt now explicitly says "no greeting/preamble" (`vá direto à explicação`/`vá direto ao ponto`) — LLMs often spend output tokens on filler ("Claro! Vou explicar...") that costs money and adds latency without adding value in a small popup or chat bubble.

## Prompt engineering conventions used so far

- System prompts are short and state the constraint explicitly rather than relying on the model to infer it (e.g. `explain`'s prompt says "no markdown" outright because the response renders in a small popup, not a chat window).
- Structured output (`remedial`) asks for **raw JSON only, no markdown fences**, and the caller (`getRemedialContent`) wraps the parse in a `try/catch` that falls back to treating the whole response as plain text — a malformed model response degrades gracefully instead of crashing the request.
- Context is folded into the **system prompt**, not the user message (`chat`'s `buildChatContext`) — keeps the actual conversation history clean and lets the model treat context as background rather than something the user "said".
- System prompts explicitly forbid greetings/preambles (Dia 37) — cuts wasted output tokens and matches how the response is actually displayed (a popup or chat bubble, not a letter).

## Adding a new AI feature — checklist

1. Check `process.env.ANTHROPIC_API_KEY` (or the relevant key) before calling out, and return 503 with a clear message if it's missing — every existing endpoint does this (see `aiController.js`).
2. If the output is a pure function of the input (same inputs → acceptable to reuse the same output), cache it (`cacheService.js`) with a key derived from the inputs. If it's conversational/stateful, don't.
3. Pick the cheapest model that reliably handles the task — short/simple/high-volume favors Haiku, anything needing more reasoning or a longer context window favors Sonnet.
4. Route the endpoint through `aiRateLimit` (or call `rateLimitService.checkRateLimit` directly, as `voiceController.js` does) if it triggers a real API call, and pass `{ userId, endpoint }` into the `aiService` function so `costTrackingService` can log it.
5. Add a quality test to `tests/quality/aiResponseQuality.js` asserting _properties_ of the response (contains X, avoids Y, under N chars) rather than exact text — model output isn't deterministic.
6. Add a latency entry to `tests/quality/aiLatency.js` if the feature is user-facing and latency-sensitive.
7. Update `API.md` with the new endpoint's contract, and this file if the feature changes the cost/latency picture meaningfully.
