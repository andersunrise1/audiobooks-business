# TechSpeak API

Base URL (dev): `http://localhost:3000`

All request/response bodies are JSON. Authenticated routes require an `Authorization: Bearer <accessToken>` header; the access token expires after 15 minutes (`packages/backend/src/utils/jwt.js`) — use `POST /api/auth/refresh-token` to get a new one without asking the user to log in again.

## Health

### `GET /api/health`

No auth. Returns `{ "status": "ok" }`.

## Auth (`/api/auth`)

### `POST /api/auth/register`

Body: `{ "email", "password", "name"? }`
201 → `{ "user": { id, email, name, plan, isAdmin }, "accessToken", "refreshToken" }`
409 if the email is already registered.

### `POST /api/auth/login`

Body: `{ "email", "password" }`
200 → same shape as register. 401 on invalid credentials.

### `POST /api/auth/refresh-token`

Body: `{ "refreshToken" }`
200 → `{ "accessToken" }`. 401 if the refresh token is invalid/expired or the user no longer exists.

### `GET /api/auth/me` — requires auth

200 → `{ "user": { id, email, name, plan, isAdmin } }`, read fresh from the DB (unlike the JWT
payload, this reflects any changes since login — e.g. `plan` after a successful payment). 404 if
the user no longer exists.

## Audiobooks (`/api/audiobooks`)

Browsing the catalog is public (no auth required); reading a non-free audiobook's chapter content requires TechSpeak Vitalício (Dia 49 — see "Free-tier paywall" below). Every endpoint here only ever returns **published** audiobooks (Dia 51-52: `published_at IS NOT NULL AND published_at <= now()`) — a draft or scheduled-for-the-future audiobook 404s here exactly as if it didn't exist; `GET /api/admin/audiobooks/:id` is the only way to see/preview one before it's live.

### `GET /api/audiobooks`

200 → array of `{ id, title, description, category, duration_minutes, level, is_free, created_at }`.

### `GET /api/audiobooks/:id`

200 → the full audiobook row (includes `is_free`). 404 if not found.

### `GET /api/audiobooks/:id/chapters`

Auth optional — a valid bearer token is only used to check `plan` for non-free audiobooks; anonymous requests are always treated as free-plan. 200 → array of `{ id, audiobook_id, title, order_index, audio_url, duration_seconds, transcript, created_at }`, ordered by `order_index`. 404 if the audiobook doesn't exist. 403 (`{ "error": "Este audiobook faz parte do TechSpeak Vitalicio..." }`) if the audiobook isn't `is_free` and the caller isn't authenticated with `plan` `pro`/`corporate`.

### Free-tier paywall (Dia 49)

Two audiobooks ("Daily Standup", "Remote Work Communication" — one technical, one career-focused) are marked `is_free = true` in the DB and playable by anyone, matching `PRICING.md`'s Free trial. Every other audiobook requires Vitalício. This only gates chapter content (`GET /:id/chapters`); the catalog list/detail endpoints and `GET /chapters/:chapterId/words` are unaffected, since translation lookups don't call the AI and cost nothing to serve regardless of plan.

### `GET /api/audiobooks/chapters/:chapterId/words`

200 → array of timestamped words for the chapter: `{ id, word, pronunciation, portuguese_translation, technical_explanation, example_sentence, part_of_speech, contexts, chapter_id, start_seconds, end_seconds }`, ordered by `start_seconds`.
`portuguese_translation` / `technical_explanation` / `example_sentence` fall back to the `technical_dictionary` entry (matched case-insensitively on the word) when the per-chapter row doesn't have them filled in. `part_of_speech` and `contexts` always come from the dictionary — the per-chapter `words` table doesn't store those.

## Dictionary (`/api/dictionary`)

### `GET /api/dictionary/:word`

No auth. Looks up a word in the canonical `technical_dictionary` table (case-insensitive). 200 → `{ word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts }`. 404 if not found.

## AI (`/api/ai`) — requires auth

Responses for `explain` and `remedial` are cached in Redis (24h TTL, best-effort — a Redis outage just skips the cache, it never breaks the request). A cache hit adds `"cached": true` to the response and skips the `ANTHROPIC_API_KEY` check entirely.

