# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Implementation has started, following [Projeto_detalhado/PROJETO_AUDIOBOOK_PLANO_DETALHADO.md](Projeto_detalhado/PROJETO_AUDIOBOOK_PLANO_DETALHADO.md) (full 20-week plan: architecture, DB schema, API routes, pricing, commit/branch conventions). **Etapa 1 / Semana 1-2 (Dias 1-10) is done**: monorepo scaffold, backend (Express + PostgreSQL, DB schema/migrations, auth/audiobook/progress endpoints, JWT), web (React + Vite + React Router + Tailwind v4, layout, auth pages, protected routes), desktop (Electron reusing `web/`'s React, IPC handlers, SQLite offline cache, auto-sync with backend), and CI (GitHub Actions test/lint/deploy-staging, Husky pre-commit). **Etapa 2 / Semana 3, Dia 11-12 is done**: audio player component (`packages/web/src/components/features/AudioPlayer.jsx` — play/pause, seek, volume, speed control) wired into `PlayerPage`, which fetches chapters per audiobook and persists listening progress via the existing `/api/user/progress` endpoints. `words` gained `start_seconds`/`end_seconds` (migration 002) and a `GET /api/audiobooks/chapters/:chapterId/words` endpoint; `useWordSync` + `TranscriptDisplay` highlight the word matching current playback time, falling back to plain `chapter.transcript` when no timestamped words exist yet. **Dia 13-14 is done**: clicking a transcript word opens `TranslationPopup` (translation, pronunciation, technical explanation, example sentence), auto-closing after 3s, and also POSTs to `/api/user/words-learned` — this increments `user_progress.words_learned` for the chapter and logs the event to a new `word_clicks` table (migration 003) for future analytics (difficulty analysis, Dia 31). **Dia 15 (manual part) is done**: full flow verified against a real local Postgres — register → login → audiobooks list → player → real audio playback → word highlighting → translation popup → word-click and completion progress persisted correctly. Automated e2e tests (Playwright/Vitest) are not set up yet. **Dia 16 is done**: a `technical_dictionary` table (migration 004, seeded with 24 real terms in 005) provides canonical part-of-speech/translation/explanation/example/contexts per word, standalone at `GET /api/dictionary/:word`. `getChapterWords` now LEFT JOINs it so any per-chapter `words` row missing translation/explanation/example falls back to the dictionary entry; `part_of_speech`/`contexts` always come from there since chapter-level `words` doesn't store them. `TranslationPopup` displays both. **Dia 17 is done**: clicking a word now also auto-creates a `flashcards` row (`ON CONFLICT DO NOTHING`). SM-2 spaced repetition lives in `packages/backend/src/services/srsService.js` (pure function, unit-testable), applied via `POST /api/user/flashcards/:id/review` `{quality: 0-5}`. `FlashcardReviewPage` (`/flashcards`) shows one due card at a time, reveal-then-rate. Verified against real Postgres — caught and fixed a real bug ([c1beed7](https://github.com/andersunrise1/audiobooks-business/commit/c1beed7)) where Postgres couldn't infer a type for a param used both as `int` and concatenated into an interval string; fixed with `make_interval(days => $2::int)`. **Dia 18 is done**: `PronunciationRecorder` (below the transcript in `PlayerPage`) uses the browser's Web Speech API (`SpeechRecognition`/`webkitSpeechRecognition`, no Deepgram yet) to record and transcribe the user reading a chapter's sentence, then `utils/pronunciationScore.js` gives a rough word-overlap score (0-100%) with matched/unmatched words highlighted green/red. Falls back to a "not supported" message if the browser lacks the API; mic-permission errors are caught and shown in Portuguese. **Dia 19 is done**: `GET /api/user/stats` (words learned today/week/month from `word_clicks`, flashcards due, approximate total study time from `chapters.duration_seconds * user_progress.listening_count`, day streak via `statsService.computeStreakDays` — pure function, unit-tested with several gap/edge scenarios — and audiobooks in progress). `DashboardPage` renders it with `StatCard`/`AudiobookProgressList`. Verified against real data end-to-end. **Dia 20 is done, closing Etapa 2 / Semana 4**: `packages/web/src/services/desktopBridge.js` wraps `window.techspeak` (undefined/no-op outside Electron) — `AuthContext` now pushes the session into the desktop main process on login/logout (previously dead code, since nothing ever called `auth:setSession`), and `PlayerPage.saveProgress` falls back to `queueDesktopProgress` when the API call fails. Offline audio playback: `packages/desktop/public/audioCache.js` downloads a chapter's audio to `userData/audio-cache/` and records it in a new `audio_cache` SQLite table (`db.js`); `PlayerPage` resolves a chapter's audio `src` through `cache.getCachedAudioPath` first (falling back to the remote URL and kicking off a background download when on desktop). Verified: the download/cache logic works end-to-end via a plain-Node functional test (real download, cache hit on 2nd call); the web-side fallback (no `window.techspeak`) was verified in-browser to behave exactly as before. **Not verified: an actual packaged/running Electron window** — these tools only drive a regular browser tab against the Vite dev server, not `electron .`; the IPC wiring itself is untested end-to-end inside Electron.

**Dia 21 is done**: backend testing uses Node's built-in test runner (`node --test`, zero new dependencies) instead of Vitest — `packages/backend/src/index.js` was split into `app.js` (`createApp()` factory, importable without binding a port) + a thin `index.js` entrypoint. `tests/unit/` covers `srsService`/`statsService` pure functions; `tests/integration/` (`auth.test.js`, `player.test.js`, matching the plan's exact filenames) spins up a real server on an ephemeral port against the actual local Postgres and cleans up its fixtures afterward. `npm run test:coverage --workspace=packages/backend` runs `--experimental-test-coverage`; CI's `test.yml` now posts the coverage table to the GitHub Actions job summary. Also fixed along the way: CI's `lint` job (which runs `prettier --check`) had been silently failing since Dia 11 or so because the Husky pre-commit hook only ran `eslint`, never `format:check` — added it to pre-commit and reformatted the 3 affected files.

