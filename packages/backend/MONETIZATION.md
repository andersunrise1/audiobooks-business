# Monetization Model

How `../PRICING.md`'s 3 tiers map onto the actual codebase (Dia 46). This is
a planning document, not an implementation — **no plan-based enforcement
exists yet**. Every feature below is available to every authenticated user
today, regardless of `users.plan`. This file exists so Dia 47+ (Stripe
integration) has a concrete checklist instead of re-deriving it from the
pricing doc.

## The `plan` column already exists

`users.plan` (migration 001) is `VARCHAR NOT NULL DEFAULT 'free'`, with the
comment `-- free, pro, corporate` written into the schema from Dia 1-2 —
this pricing model was anticipated in the original design, just never
enforced. `toPublicUser()` in `authController.js` already returns `plan` on
every login/register response, and it's already surfaced to the frontend via
`AuthContext`'s `user` object. No schema change is needed to start gating
features; the enforcement logic itself is what's missing.

## Feature-by-feature gap list

| Tier feature                     | Where it would be enforced                                             | Current state                                                                                                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free: 2 audiobooks cap           | `audiobookController.getAudiobook` / `getAudiobookChapters`            | **Not enforced.** Every audiobook is fully readable by any authenticated (or even unauthenticated — the routes are public, Dia 1) user.                                                   |
| Free: 1 chat/day                 | `middleware/rateLimiter.js` (`aiRateLimit`), `rateLimitService.js`     | **Not plan-aware.** `AI_DAILY_RATE_LIMIT` (Dia 37) is a single global limit for every user regardless of plan, and shared across `explain`/`chat`/`remedial` combined, not chat-specific. |
| Pro: unlimited audiobooks        | Same as above, inverse condition                                       | N/A until the Free cap exists — "unlimited" is just "no gate," which is the current (accidental) behavior for everyone.                                                                   |
| Pro: unlimited AI                | Same as above                                                          | Same — currently true for everyone, not a Pro-specific unlock.                                                                                                                            |
| Pro: pronunciation feedback      | `PronunciationRecorder.jsx` / no backend gate                          | Fully built (Dia 18) and available to everyone; would need a frontend + (if made server-side later) backend check.                                                                        |
| Pro: offline mode                | `packages/desktop/public/audioCache.js`                                | Fully built (Dia 20) and available to everyone with the desktop app; no plan check anywhere in that path.                                                                                 |
| Corporate: team management       | None                                                                   | Doesn't exist. Would need an `organizations`/`org_members` schema, invite flow, and admin UI beyond Dia 44's single-user admin panel.                                                     |
| Corporate: progress tracking     | `statsService.getUserStats` (Dia 19), `analyticsService.js` (Dia 38)   | Per-user stats exist; team-aggregate rollups don't. The admin analytics groundwork (global aggregates) is the closer starting point of the two.                                           |
| Corporate: content customization | `content/AUDIOBOOK_TEMPLATE.md`, `POST /api/admin/audiobooks` (Dia 43) | The authoring pipeline exists; org-scoped/private audiobooks (vs. the current single shared catalog) don't.                                                                               |
| Corporate: SSO                   | `authController.js`, `middleware/auth.js`                              | Doesn't exist. Current auth is email/password + JWT only (Dia 1-5).                                                                                                                       |

## What Dia 47+ actually needs to build

1. **A plan-check helper**, analogous to `isAiConfigured()`/`isS3Configured()` — e.g. `requirePlan(['pro', 'corporate'])` middleware, or a simpler `req.user.plan !== 'free'` check inline where needed. Needs the JWT payload or a fresh DB read to carry `plan` reliably (same staleness caveat Dia 38 already noted for `is_admin`: a plan upgrade won't reflect until the user's next login unless `plan` is added to token refresh, too).
2. **Free-tier audiobook access limiting** — the audiobook list/detail endpoints are public today (no auth required at all, Dia 1); introducing a Free cap means deciding whether browsing the catalog stays public but _playback_ requires auth + a plan check, or whether the whole catalog becomes auth-gated. This is a real product decision, not just an engineering one.
3. **Plan-aware rate limiting** — extend `rateLimitService.getDailyAiLimit()` to accept a plan and return a different limit (or `Infinity`) instead of the single global `AI_DAILY_RATE_LIMIT`.
4. **Stripe integration itself** (Dia 47's actual scope) — subscriptions, webhooks to update `users.plan` on payment events, and a billing UI.
5. **Corporate features** are the largest gap — team management and SSO are both greenfield, not extensions of existing code.
