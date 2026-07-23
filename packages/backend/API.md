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

## Error shape

Non-2xx responses are `{ "error": "message" }`. For unexpected 5xx errors the message is always the generic `"Internal server error"` — the real error is logged server-side but never sent to the client (see `middleware/errorHandler.js`).
