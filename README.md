# 🎧 TechSpeaking

**Learn technical English through audiobooks — built for developers.**

> Live at **[techspeaking.dev](https://www.techspeaking.dev)** · Full-stack monorepo: web, desktop and mobile clients on one shared API.

---

## What it does

Developers want better English for career growth, but general-purpose apps (Duolingo, Babbel) skip the vocabulary that actually shows up in standups, code reviews and incident calls. TechSpeaking teaches that vocabulary in context:

- 🎧 **Audiobooks of real workplace scenarios** — daily standups, code review etiquette, incident response, negotiating a job offer, presenting to stakeholders. 25 audiobooks, 125 chapters.
- 👆 **Tap-to-translate transcripts** — every technical term is clickable, with translation, pronunciation, a plain-language explanation and a usage example, backed by an 88-term curated technical dictionary.
- 🤖 **AI tutor that knows the chapter** — a Claude-powered chat that answers questions by quoting the actual transcript, plus auto-generated remedial summaries and exercises when a learner marks a chapter as "didn't get it".
- 🔁 **Spaced repetition** — every clicked word becomes a flashcard scheduled with the SM-2 algorithm, re-prioritized by how often the learner actually struggles with it.
- 🎤 **Pronunciation practice** — record yourself reading a sentence and get word-level feedback via the Web Speech API.
- 📊 **Progress dashboard** — words learned, day streak, study time, and rule-based recommendations for what to study next.

---

## Architecture

npm-workspaces monorepo. One backend serves three clients that share the same API contract.

| Package            | Stack                                       | Notes                                                                                   |
| ------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| `packages/backend` | Node.js, Express 5, PostgreSQL, Redis       | REST API, JWT auth, 56 SQL migrations, AI integration, payments                         |
| `packages/web`     | React 19, Vite 8, React Router, Tailwind v4 | Main client — also installable as a PWA (hand-written service worker)                   |
| `packages/desktop` | Electron                                    | Reuses the web client; adds offline-first audio cache and a sync queue on `node:sqlite` |
| `packages/mobile`  | React Native, Expo SDK 57                   | Native player (`expo-audio`), same backend, `AsyncStorage`-based offline fallback       |

**External services:** Anthropic Claude (tutor, explanations, remedial content) · Mercado Pago (one-time lifetime purchase) · Railway (API + Postgres) · Vercel (web) · Cloudflare (DNS).

---

## Engineering highlights

Things I'd point to in a code review:

- **Tested for real, not just mocked.** 341 backend tests (`node --test`, zero extra deps) run integration suites against a real Postgres; external boundaries (Anthropic, Mercado Pago, S3) are the _only_ things mocked. 42 web tests with Vitest + React Testing Library, plus `jest-axe` accessibility assertions. CI runs both with a real Redis service.
- **Accessibility measured, not assumed.** Every primary-color × light/dark combination was audited live with `axe-core`; contrast failures were fixed with the actual WCAG luminance formula, not by eye. Skip-to-content link, keyboard-navigable dialogs, ARIA labels on every input.
- **Offline-first desktop client.** Progress updates and flashcard reviews queue locally in SQLite when offline and replay against the API on reconnect. The API resolves conflicts with `GREATEST()` semantics so a stale replay can never roll progress backwards.
- **AI cost is a first-class concern.** Per-user daily rate limits (plan-aware), Redis response caching, model tiering (Haiku for short explanations, Sonnet for reasoning), and every real call logged with token counts and estimated cost. Graceful degradation to a curated dictionary/FAQ when the AI provider is down.
- **Real payment flow.** Webhook signature verification, idempotent fulfillment, refund handling, and A/B price attribution carried through checkout metadata — verified end-to-end against the live Mercado Pago API.
- **Admin CMS.** Draft → scheduled → published content workflow, analytics dashboards (AI cost, retention, completion rates), deterministic A/B experiments, support tickets and a beta-tester program.
- **Load-tested.** `autocannon` benchmarks at 100–1000 concurrent connections identified the DB pool as the bottleneck; fixed and re-measured (+14% throughput). Numbers documented in `packages/backend/PERFORMANCE.md`.
- **Security baseline.** `helmet`, origin-restricted CORS, per-IP and per-user rate limiting, HTTPS enforcement, parameterized SQL throughout, no `dangerouslySetInnerHTML`.

---

## Running locally

```bash
npm install                      # all workspaces
npm run migrate --workspace=packages/backend
npm run dev:backend              # Express API (needs DATABASE_URL in packages/backend/.env)
npm run dev:web                  # Vite dev server
```

Copy `packages/backend/.env.example` and `packages/web/.env.example` to `.env` and fill in `DATABASE_URL`. The app runs without an `ANTHROPIC_API_KEY` or payment credentials — those features degrade to a clear "not configured" state instead of crashing.

```bash
npm test --workspaces --if-present   # backend + web suites
npm run lint
```

---

## Documentation

- [`packages/backend/API.md`](packages/backend/API.md) — full endpoint reference
- [`packages/backend/AI_GUIDELINES.md`](packages/backend/AI_GUIDELINES.md) — model choices, latency/cost numbers, prompt conventions
- [`packages/backend/PERFORMANCE.md`](packages/backend/PERFORMANCE.md) — load-test results
- [`packages/backend/CONTENT_GUIDELINES.md`](packages/backend/CONTENT_GUIDELINES.md) — how audiobooks are authored
- [`Projeto_detalhado/`](Projeto_detalhado/) — the original 100-day build plan this project followed

---

## About

Built by **Anderson** ([@andersunrise1](https://github.com/andersunrise1)) as a solo full-stack project — from database schema and API through three client platforms, payments, and production deployment.
