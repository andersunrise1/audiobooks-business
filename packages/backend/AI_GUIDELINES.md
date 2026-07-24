# AI Usage Guidelines

Practical notes for working with the AI features in this backend (`services/aiService.js`). Written after Dia 35's quality/latency testing — see `tests/quality/` for the checks these numbers come from.

## Model choice

Every text-AI feature (`explain`, `chat`, `remedial`) uses **Claude Sonnet 5** via `@anthropic-ai/sdk`, chosen over the plan's original OpenAI pick (Dia 26 decision). There's no cheap/expensive model tiering like the plan's "GPT-3.5 for simple, GPT-4 for complex" idea (Dia 37) — a single model is used everywhere for now. If cost pressure shows up later, `explain` (short, high-volume, cacheable) is the best candidate to try a cheaper/faster model on first, since it's the least conversationally demanding of the three.

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

Anthropic billing is pay-as-you-go per token (input + output), not a flat subscription. There is **no cost tracking or per-user rate limiting implemented yet** (the plan's Dia 37 items) — this is an honest gap, not an oversight. Until that exists, a single user (or a bug causing repeated calls) has no hard ceiling on API spend.

What already reduces cost, from earlier days:

- **Redis caching** (Dia 30): `explain` and `remedial` responses are cached 24h and keyed by their exact input, so identical requests (a popular word explained by many users, a chapter's remedial content requested by many students) only hit the API once per cache window.
- `chat` is intentionally **not cached** — conversations are unique per history, caching wouldn't produce hits.

## Prompt engineering conventions used so far

- System prompts are short and state the constraint explicitly rather than relying on the model to infer it (e.g. `explain`'s prompt says "no markdown" outright because the response renders in a small popup, not a chat window).
- Structured output (`remedial`) asks for **raw JSON only, no markdown fences**, and the caller (`getRemedialContent`) wraps the parse in a `try/catch` that falls back to treating the whole response as plain text — a malformed model response degrades gracefully instead of crashing the request.
- Context is folded into the **system prompt**, not the user message (`chat`'s `buildChatContext`) — keeps the actual conversation history clean and lets the model treat context as background rather than something the user "said".

## Adding a new AI feature — checklist

1. Check `process.env.ANTHROPIC_API_KEY` (or the relevant key) before calling out, and return 503 with a clear message if it's missing — every existing endpoint does this (see `aiController.js`).
2. If the output is a pure function of the input (same inputs → acceptable to reuse the same output), cache it (`cacheService.js`) with a key derived from the inputs. If it's conversational/stateful, don't.
3. Add a quality test to `tests/quality/aiResponseQuality.js` asserting _properties_ of the response (contains X, avoids Y, under N chars) rather than exact text — model output isn't deterministic.
4. Add a latency entry to `tests/quality/aiLatency.js` if the feature is user-facing and latency-sensitive.
5. Update `API.md` with the new endpoint's contract, and this file if the feature changes the cost/latency picture meaningfully.