The routes that actually trigger a real AI call (`explain`, `chat`, `remedial`) are rate-limited per user (Dia 37), **plan-aware since Dia 49**: `AI_DAILY_RATE_LIMIT_FREE` requests/day for `plan = 'free'` (default 1) vs. `AI_DAILY_RATE_LIMIT_PRO` for `pro`/`corporate` (default 10) — a rolling 24h window, Redis-backed, fails open (allows the request) if Redis is unreachable. This is deliberately not "unlimited for paying users" — see `MONETIZATION.md`'s "AI cost problem". Responses carry `X-RateLimit-Limit`/`X-RateLimit-Remaining` headers; exceeding the limit returns 429 with `{ "error": "Limite diário de N requisições de IA atingido. Tente novamente amanhã." }`. This is checked before the `ANTHROPIC_API_KEY`/cache logic, so it applies even to requests that would otherwise be free (a cache hit still counts). The feedback route below is not AI-triggering and isn't rate-limited.

If `ANTHROPIC_API_KEY` **is** configured but the real call throws (Anthropic outage, rate limit, network error/timeout), all three routes below return **200** with graceful fallback content instead of an error (Dia 39, `services/aiFallbackService.js`) — distinct from the 503 case, which means the key itself is missing. A fallback response always adds `"fallback": true`, `"faq": [{ "question", "answer" }]`, `"externalDocsUrl"`, and `"supportContact"` on top of its normal shape.

### `POST /api/ai/explain`

Body: `{ "word", "context" }`. Asks Claude (`@anthropic-ai/sdk`, model `claude-haiku-4-5` — Dia 37 tiering, since this is short/high-volume/cacheable) to explain the word in that context, as a technical-English tutor. 200 → `{ "word", "explanation", "cached"? }`. 400 if `word`/`context` is missing. 503 if `ANTHROPIC_API_KEY` isn't configured on the server (unless served from cache). On a real call failure: 200 with `explanation` from the `technical_dictionary` (Dia 16) if the word is in it, otherwise `explanation: null` — either way `fallback: true` plus the FAQ/docs/support fields.

### `POST /api/ai/chat`

Body: `{ "messages": [{ "role": "user"|"assistant", "content" }], "chapterId"?, "wordId"? }` — send the full conversation history each turn. When `chapterId` is given, the chapter's title/transcript are folded into the system prompt so the tutor has real context; `wordId` additionally includes that word's translation/explanation. 200 → `{ "reply", "messageId" }` (`messageId` added Dia 38, used by the feedback endpoint below). Every turn (latest user message + reply) is persisted to `chat_messages` (`message_type` is `'vocabulary'` when `wordId` is present, `null` otherwise). 400 if `messages` is missing/empty. 503 if `ANTHROPIC_API_KEY` isn't configured. Not cached — conversations are unique per history. On a real call failure: 200 with a generic fallback `reply` and no `messageId` — nothing is persisted to `chat_messages`, since a fallback reply isn't a real tutor turn.

### `PATCH /api/ai/chat/:messageId/feedback`

Body: `{ "feedback" }` — one of `"helpful"`, `"not_helpful"`, or `null` (clears it). 200 → `{ "id", "feedback" }`. 400 if `feedback` isn't one of those three values. 404 if the message doesn't exist or doesn't belong to the caller. Not rate-limited (doesn't call the AI). Powers the 👍/👎 buttons on `ChatWidget` and the satisfaction rate in `GET /api/admin/analytics` below.

### `POST /api/ai/remedial`

Body: `{ "chapterId" }`. For a student who said they didn't understand a chapter: asks Claude for a summary/keywords/exercise based on the chapter's transcript. 200 → `{ "summary", "keywords": [...], "exercise", "cached"? }` — if the model's JSON response fails to parse, `summary` falls back to the raw text and `keywords`/`exercise` are empty rather than erroring. 400 if `chapterId` is missing, 404 if the chapter doesn't exist, 422 if it has no transcript yet, 503 if `ANTHROPIC_API_KEY` isn't configured (unless served from cache) — checked in that order, so a bad request isn't masked by the AI-unavailable case. On a real call failure: 200 with a generic fallback `summary`, empty `keywords`/`exercise`.

## User (`/api/user`) — all routes require auth

### `GET /api/user/progress`

200 → array of the caller's `user_progress` rows (one per chapter they've interacted with): `{ id, user_id, chapter_id, words_learned, listening_count, completed, last_accessed, created_at }`.