**Dia 22 is done**: `packages/web` now has Vitest + React Testing Library (`npm test` → `vitest run`; `npm run test:watch` for local dev). Component tests cover `pronunciationScore`, `useWordSync`, `StatCard`, `TranscriptDisplay`; integration tests (`LoginPage.test.jsx`, `PlayerPage.test.jsx`) mock `services/api.js` and render through the real `AuthProvider` + React Router, exercising the exact login and word-click flows verified manually in-browser earlier this project — 19 tests total, all passing.

**Dia 23 is done, scoped to what's real at this stage**: `AudioPlayer`'s `<audio>` now uses `preload="metadata"` (don't download full audio until played); every route except `/` is `React.lazy()`-loaded behind a `Suspense` boundary; `vite.config.js` splits React/ReactDOM/React Router into a dedicated `vendor` chunk via `manualChunks` (note: Vite 8's Rolldown bundler requires `manualChunks` as a function, not the classic Rollup object form). All three verified against a real production build — per-route and vendor chunks confirmed loading independently via network requests. The plan's other two Dia 23 items ("caching de imagens", "compressão de áudio") were skipped honestly: there's no cover-image field/UI yet and no audio upload/processing pipeline (that's Etapa 4, Dia 43+) — nothing real to optimize yet.

**Dia 24 is done**: fixed a real mobile bug — `Sidebar` (with the `Flashcards` link) is `hidden` below the `sm` breakpoint with no replacement, so mobile users had no way to reach `/flashcards`; `Navbar` now carries all primary links itself and wraps (`flex-wrap`) instead of overflowing on narrow screens. `Layout`'s main area got `min-w-0` (prevents flex children from forcing horizontal scroll) and tighter mobile padding. Touch targets were measured for real at 375px width via `getBoundingClientRect()` and enlarged where under ~40px: play button 40→44px, speed buttons 28→36px tall, transcript word spans 26→40px tall; `touch-manipulation` added throughout to drop the ~300ms tap delay. Verified visually at mobile (375×812) and tablet (768×1024) via `resize_window` on the home, dashboard, and player pages.

Next up per the plan: Dia 25 (Review & Bug Fixes) — the last day of Etapa 2 / Semana 5, closing out the audiobook player & translation phase before Etapa 3 (IA & Chat) begins.

Other docs:
- [Audiobooks_English_Business.txt](Audiobooks_English_Business.txt) — product positioning/pitch notes.
- [CONTRIBUTING.md](CONTRIBUTING.md) — dev setup, commit/branch conventions, what CI runs.
- `arquivos_zipado_do_projeto.zip` is a duplicate archive of the same planning docs; not a code drop.

### Local database (dev)

A local PostgreSQL 17 instance is installed on this machine for backend dev, **listening on port 5433** (not the default 5432 — that port is already used by an unrelated pre-existing PostgreSQL 18 instance on this machine; do not touch that one). Credentials and `DATABASE_URL` live in `packages/backend/.env` (gitignored, not committed). Run `npm run migrate --workspace=packages/backend` after pulling new migrations.

### Commands

```bash
npm install              # installs all workspaces
npm run dev:backend      # Express API with --watch (packages/backend)
npm run dev:web          # Vite dev server (packages/web)
npm run lint             # ESLint across all workspaces
npm run format            # Prettier --write
npm run format:check     # Prettier --check (used in CI)
```

Desktop (Electron) has no root script yet — run `npm run dev --workspace=packages/desktop` after starting `dev:web` (it loads the web dev server at `http://localhost:5173` in development).

No test framework/tests exist yet; `test.yml` in CI runs `npm test --workspaces --if-present` so it's a no-op until tests are added.

## Architecture (as scaffolded)

Monorepo with npm workspaces:
```
packages/backend/   Node.js + Express, PostgreSQL (pg), .env-based config
packages/web/       React 19 + Vite + React Router + Tailwind v4 (@tailwindcss/vite, no config file needed)
packages/desktop/   Electron; main process loads packages/web's dev server (dev) or dist/index.html (prod) — no separate renderer/electron-vite. Offline cache + sync queue use node:sqlite (built into Node 22+/Electron's bundled runtime, no native module build step). Renderer talks to main via the `window.techspeak` bridge (public/preload.js): auth.setSession, cache.getProgress/getFlashcards, cache.queueProgress, sync.now/onStatusChange.
packages/mobile/    React Native + Expo (later phase, not started)
```
External services planned but not yet integrated: OpenAI (chat/explanations), Deepgram (pronunciation/transcription), ElevenLabs (TTS), Stripe (subscriptions), AWS S3 + CloudFront (audio storage/CDN). Redis (caching) also planned, not yet wired up.

`deploy-staging.yml` only builds `packages/web` — the actual deploy step is a TODO pending a hosting provider decision.

Core domain model (see plan for full schema): `users` → `audiobooks` → `chapters` → `words` (clickable, timestamped, with translation/technical explanation) → `user_progress` / `flashcards` (SM-2 spaced repetition) / `chat_messages` (AI tutor, context-aware per chapter).

## Git conventions (from the plan)

Commit format: `<tipo>(<escopo>): <descrição>`, types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `perf`, `ci`, `chore`, `security`, `content`.

Branch flow: `feature/*` / `fix/*` / `refactor/*` → `develop` → `staging` → `main`.

**Every `git commit` and `git push` requires explicit confirmation before running** — this is enforced via `.claude/settings.json` (`permissions.ask`), not just a convention.
