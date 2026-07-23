# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Implementation has started, following [Projeto_detalhado/PROJETO_AUDIOBOOK_PLANO_DETALHADO.md](Projeto_detalhado/PROJETO_AUDIOBOOK_PLANO_DETALHADO.md) (full 20-week plan: architecture, DB schema, API routes, pricing, commit/branch conventions). **Etapa 1 / Semana 1-2 (Dias 1-10) is done**: monorepo scaffold, backend (Express + PostgreSQL, DB schema/migrations, auth/audiobook/progress endpoints, JWT), web (React + Vite + React Router + Tailwind v4, layout, auth pages, protected routes), desktop (Electron reusing `web/`'s React, IPC handlers, SQLite offline cache, auto-sync with backend), and CI (GitHub Actions test/lint/deploy-staging, Husky pre-commit). **Etapa 2 / Semana 3, Dia 11-12 is done**: audio player component (`packages/web/src/components/features/AudioPlayer.jsx` — play/pause, seek, volume, speed control) wired into `PlayerPage`, which fetches chapters per audiobook and persists listening progress via the existing `/api/user/progress` endpoints. `words` gained `start_seconds`/`end_seconds` (migration 002) and a `GET /api/audiobooks/chapters/:chapterId/words` endpoint; `useWordSync` + `TranscriptDisplay` highlight the word matching current playback time, falling back to plain `chapter.transcript` when no timestamped words exist yet. **Dia 13-14 is done**: clicking a transcript word opens `TranslationPopup` (translation, pronunciation, technical explanation, example sentence), auto-closing after 3s, and also POSTs to `/api/user/words-learned` — this increments `user_progress.words_learned` for the chapter and logs the event to a new `word_clicks` table (migration 003) for future analytics (difficulty analysis, Dia 31). **Dia 15 (manual part) is done**: full flow verified against a real local Postgres — register → login → audiobooks list → player → real audio playback → word highlighting → translation popup → word-click and completion progress persisted correctly. Automated e2e tests (Playwright/Vitest) are not set up yet. **Dia 16 is done**: a `technical_dictionary` table (migration 004, seeded with 24 real terms in 005) provides canonical part-of-speech/translation/explanation/example/contexts per word, standalone at `GET /api/dictionary/:word`. `getChapterWords` now LEFT JOINs it so any per-chapter `words` row missing translation/explanation/example falls back to the dictionary entry; `part_of_speech`/`contexts` always come from there since chapter-level `words` doesn't store them. `TranslationPopup` displays both. Next up per the plan: Dia 17 (Flashcards Automáticos).

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