### `POST /api/user/progress/:chapterId`

Body: `{ "wordsLearned"?, "listeningCount"?, "completed"? }` — any subset; omitted fields keep their current value (upsert). 200 → the updated row.

### `POST /api/user/words-learned`

Body: `{ "chapterId", "wordId" }`. Records the click in `word_clicks` (analytics), increments `user_progress.words_learned` for that chapter, and ensures a `flashcards` row exists for the word (created once, `ON CONFLICT DO NOTHING` — later clicks don't reset its SRS progress). 201 → the updated `user_progress` row. 400 if either id is missing.

### `GET /api/user/flashcards`

200 → array of the caller's flashcards joined with word data, ordered by `next_review` (soonest/never-reviewed first): `{ id, user_id, word_id, learning_status, ease_factor, interval_days, review_count, last_reviewed, next_review, word, portuguese_translation, technical_explanation, example_sentence }`.

### `POST /api/user/flashcards/:id/review`

Body: `{ "quality" }` — 0-5, how well the word was recalled (SM-2 scale; <3 counts as a lapse). Applies `srsService.applySm2` and updates `ease_factor`, `interval_days`, `review_count`, `learning_status` (`new`/`learning`/`mastered`), and `next_review`. 200 → the updated flashcard. 400 if `quality` is missing/out of range, 404 if the flashcard doesn't belong to the caller.

### `GET /api/user/stats`

200 → dashboard summary:

```json
{
  "wordsLearned": { "today": 0, "week": 0, "month": 0 },
  "flashcardsDue": 0,
  "totalStudyMinutes": 0,
  "streakDays": 0,
  "audiobooksInProgress": [
    { "audiobookId": "...", "title": "...", "chaptersStarted": 0, "chaptersTotal": 0 }
  ]
}
```

`wordsLearned` counts distinct words clicked (from `word_clicks`). `totalStudyMinutes` is an approximation (`chapters.duration_seconds × user_progress.listening_count`, summed) — there's no dedicated listening-session/time tracking yet. `streakDays` is computed by `statsService.computeStreakDays` from distinct activity dates.

### `GET /api/user/difficulty-profile`

200 → a per-user difficulty snapshot:

```json
{
  "struggledWords": [{ "wordId": "...", "word": "...", "clickCount": 0 }],
  "lowCompletionChapters": [
    {
      "chapterId": "...",
      "title": "...",
      "completedCount": 0,
      "attemptedCount": 0,
      "completionRate": 0
    }
  ],
  "frequentQuestionChapters": [{ "chapterId": "...", "title": "...", "questionCount": 0 }]
}
```

`struggledWords` only includes words the caller has clicked more than once (from `word_clicks`), ordered by click count. `lowCompletionChapters` is a content-level signal computed across **every** user, not just the caller — chapters with the lowest completion rate first. `frequentQuestionChapters` counts the caller's `chat_messages` per chapter, most-asked first.

### `GET /api/user/chapters/:chapterId/repeated-words`

200 → array of `{ wordId, word, previousClickCount }` — words in this chapter (matched by text, case-insensitive) that the caller has struggled with (clicked more than once, in this chapter or any other). Empty array if none match or the chapter doesn't exist.

### `GET /api/user/study-priority`

200 → array of the caller's non-mastered flashcards, ranked for review: `{ id, wordId, word, portugueseTranslation, technicalExplanation, exampleSentence, learningStatus, easeFactor, intervalDays, reviewCount, lastReviewed, nextReview, clickCount }`. Ordered by `clickCount` (from `word_clicks`) descending first, then by `nextReview` ascending (never-reviewed/most-overdue first) — a word clicked often but not yet due still outranks one clicked once that happens to be due now. `mastered` flashcards are excluded.

### `GET /api/user/recommendations`

200 → rule-based (not AI-generated) suggestions:

```json
{
  "nextChapter": {
    "audiobookId": "...",
    "audiobookTitle": "...",
    "chapterId": "...",
    "chapterTitle": "...",
    "orderIndex": 0
  },
  "recommendedAudiobook": {
    "audiobookId": "...",
    "title": "...",
    "category": "...",
    "level": "...",
    "matchesPreference": true
  },
  "bestStudyHour": { "hour": 0, "activityCount": 0 }
}
```

Any of the three can be `null`. `nextChapter` is the lowest-`order_index` incomplete chapter in the audiobook the caller most recently accessed (`null` if they have no progress anywhere, or have finished every chapter in that audiobook). `recommendedAudiobook` is an audiobook the caller hasn't started, preferring the category/level they engage with most (`null` if they've started everything). `bestStudyHour` is the hour of day (0-23, server timezone — no per-user timezone tracking exists yet) with the most `word_clicks` activity historically (`null` with no click history).

