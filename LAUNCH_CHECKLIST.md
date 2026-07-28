# Launch Checklist (Dia 80)

Honest status against the plan's 11-item pre-launch checklist, as of
2026-07-28. Where a claim is "verified", it was actually run against the real
local Postgres/backend this session — not assumed from reading old day
entries in [CLAUDE.md](CLAUDE.md).

## ✅ Todas as features funcionam

Re-ran the golden path end-to-end against the live dev backend + real
Postgres today: register → login → browse the 25-audiobook catalog → open a
free-tier audiobook's chapters → fetch a chapter's words → click a word
(`word_clicks`/`flashcards`/`user_progress` all land — also re-confirms
Dia 78-79's transaction fix works on the real happy path, not just its own
failure-injection test) → dashboard stats → flashcards list → submit a
support ticket → submit beta feedback. Then, as an admin: analytics,
content-analytics, and experiments endpoints all returned real 200s with real
data from this dev DB's 94 accumulated users / 25 audiobooks / 125 chapters.

Not re-verified today: every one of the ~80 days' individual features
one-by-one in the browser — that's what each day's own "Verified for real"
section in `CLAUDE.md` already covers at the time it was built. This is a
golden-path spot-check, not a full manual regression pass.

## ⚠️ Testes passam (95%+ cobertura)

**Tests pass, coverage doesn't hit 95%.** Both measured for real today:

|         | tests                        | coverage (lines)                          |
| ------- | ---------------------------- | ----------------------------------------- |
| Backend | 299 tests, 291 pass / 8 fail | 94.26% stmts, 90.47% branch, 92.94% funcs |
| Web     | 38 tests, 38 pass            | 56.91% stmts, 45.56% branch, 47.86% funcs |

The 8 backend failures are the same known-local-only baseline maintained since
Dia 30/37 (this dev machine has a real `ANTHROPIC_API_KEY` configured + no
local Redis — both pass in CI, which has neither problem).

Backend line coverage (94.26%) is close to the 95% target. Web coverage
(56.91%) is honestly far below it — this project's own established pattern
(explicit since Dia 15) has been to verify most UI work live in-browser rather
than write an automated test for every component, so a lot of working,
manually-verified code (e.g. `ChatWidget`, `PronunciationRecorder`,
`VoiceCommandBar`, `api.js`) has thin or no automated coverage despite being
real and functioning. `packages/web`'s `test:coverage` script (new, `vitest run
--coverage`) is now available so this number is at least visible and trackable
going forward, rather than unmeasured.

## ✅ Segurança auditada

Dia 75: `helmet()`, CORS restricted to `FRONTEND_URL`, general + auth-specific
rate limiting, HTTPS enforcement (production-gated), input validation
(email/password). A background-agent audit confirmed zero SQL injection risk
(every `pool.query` call across the backend uses parameterized placeholders)
and zero XSS risk (no `dangerouslySetInnerHTML`/`innerHTML`/`document.write`
anywhere in `packages/web/src`). See `packages/backend/tests/integration/security.test.js`.

## ✅ Performance aceita

Dia 71-74: real `autocannon` load testing found and fixed a real bottleneck
(`pg.Pool`'s default `max: 10` connections queueing badly at 1000 concurrent
requests) — see [PERFORMANCE.md](packages/backend/PERFORMANCE.md) for numbers.
Bundle size, code-splitting, and a hand-written service worker were added and
measured, not assumed. Honest caveat, unchanged: this is single-dev-machine
load testing, not a real production topology (no load balancer, replicas, CDN).

## ✅ Documentação completa (for this project's actual scope)

`CLAUDE.md` (day-by-day build log), `packages/backend/API.md` (endpoint
reference, spot-checked against live responses), `AI_GUIDELINES.md`,
`CONTENT_GUIDELINES.md`, `MONETIZATION.md` / `MONETIZATION_REPORT.md` /
`PRICING.md`, `PAYMENT_TROUBLESHOOTING.md`, `PERFORMANCE.md`,
`DISASTER_RECOVERY.md` (new today), `CONTRIBUTING.md`. No separate end-user
manual exists beyond the in-app `HelpCenterPage` FAQ — reasonable for a
consumer learning app, not a developer tool.

## ✅ Suporte pronto (with one honest, long-standing gap)

Dia 57-58's ticket system + FAQ re-verified working today (a real ticket
submitted via the API landed in the admin ticket list). **Still true, same as
every day since Dia 39/57-58: no outbound email is ever sent** — this project
has never integrated an email-sending service (no SendGrid/SES/nodemailer).
An admin can see and respond to tickets in `AdminSupportPage`, but the
requester is never automatically notified. This is a real pre-launch gap, not
a documentation oversight.

## ✅ Backup system testado

Built and tested for real today, not just planned — see
[DISASTER_RECOVERY.md](packages/backend/DISASTER_RECOVERY.md). `npm run
backup` dumps the real local DB; `npm run backup:verify` restores it into a
throwaway database and confirms row counts match exactly (94 users, 25
audiobooks, 125 chapters, 127 words, 7 flashcards — all matched), then cleans
up. Gaps are the same class already accepted project-wide: no hosting
provider chosen yet, so no automated schedule or off-site copy exists — the
realistic path is a managed Postgres provider's built-in backups once one is
chosen, per `DISASTER_RECOVERY.md`'s own recommendation.

## ⚠️ Disaster recovery plan

Written today — [DISASTER_RECOVERY.md](packages/backend/DISASTER_RECOVERY.md)
— but honestly scoped to what's real: a tested single-instance backup/restore
procedure and a documented "what to do once a hosting provider exists" plan.
No production incident has ever been rehearsed (there's no production
environment yet), and RTO/RPO figures are dev-machine estimates, not
production-representative numbers.

## ✅ Analytics funcionando

Re-verified live today (not just from memory of Dia 38/53-56): `GET
/api/admin/analytics`, `/api/admin/content-analytics`, and
`/api/admin/experiments` all returned real 200s with real, non-empty data
against this dev DB's actual accumulated activity.

## ⚠️ Payment system testado

Re-confirmed today: `POST /api/payment/create-checkout-session` correctly
returns 503 (Stripe not configured) — the expected, tested behavior on a
machine with no Stripe account. The full checkout → webhook → `plan` update
flow is covered by tests that mock the Stripe SDK (Dia 47-50, 55-56), and the
webhook's idempotency/missing-metadata edge cases are covered too. **What's
never happened: a genuine Stripe test-mode checkout** — still no Stripe
account on this machine, unchanged since Dia 47. This is the single biggest
gap standing between "code is correct" and "payment system is launch-tested."

## ❌ Email service testado

Doesn't exist. No email-sending integration (SendGrid, SES, nodemailer, or
otherwise) has ever been added to this codebase — every place that would
plausibly send an email (registration confirmation, support ticket replies,
payment receipts, beta-access notifications) either does nothing or, in
Stripe's case, relies on Stripe's own receipt email once real keys exist. This
is a real, complete gap, not an undertested feature — there's nothing to test.

---

## Bottom line

Ready to launch on: features (verified), security, performance,
backend test coverage (close to target), backups (tested), analytics,
support intake. **Blocking a real launch**: no Stripe account (payment can't
be tested end-to-end, only mocked), no email service (zero transactional
email), web test coverage far under target (mitigated by extensive manual
verification, but not automated), and no hosting provider chosen yet (which
also blocks a real production backup schedule and DR rehearsal). None of
these are new discoveries — they're the same gaps this project has honestly
tracked since the day each one first came up — but this is the first time
they're compiled into one launch-readiness view.
