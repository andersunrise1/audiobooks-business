# Monetization Model

How `../PRICING.md`'s model maps onto the actual codebase. This started as a
planning document with no enforcement; **Dia 49 built the actual paywall**
(free-tier audiobook cap + plan-aware AI rate limiting) — see the updated
gap list below for what's real now vs. what's still a gap (book packs,
Corporate features).

**2026-07-25 update**: the pricing model changed from a subscription
(Free/Pro monthly/annual) to lifetime access (Free trial → one-time
purchase). This changes what Stripe needs to do (a one-time Checkout
Session, not recurring subscriptions + cancellation webhooks) and
simplifies the billing side, but the AI-cost-control problem is the same
either way — see "The AI cost problem" below.

## The `plan` column already exists

`users.plan` (migration 001) is `VARCHAR NOT NULL DEFAULT 'free'`, with the
comment `-- free, pro, corporate` written into the schema from Dia 1-2.
Under the lifetime model, `'pro'` now means "has purchased lifetime
access" rather than "has an active subscription," but the column itself
doesn't need to change — a one-time payment just sets `plan = 'pro'` and
leaves it there permanently (no renewal/expiry logic needed, which is
simpler than the subscription model would have required).
`toPublicUser()` in `authController.js` already returns `plan` on every
login/register response, and it's already surfaced to the frontend via
`AuthContext`'s `user` object. No schema change is needed to start gating
features; the enforcement logic itself is what's missing.

## The AI cost problem

Content (audiobooks, flashcards, word translation, pronunciation scoring)
costs effectively nothing to serve — safe to make unlimited for any paying
user. The AI tutor (`chat`/`explain`/`remedial`) has a real, measured
per-call cost (Dia 37: ~R$0,002-0,02 depending on endpoint/model). A
one-time lifetime payment against an unbounded ongoing AI cost is a real
risk if left uncapped — a single highly active user chatting daily for
years could cost more in AI calls than they paid once. The fix is a
**flat daily chat cap that applies even to paying users** (10/day per
`PRICING.md`), not a cap that disappears once someone pays.

## Feature-by-feature gap list

| Feature                                                   | Where it's enforced                                                        | Current state                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free: 2 audiobooks cap                                    | `audiobookController.getAudiobookChapters`                                 | **Built (Dia 49).** `audiobooks.is_free` (migration 035) marks exactly 2 audiobooks ("Daily Standup", "Remote Work Communication") as free; every other audiobook's chapters return 403 unless the caller's `plan` is `pro`/`corporate`. Browsing (`GET /api/audiobooks`, `GET /:id`) stays public. |
| Free: 1 chat/day                                          | `middleware/rateLimiter.js` (`aiRateLimit`), `rateLimitService.js`         | **Built (Dia 49).** `getDailyAiLimit(plan)` is plan-aware: `AI_DAILY_RATE_LIMIT_FREE` (default 1) vs. `AI_DAILY_RATE_LIMIT_PRO` (default 10). Still one shared bucket across `explain`/`chat`/`remedial` combined, not chat-specific.                                                               |
| Vitalício: unlimited audiobooks                           | Same as above, inverse condition                                           | **Built.** A `pro`/`corporate` `plan` bypasses the `is_free` check entirely.                                                                                                                                                                                                                        |
| Vitalício: 10 chats/day (capped, not unlimited)           | Same rate-limit path, plan-aware                                           | **Built.** See above — a deliberately higher cap, not an unlimited bypass.                                                                                                                                                                                                                          |
| Vitalício: translation/flashcards/pronunciation unlimited | No gate needed                                                             | Confirmed unaffected by the Dia 49 audiobook gate — `GET /chapters/:chapterId/words` stays ungated (no AI call, nothing to cap regardless of plan).                                                                                                                                                 |
| Vitalício: offline mode                                   | `packages/desktop/public/audioCache.js`                                    | Fully built (Dia 20) and available to everyone with the desktop app; no plan check anywhere in that path.                                                                                                                                                                                           |
| New book packs (one-time add-on)                          | New: a `purchases` or `user_audiobook_access` table, `POST /api/payment/*` | **Doesn't exist.** Needs its own schema — a lifetime purchase unlocks the catalog _at time of purchase_; a later book pack is a separate purchase record, not just a `plan` flip.                                                                                                                   |
| Corporate: team management                                | None                                                                       | Doesn't exist. Would need an `organizations`/`org_members` schema, invite flow, and admin UI beyond Dia 44's single-user admin panel.                                                                                                                                                               |
| Corporate: progress tracking                              | `statsService.getUserStats` (Dia 19), `analyticsService.js` (Dia 38)       | Per-user stats exist; team-aggregate rollups don't. The admin analytics groundwork (global aggregates) is the closer starting point of the two.                                                                                                                                                     |
| Corporate: content customization                          | `content/AUDIOBOOK_TEMPLATE.md`, `POST /api/admin/audiobooks` (Dia 43)     | The authoring pipeline exists; org-scoped/private audiobooks (vs. the current single shared catalog) don't.                                                                                                                                                                                         |
| Corporate: SSO                                            | `authController.js`, `middleware/auth.js`                                  | Doesn't exist. Current auth is email/password + JWT only (Dia 1-5).                                                                                                                                                                                                                                 |

## What's built vs. still a gap

1. ~~A plan-check helper~~ — **built (Dia 49)**: `services/planService.js`'s `getUserPlan(userId)`/`isPaidPlan(plan)`, a fresh DB read per call (same pattern as `requireAdmin.js`, not a JWT payload change — the access token still only carries `sub`/`email`, so this reads current `plan` on every check rather than trusting a cached value).
2. ~~Free-tier audiobook access limiting~~ — **built (Dia 49)**: browsing (`GET /api/audiobooks`, `GET /:id`) stays public; `GET /:id/chapters` uses a new `optionalAuth` middleware (populates `req.user` if a valid token is present, never rejects) and 403s for non-`is_free` audiobooks unless the caller's plan is paid.
3. ~~Plan-aware chat rate limiting~~ — **built (Dia 49)**: `rateLimitService.getDailyAiLimit(plan)` now takes a plan and returns `AI_DAILY_RATE_LIMIT_FREE`/`AI_DAILY_RATE_LIMIT_PRO`.
4. ~~One-time Stripe Checkout~~ — **built (Dia 47)**.
5. **A purchase-history table** for future book packs — still a gap. A flat `plan` column can represent "has lifetime access" but can't represent "which optional book packs this specific user bought," which the pricing model needs once expansion packs exist.
6. **Corporate features** are the largest remaining gap — team management and SSO are both greenfield, not extensions of existing code.
