# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Implementation has started, following [Projeto_detalhado/PROJETO_AUDIOBOOK_PLANO_DETALHADO.md](Projeto_detalhado/PROJETO_AUDIOBOOK_PLANO_DETALHADO.md) (full 20-week plan: architecture, DB schema, API routes, pricing, commit/branch conventions). **Etapa 1 / Semana 1-2 (Dias 1-10) is done**: monorepo scaffold, backend (Express + PostgreSQL, DB schema/migrations, auth/audiobook/progress endpoints, JWT), web (React + Vite + React Router + Tailwind v4, layout, auth pages, protected routes), desktop (Electron reusing `web/`'s React, IPC handlers, SQLite offline cache, auto-sync with backend), and CI (GitHub Actions test/lint/deploy-staging, Husky pre-commit). Next up per the plan: Semana 3, Dia 11 (Audio Player Component).

Other docs:
- [Audiobooks_English_Business.txt](Audiobooks_English_Business.txt) — product positioning/pitch notes.
- [CONTRIBUTING.md](CONTRIBUTING.md) — dev setup, commit/branch conventions, what CI runs.
- `arquivos_zipado_do_projeto.zip` is a duplicate archive of the same planning docs; not a code drop.

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
