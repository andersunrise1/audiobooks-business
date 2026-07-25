# Monetization Model

How `../PRICING.md`'s model maps onto the actual codebase. This is a
planning document, not an implementation — **no plan-based enforcement
exists yet**. Every feature below is available to every authenticated user
today, regardless of `users.plan`. This file exists so Dia 47+ (Stripe
integration) has a concrete checklist instead of re-deriving it from the
pricing doc.

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

| Feature                                                   | Where it would be enforced                                                 | Current state                                                                                                                                                                              |
| --------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Free: 2 audiobooks cap                                    | `audiobookController.getAudiobook` / `getAudiobookChapters`                | **Not enforced.** Every audiobook is fully readable by any authenticated (or even unauthenticated — the routes are public, Dia 1) user.                                                    |
| Free: 1 chat/day                                          | `middleware/rateLimiter.js` (`aiRateLimit`), `rateLimitService.js`         | **Not plan-aware.** `AI_DAILY_RATE_LIMIT` (Dia 37) is a single global limit for every user regardless of plan, and shared across `explain`/`chat`/`remedial` combined, not chat-specific.  |
| Vitalício: unlimited audiobooks                           | Same as above, inverse condition                                           | N/A until the Free cap exists — "unlimited" is just "no gate," which is the current (accidental) behavior for everyone.                                                                    |
| Vitalício: 10 chats/day (capped, not unlimited)           | Same rate-limit path, plan-aware                                           | **Not built.** Needs a per-plan limit, not a per-plan on/off switch — this is different from a typical "Pro = unlimited" gate.                                                             |
| Vitalício: translation/flashcards/pronunciation unlimited | No gate needed                                                             | Already true for everyone (these don't call the AI, so there's nothing to cap regardless of plan) — no work required here beyond confirming Free's audiobook cap doesn't also block these. |
| Vitalício: offline mode                                   | `packages/desktop/public/audioCache.js`                                    | Fully built (Dia 20) and available to everyone with the desktop app; no plan check anywhere in that path.                                                                                  |
| New book packs (one-time add-on)                          | New: a `purchases` or `user_audiobook_access` table, `POST /api/payment/*` | **Doesn't exist.** Needs its own schema — a lifetime purchase unlocks the catalog _at time of purchase_; a later book pack is a separate purchase record, not just a `plan` flip.          |
| Corporate: team management                                | None                                                                       | Doesn't exist. Would need an `organizations`/`org_members` schema, invite flow, and admin UI beyond Dia 44's single-user admin panel.                                                      |
| Corporate: progress tracking                              | `statsService.getUserStats` (Dia 19), `analyticsService.js` (Dia 38)       | Per-user stats exist; team-aggregate rollups don't. The admin analytics groundwork (global aggregates) is the closer starting point of the two.                                            |
| Corporate: content customization                          | `content/AUDIOBOOK_TEMPLATE.md`, `POST /api/admin/audiobooks` (Dia 43)     | The authoring pipeline exists; org-scoped/private audiobooks (vs. the current single shared catalog) don't.                                                                                |
| Corporate: SSO                                            | `authController.js`, `middleware/auth.js`                                  | Doesn't exist. Current auth is email/password + JWT only (Dia 1-5).                                                                                                                        |

## What Dia 47+ actually needs to build

1. **A plan-check helper**, analogous to `isAiConfigured()`/`isS3Configured()` — e.g. `req.user.plan !== 'free'` inline where needed. Needs the JWT payload or a fresh DB read to carry `plan` reliably (same staleness caveat Dia 38 already noted for `is_admin`: a purchase won't reflect until the user's next login unless `plan` is added to token refresh, too).
2. **Free-tier audiobook access limiting** — the audiobook list/detail endpoints are public today (no auth required at all, Dia 1); introducing a Free cap means deciding whether browsing the catalog stays public but _playback_ requires auth + a plan check, or whether the whole catalog becomes auth-gated. This is a real product decision, not just an engineering one.
3. **Plan-aware chat rate limiting** — extend `rateLimitService.getDailyAiLimit()` to return a different limit per plan (Free: 1/day, paid: 10/day) instead of the single global `AI_DAILY_RATE_LIMIT`. Unlike a typical feature gate, this needs to stay capped for paying users too, per the AI cost problem above.
4. **One-time Stripe Checkout, not subscriptions** (Dia 47's actual scope) — a single `checkout.session.completed` webhook flips `users.plan` to `'pro'` permanently; no renewal/cancellation webhook handling needed, which is simpler than the original subscription draft would have been.
5. **A purchase-history table** for future book packs — a flat `plan` column can represent "has lifetime access" but can't represent "which optional book packs this specific user bought," which the pricing model needs once expansion packs exist.
6. **Corporate features** are the largest gap — team management and SSO are both greenfield, not extensions of existing code.