## Voice (`/api/voice`) — requires auth

### `POST /api/voice/command`

Body: `{ "transcript", "context"? }` — a Web Speech API transcript (e.g. from the browser's `SpeechRecognition`), plus optional context (the current chapter's transcript) to improve `explain` results. Parsing is regex-based, not an LLM call — a fixed MVP command set, not general-purpose intent recognition. 400 if `transcript` is missing.

Response shape depends on the recognized intent:

| Phrases                                      | `intent`       | Response                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "explain X", "what does X mean", "what is X" | `explain`      | `{ intent: "explain", word, explanation }` — calls the same AI explanation flow as `/api/ai/explain` (not cached here). 503 if `ANTHROPIC_API_KEY` isn't configured. 429 if the caller has hit the daily AI rate limit (checked here too, not just on `/api/ai/*`), logged separately as endpoint `voice_explain`. On a real call failure: 200 with the same `fallback`/dictionary-lookup content as `/api/ai/explain` (Dia 39). |
| "next chapter", "play next chapter"          | `next_chapter` | `{ intent: "next_chapter" }` — pure signal, the frontend handles the actual navigation.                                                                                                                                                                                                                                                                                                                                          |
| "my progress", "check my progress"           | `progress`     | `{ intent: "progress", stats }` — `stats` has the same shape as `GET /api/user/stats`.                                                                                                                                                                                                                                                                                                                                           |
| anything else                                | `unknown`      | `{ intent: "unknown", transcript }`                                                                                                                                                                                                                                                                                                                                                                                              |

## Admin (`/api/admin`) — requires auth + `is_admin`

`is_admin` is a boolean column on `users` (migration 008, default `false`). The very first admin has to be set directly in the database — after that, an existing admin can promote/demote others via `PATCH /api/admin/users/:id` below. Non-admins get 403.

### `GET /api/admin/analytics`

200 → AI usage analytics aggregated across every user (Dia 38):

```json
{
  "questionsPerChapter": [{ "chapterId": "...", "title": "...", "questionCount": 0 }],
  "avgResponseTime": [{ "endpoint": "explain", "avgResponseTimeMs": 0, "callCount": 0 }],
  "satisfaction": { "helpfulCount": 0, "notHelpfulCount": 0, "satisfactionRate": null },
  "costPerUser": [{ "userId": "...", "email": "...", "totalCostUsd": 0, "requestCount": 0 }]
}
```

`questionsPerChapter` counts every `chat_messages` row (all users), most-asked first. `avgResponseTime` is computed from `ai_usage_log.response_time_ms`, only populated for calls made since Dia 38 (older rows have `NULL` and are excluded, not counted as 0). `satisfaction` comes from the 👍/👎 buttons on `ChatWidget` via the feedback endpoint above; `satisfactionRate` is `null` until at least one message has feedback. `costPerUser` sums `ai_usage_log.estimated_cost_usd` per user, most expensive first.

### `POST /api/admin/audiobooks`

