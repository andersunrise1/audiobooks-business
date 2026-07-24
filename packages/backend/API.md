# TechSpeak API

Base URL (dev): `http://localhost:3000`

All request/response bodies are JSON. Authenticated routes require an `Authorization: Bearer <accessToken>` header; the access token expires after 15 minutes (`packages/backend/src/utils/jwt.js`) — use `POST /api/auth/refresh-token` to get a new one without asking the user to log in again.

## Health

### `GET /api/health`

No auth. Returns `{ "status": "ok" }`.

## Auth (`/api/auth`)

### `POST /api/auth/register`

Body: `{ "email", "password", "name"? }`
201 → `{ "user": { id, email, name, plan }, "accessToken", "refreshToken" }`
409 if the email is already registered.

### `POST /api/auth/login`

Body: `{ "email", "password" }`
200 → same shape as register. 401 on invalid credentials.

### `POST /api/auth/refresh-token`

Body: `{ "refreshToken" }`
200 → `{ "accessToken" }`. 401 if the refresh token is invalid/expired or the user no longer exists.

## Audiobooks (`/api/audiobooks`)

All routes here are public (no auth required) — read-only catalog data.

### `GET /api/audiobooks`

200 → array of `{ id, title, description, category, duration_minutes, level, created_at }`.

### `GET /api/audiobooks/:id`

200 → the full audiobook row. 404 if not found.

### `GET /api/audiobooks/:id/chapters`

200 → array of `{ id, audiobook_id, title, order_index, audio_url, duration_seconds, transcript, created_at }`, ordered by `order_index`.

### `GET /api/audiobooks/chapters/:chapterId/words`

200 → array of timestamped words for the chapter: `{ id, word, pronunciation, portuguese_translation, technical_explanation, example_sentence, part_of_speech, contexts, chapter_id, start_seconds, end_seconds }`, ordered by `start_seconds`.
`portuguese_translation` / `technical_explanation` / `example_sentence` fall back to the `technical_dictionary` entry (matched case-insensitively on the word) when the per-chapter row doesn't have them filled in. `part_of_speech` and `contexts` always come from the dictionary — the per-chapter `words` table doesn't store those.

## Dictionary (`/api/dictionary`)

### `GET /api/dictionary/:word`

No auth. Looks up a word in the canonical `technical_dictionary` table (case-insensitive). 200 → `{ word, part_of_speech, portuguese_translation, technical_explanation, example_sentence, contexts }`. 404 if not found.

## AI (`/api/ai`) — requires auth

Responses for `explain` and `remedial` are cached in Redis (24h TTL, best-effort — a Redis outage just skips the cache, it never breaks the request). A cache hit adds `"cached": true` to the response and skips the `ANTHROPIC_API_KEY` check entirely.

### `POST /api/ai/explain`

Body: `{ "word", "context" }`. Asks Claude (`@anthropic-ai/sdk`, model `claude-sonnet-5`) to explain the word in that context, as a technical-English tutor. 200 → `{ "word", "explanation", "cached"? }`. 400 if `word`/`context` is missing. 503 if `ANTHROPIC_API_KEY` isn't configured on the server (unless served from cache).

### `POST /api/ai/chat`

Body: `{ "messages": [{ "role": "user"|"assistant", "content" }], "chapterId"?, "wordId"? }` — send the full conversation history each turn. When `chapterId` is given, the chapter's title/transcript are folded into the system prompt so the tutor has real context; `wordId` additionally includes that word's translation/explanation. 200 → `{ "reply" }`. Every turn (latest user message + reply) is persisted to `chat_messages` (`message_type` is `'vocabulary'` when `wordId` is present, `null` otherwise). 400 if `messages` is missing/empty. 503 if `ANTHROPIC_API_KEY` isn't configured. Not cached — conversations are unique per history.

### `POST /api/ai/remedial`

Body: `{ "chapterId" }`. For a student who said they didn't understand a chapter: asks Claude for a summary/keywords/exercise based on the chapter's transcript. 200 → `{ "summary", "keywords": [...], "exercise", "cached"? }` — if the model's JSON response fails to parse, `summary` falls back to the raw text and `keywords`/`exercise` are empty rather than erroring. 400 if `chapterId` is missing, 404 if the chapter doesn't exist, 422 if it has no transcript yet, 503 if `ANTHROPIC_API_KEY` isn't configured (unless served from cache) — checked in that order, so a bad request isn't masked by the AI-unavailable case.

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

| Phrases                                      | `intent`       | Response                                                                                                                                                             |
| -------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "explain X", "what does X mean", "what is X" | `explain`      | `{ intent: "explain", word, explanation }` — calls the same AI explanation flow as `/api/ai/explain` (not cached here). 503 if `ANTHROPIC_API_KEY` isn't configured. |
| "next chapter", "play next chapter"          | `next_chapter` | `{ intent: "next_chapter" }` — pure signal, the frontend handles the actual navigation.                                                                              |
| "my progress", "check my progress"           | `progress`     | `{ intent: "progress", stats }` — `stats` has the same shape as `GET /api/user/stats`.                                                                               |
| anything else                                | `unknown`      | `{ intent: "unknown", transcript }`                                                                                                                                  |

## Error shape

Non-2xx responses are `{ "error": "message" }`. For unexpected 5xx errors the message is always the generic `"Internal server error"` — the real error is logged server-side but never sent to the client (see `middleware/errorHandler.js`).
