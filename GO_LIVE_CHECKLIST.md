# Go-Live Checklist

An ordered, practical action plan for taking TechSpeak from "runs on this dev
machine" to "a real customer can visit it and pay." This is a companion to
[LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) (Dia 80's honest status review) —
that one tells you _what's ready_; this one tells you _what to click, in what
order_, to actually go live.

Nothing here is code work unless explicitly marked **(dev work)** — most
steps are account creation, configuration, and business decisions only you
can make.

## Phase 0 — Business/tax setup (already done: MEI)

MEI is already open — this phase is just the remaining loose ends before
real sales start:

- **Confirm the MEI's CNAE covers digital products/online courses** (e.g.
  "edição de outros produtos digitais" / "portais e outros serviços de
  informação na internet" / "ensino via internet"). If missing, add it as a
  free secondary activity via [gov.br/mei](https://www.gov.br/mei).
- **Open the Stripe account under the MEI's CNPJ**, not a personal CPF, so
  revenue (including international sales) is correctly attributed to the
  business from day one.
- **Watch the MEI revenue ceiling** (R\$81,000/year, current rule) — combined
  domestic + international sales count together, no separate bucket for
  foreign customers. Crossing it means migrating to Simples Nacional (ME),
  a normal next step, not a problem, but worth tracking as the business
  grows.
- International sales still go through the MEI's normal annual declaration
  (DASN-SIMEI) — there's no separate foreign-revenue field, it's all summed.
- This is general guidance, not accounting/legal advice — Brazil's 2026-2033
  tax reform (EC 132/2023, IBS/CBS) is still being phased in, and a real
  accountant should confirm specifics before real money moves. Many
  accountants serve MEI accounts for R\$50-150/month.

## Phase 1 — Hosting (web + backend + database)

1. **Pick a hosting provider.** For a solo developer, [Railway](https://railway.app)
   or [Render](https://render.com) are the simplest — both can host the
   Express backend, a managed Postgres database, and (Render especially)
   static-site hosting for the Vite build, all in one place with minimal
   DevOps. AWS/GCP/Azure are more powerful but a lot more setup for no real
   benefit at this scale yet.
2. Create the account, provision a Postgres database there.
3. Set the real environment variables on the provider's dashboard — same
   names as `packages/backend/.env.example`: `DATABASE_URL` (from the
   provider's managed Postgres), `JWT_SECRET`/`JWT_REFRESH_SECRET` (generate
   new random ones — **never reuse the dev values**), `ANTHROPIC_API_KEY`,
   `NODE_ENV=production`.
4. Deploy the backend. Run `npm run migrate --workspace=packages/backend`
   against the production database (most providers let you run a one-off
   command against the deployed environment).
5. Deploy `packages/web`'s production build (`npm run build`) — Render/Railway
   can serve it directly, or use Vercel/Netlify specifically for the
   frontend if you'd rather split web hosting from the backend.
6. Point `packages/web`'s `VITE_API_URL` at the real backend URL and rebuild.

## Phase 2 — Domain

7. Buy a domain (Registro.br for `.com.br`, Namecheap/Google Domains for
   `.com`).
8. Point its DNS at your hosting provider (they'll give you exact
   records — usually a CNAME or A record).
9. Enable HTTPS (Railway/Render/Vercel all auto-provision this via Let's
   Encrypt — no manual certificate work needed).
10. **Update `FRONTEND_URL` in the backend's real environment variables to
    the real domain** (e.g. `https://techspeak.com.br`) — this is what Dia
    75's CORS restriction checks against; forgetting this step means the
    real site simply won't be able to call its own API.

## Phase 3 — Real payments (Stripe)

11. Create a real Stripe account, complete identity/business verification
    (required before you can accept real money).
12. Get the real `STRIPE_SECRET_KEY` and create a webhook endpoint in the
    Stripe dashboard pointed at `https://your-domain.com/api/payment/webhook`
    — copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
13. Test one real purchase in Stripe's test mode first (test card
    `4242 4242 4242 4242`, per `packages/backend/PAYMENT_TROUBLESHOOTING.md`),
    then switch to live mode.
14. Link your bank account in the Stripe dashboard (Settings → Payouts) —
    this is separate from, and has nothing to do with, Google Play's or
    Apple's own payment/banking setup.

## Phase 4 — Email **(some dev work required)**

15. Pick a transactional email provider (Resend and SendGrid both have
    workable free tiers for low volume).
16. **This needs real code** — no email-sending integration exists anywhere
    in this codebase yet (registration confirmation, support ticket
    replies, payment receipts all currently do nothing). Scope this as its
    own task before or shortly after launch, not a pre-launch blocker if
    you're comfortable soft-launching without transactional email at first.

## Phase 5 — Backups & monitoring

17. Confirm your hosting provider's managed Postgres includes automated
    backups (most do, out of the box) — prefer that over relying solely on
    `packages/backend/scripts/backup.js` (Dia 80), which was built and
    tested for local/manual use, not as a production backup system.
18. Optional but recommended: a free uptime monitor (UptimeRobot,
    Better Uptime) pinging `/api/health`.

## Phase 6 — Mobile apps (can come after web launch — not a blocker)

19. Apple Developer Program (US$99/year) + Google Play Developer (US$25
    one-time) + a free Expo/EAS account — see
    [packages/mobile/IOS_BUILD.md](packages/mobile/IOS_BUILD.md) and
    [ANDROID_BUILD.md](packages/mobile/ANDROID_BUILD.md) for the exact
    `eas build`/`eas submit` commands once these exist.
20. Decide the in-app-purchase question before submitting to either store:
    Apple/Google policy generally requires digital content purchased
    _inside_ the app to go through their own billing (Apple IAP / Google
    Play Billing), not Stripe directly — neither is integrated in this
    codebase yet. The simpler near-term path is letting the mobile apps be
    free-to-browse-and-learn with purchases only happening through the web
    site (already fully built), avoiding IAP integration entirely for now.

---

**Suggested order if launching solo**: Phases 1-3 first (a real, payable
website is the actual product) → soft-launch and get real users before
sinking more time into email/mobile-store polish → Phase 4 once you have
real support-ticket volume that justifies it → Phase 6 whenever you're ready
to invest in the store review process on top of an already-working web
product.
