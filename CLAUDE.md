# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository is currently **pre-code**: it holds the product/dev plan for "TechSpeak", a technical-English learning platform for software professionals (audiobooks with word-level translation, AI chat, flashcards, pronunciation feedback). No application code, package.json, or build tooling exists yet — there are no build/lint/test commands to run.

Key docs:
- [Projeto_detalhado/PROJETO_AUDIOBOOK_PLANO_DETALHADO.md](Projeto_detalhado/PROJETO_AUDIOBOOK_PLANO_DETALHADO.md) — full 20-week development plan (architecture, DB schema, API routes, pricing, commit/branch conventions).
- [Audiobooks_English_Business.txt](Audiobooks_English_Business.txt) — product positioning/pitch notes.
- `arquivos_zipado_do_projeto.zip` is a duplicate archive of the same planning docs; not a code drop.

Once implementation starts, update this file with real build/lint/test commands and remove this status note.

## Intended architecture (per the plan)

Monorepo with npm workspaces, not yet scaffolded:
```
packages/backend/   Node.js + Express, PostgreSQL, Redis cache
packages/web/       React + Vite + Tailwind
packages/desktop/   Electron + React (reuses web/ components), local SQLite cache, offline-first sync
packages/mobile/    React Native + Expo (later phase)
```
External services planned: OpenAI (chat/explanations), Deepgram (pronunciation/transcription), ElevenLabs (TTS), Stripe (subscriptions), AWS S3 + CloudFront (audio storage/CDN).

Core domain model (see plan for full schema): `users` → `audiobooks` → `chapters` → `words` (clickable, timestamped, with translation/technical explanation) → `user_progress` / `flashcards` (SM-2 spaced repetition) / `chat_messages` (AI tutor, context-aware per chapter).

## Git conventions (from the plan)

Commit format: `<tipo>(<escopo>): <descrição>`, types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `perf`, `ci`, `chore`, `security`, `content`.

Branch flow: `feature/*` / `fix/*` / `refactor/*` → `develop` → `staging` → `main`.

**Every `git commit` and `git push` requires explicit confirmation before running** — this is enforced via `.claude/settings.json` (`permissions.ask`), not just a convention.
