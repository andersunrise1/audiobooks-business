# Pricing Strategy

TechSpeak's pricing model (Dia 46), following the plan's 3-tier structure. This
is a strategy document — **no billing is implemented yet** (that's Dia 47+,
Stripe integration); see `packages/backend/MONETIZATION.md` for how these
tiers map onto the actual codebase and what still needs to be built to
enforce them.

## Why 3 tiers

The product's positioning ([Audiobooks_English_Business.txt](Audiobooks_English_Business.txt))
is "the English professional developers actually use at work," not a generic
language app — so the tiers are built around what a working developer needs
_more of_ as they rely on the product more, not around arbitrary feature
walls:

- **Free** — enough to genuinely evaluate the product (finish a real
  audiobook, try the AI tutor, start building flashcards) without being a
  crippled demo.
- **Pro** — the individual-developer subscription: unlimited use of
  everything Free has a cap on, plus the features that only make sense for a
  committed learner (offline mode, unlimited AI).
- **Corporate** — the team/company tier: not "Pro but more," but genuinely
  different needs (who's using it, tracking a team's progress, custom
  content, procurement-friendly billing).

## Free — R$ 0

- **2 audiobooks** — enough to complete a real, full 5-chapter audiobook
  (Dia 41's template) and start a second, not just a single teaser chapter.
- **Flashcards básicos** — the existing SM-2 spaced-repetition system
  (Dia 17) is already unlimited in the code; "básicos" here means capped to
  words learned from the 2 accessible audiobooks, not a reduced feature set.
- **1 chat por dia** — one AI tutor conversation per day. Explain/remedial
  aren't separately mentioned in the plan, but the natural reading is that
  the daily AI budget is shared across `explain`/`chat`/`remedial`
  (`AI_DAILY_RATE_LIMIT`, Dia 37) — see `MONETIZATION.md` for why today's
  rate limiter isn't yet plan-aware.
- No offline mode, no pronunciation feedback gate specifically, no ads
  (there's no ad system in this product at all, free or paid).

## Pro — $9.99/mês (or R$ 50/mês)

- **Unlimited audiobooks** — access to the full catalog (5 today, Dia 42;
  growing as more are authored).
- **Flashcards ilimitados** — same system as Free, no per-audiobook cap.
- **IA ilimitada** — no daily cap on `explain`/`chat`/`remedial`.
- **Pronúncia feedback** — the existing `PronunciationRecorder` (Dia 18,
  Web Speech API–based) is already free for everyone in the code today;
  under this pricing model it becomes a genuine Pro differentiator.
- **Offline mode** — the existing Electron desktop audio-caching feature
  (Dia 20) becomes Pro-exclusive.
- **Sem anúncios** — moot today (no ad system exists anywhere in the
  product), but stated for completeness/future-proofing per the plan.

R$ 50/mês is the BRL-market anchor price; $9.99/mês is the USD equivalent
for an international audience — not a currency conversion of the same
number, a deliberate separate price point per market, consistent with how
SaaS pricing is usually localized.

## Corporate — Custom

- **Team management** — inviting/managing a roster of company learners.
- **Progress tracking** — an aggregate, team-level view built on top of the
  existing per-user stats (`GET /api/user/stats`, Dia 19) and the admin
  analytics groundwork (Dia 38), not a new tracking mechanism from scratch.
- **Customização de conteúdo** — company-specific audiobooks (e.g. a
  company's own onboarding vocabulary), reusing Dia 41's content template.
- **SSO integration** — enterprise auth, doesn't exist yet (current auth is
  email/password + JWT only, Dia 1-5).
- **Dedicated support / contato direto** — a support process, not a
  software feature.

No public price — Corporate is sales-assisted, priced per team size and
customization scope, matching the plan.

## What this document does _not_ do

It doesn't implement rate limits, subscription checks, or Stripe — see
`packages/backend/MONETIZATION.md` for the honest gap list and what Dia 47+
needs to build to make these tiers real.