`multipart/form-data` body: `title`, `transcript` (required), `description`/`category`/`level`/`chapterTitle`/`publishedAt` (optional), `words_metadata` (optional, a JSON array like `[{ "word", "start_seconds"?, "end_seconds"? }]` — timestamps are supplied by the uploader, not auto-generated; Deepgram was removed on Dia 33 at the user's request and isn't reintroduced here), `audio_file` (required, one of `audio/mpeg`, `audio/mp3`, `audio/wav`, `audio/x-wav`, `audio/mp4`, `audio/m4a`, `audio/x-m4a`). Creates one new `audiobooks` row plus a single `chapters` row (`order_index: 1`) with the uploaded file's S3 URL, plus a `words` row per `words_metadata` entry. 201 → `{ "audiobookId", "chapterId", "audioUrl", "publishedAt" }`. 400 if `title`/`transcript` is missing, the file is missing, the format is unsupported, `words_metadata` isn't a JSON array, or `publishedAt` isn't a valid date. 503 if AWS S3 isn't configured (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_REGION`/`AWS_S3_BUCKET` — none of which are set in this dev environment, so the real upload path is unverified beyond a mocked S3 call in tests). No audio transcoding/normalization — files are stored as uploaded (Dia 43).

**Dia 51-52 CMS behavior change**: unlike the Dia 43 version of this endpoint, omitting `publishedAt` now creates the audiobook as a **draft** (`published_at = NULL`, invisible to the public catalog) rather than going live immediately — a deliberate change so a partially-prepared upload can be reviewed before anyone else can see it. Pass `publishedAt` (an ISO date string) to publish immediately (a past/present date) or schedule a future launch.

### `GET /api/admin/audiobooks`

200 → array of every audiobook regardless of publish state — `{ id, title, description, category, level, is_free, published_at, created_at }` — for the CMS's content list. `published_at: null` is a draft; a future date is scheduled; a past/present date is live.

### `GET /api/admin/audiobooks/:id`

200 → the full audiobook row plus `chapters: [{ id, title, order_index, audio_url, duration_seconds, transcript }]`, regardless of publish state or the free-tier paywall (Dia 49) — this is the CMS preview endpoint, not the public one. 404 if not found.

### `POST /api/admin/audiobooks/:id/publish`

Body: `{ "publishedAt"? }` (optional ISO date string). Sets `audiobooks.published_at` — omitting the body publishes immediately (`now()`); passing a future date schedules it instead. 200 → `{ "id", "title", "published_at" }`. 400 if `publishedAt` is present but invalid. 404 if the audiobook doesn't exist.

### `POST /api/admin/audiobooks/:id/unpublish`

Sets `audiobooks.published_at` back to `NULL` (reverts to draft, hides it from the public catalog immediately regardless of a prior schedule). 200 → `{ "id", "title", "published_at" }`. 404 if the audiobook doesn't exist.

### `GET /api/admin/users`

200 → array of every user: `{ id, email, name, plan, isAdmin, createdAt }` (no `passwordHash`), newest first.

### `PATCH /api/admin/users/:id`

Body: `{ "isAdmin" }` (boolean). 200 → the updated user, same shape as above. 400 if `isAdmin` isn't a boolean, or if the caller is trying to remove their own admin access (there's no self-service way back in, since `is_admin` is DB-only — this would permanently lock a lone admin out). 404 if the user doesn't exist.

## Payment (`/api/payment`)

`TechSpeak Vitalício` is a one-time purchase (Dia 46's pricing decision — see `PRICING.md`), not a subscription, so this is a single Stripe Checkout Session in `payment` mode, not `create-subscription`/webhooks-for-renewal as the plan's original draft assumed. See `PAYMENT_TROUBLESHOOTING.md` for how to test this against a real Stripe test-mode account once one exists, and common failure modes.

### `POST /api/payment/create-checkout-session` — requires auth

No body. Creates a Stripe Checkout Session for the R$ 57 lifetime purchase, with `metadata.userId` set to the caller's id so the webhook below knows who to grant access to. 200 → `{ "url" }` — the frontend redirects the browser here. 400 if the caller already has `plan = 'pro'`. 503 if `STRIPE_SECRET_KEY` isn't configured (true in this dev environment — no real Stripe account exists yet).

### `POST /api/payment/webhook`

No auth (Stripe calls this directly) — authenticated instead by verifying the `Stripe-Signature` header against `STRIPE_WEBHOOK_SECRET`. Unlike every other route, this one reads the **raw** request body (registered before the global `express.json()` middleware in `app.js`), since Stripe's signature check requires the exact bytes it signed. On `checkout.session.completed`, sets `users.plan = 'pro'` for `event.data.object.metadata.userId`. Every other event type is acknowledged (200) without action. 200 → `{ "received": true }`. 400 on an invalid signature. 503 if `STRIPE_WEBHOOK_SECRET` isn't configured.

## Error shape

Non-2xx responses are `{ "error": "message" }`. For unexpected 5xx errors the message is always the generic `"Internal server error"` — the real error is logged server-side but never sent to the client (see `middleware/errorHandler.js`).
