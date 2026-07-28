# Deployment (Railway + Vercel)

Concrete dashboard steps for the specific pairing recommended in
[GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md): **Railway** for the backend +
Postgres (+ Redis, optional), **Vercel** for the static frontend build. Split
this way because Vercel's serverless model isn't a good fit for the Express
backend's long-lived `pg.Pool` connections, but it's excellent (and free) for
a static Vite build; Railway handles the stateful pieces well and cheaply.

Nothing in this doc has been run against a real Railway/Vercel account (none
exist in this dev environment) — the commands/scripts below were verified
locally (`npm run start:backend` confirmed to migrate + boot correctly
against the real local Postgres), but the actual dashboard clicks are
untested, same honest caveat as `PAYMENT_TROUBLESHOOTING.md`/`IOS_BUILD.md`.

## 1. Railway — backend + database

1. [railway.app](https://railway.app) → New Project → **Deploy from GitHub
   repo** → pick this repo.
2. **Add a Postgres database** (Railway's "+ New" → Database → PostgreSQL) to
   the same project — it auto-generates a `DATABASE_URL` you'll reference
   below.
3. On the **backend service** Railway created from the repo, open Settings:
   - **Root Directory**: leave as the repo root (`/`) — don't point it at
     `packages/backend` directly, since this is an npm workspaces monorepo
     and the root `package-lock.json` covers every workspace's dependencies.
   - **Build Command**: `npm ci`
   - **Start Command**: `npm run start:backend`
     (runs `npm run migrate --workspace=packages/backend` then
     `npm start --workspace=packages/backend` — migrations are idempotent,
     see `src/db/migrate.js`, so this is safe to run on every deploy.)
4. **Environment variables** (Railway service → Variables) — same names as
   [packages/backend/.env.example](packages/backend/.env.example):
   - `DATABASE_URL` → reference Railway's Postgres variable (Railway lets you
     link `${{Postgres.DATABASE_URL}}` directly, no copy-pasting).
   - `JWT_SECRET` / `JWT_REFRESH_SECRET` → generate new random values, e.g.
     `openssl rand -hex 32` — **never reuse the dev `.env` values**.
   - `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` → your
     real keys.
   - `NODE_ENV=production` (enables Dia 75's HTTPS enforcement/HSTS).
   - `FRONTEND_URL` → the real Vercel URL once you have it (step 2.4 below) —
     this is what Dia 75's CORS check compares against; get it wrong and the
     deployed frontend can't call its own API.
   - `GENERAL_RATE_LIMIT`/`AUTH_RATE_LIMIT`/`AI_DAILY_RATE_LIMIT_FREE`/
     `AI_DAILY_RATE_LIMIT_PRO` → optional, sensible defaults apply if unset
     (see `.env.example`'s comments).
   - `REDIS_URL` → optional. Skipping it is safe (Dia 30's cache fails open),
     but if you want AI response caching + the Dia 37 rate limiter to
     actually persist across restarts, add Railway's Redis plugin the same
     way as Postgres and link its URL.
5. Deploy. Check Railway's logs for `TechSpeak API listening on port ...`,
   then hit `https://<your-service>.up.railway.app/api/health` — should
   return `{"status":"ok"}`.

## 2. Vercel — frontend

1. [vercel.com](https://vercel.com) → Add New Project → import the same
   GitHub repo.
2. **Root Directory**: `packages/web` (Vercel auto-detects Vite once you set
   this — build command `npm run build`, output directory `dist` are filled
   in automatically, no need to override).
3. **Environment variable**: `VITE_API_URL` → the real Railway backend URL
   from step 1.5 (e.g. `https://techspeak-backend.up.railway.app`). Vite
   bakes this in at build time, so redeploy after changing it.
4. Deploy. Vercel gives you a `*.vercel.app` URL immediately — this is the
   real value to put in Railway's `FRONTEND_URL` (step 1.4). Update it there,
   which triggers Railway to restart with the correct CORS origin.
5. `packages/web/vercel.json`'s rewrite rule is what makes client-side
   routing work — without it, refreshing on any route other than `/` (e.g.
   `/dashboard`) would 404, since there's no `/dashboard` file on disk, only
   client-side `react-router-dom` handling it after `index.html` loads.

## 3. Custom domain (optional, once you own one)

- Vercel: Project → Settings → Domains → add your domain, follow the DNS
  instructions it gives you (usually a CNAME).
- Update Railway's `FRONTEND_URL` to the real domain instead of the
  `*.vercel.app` one once DNS is live.
- Point the Stripe webhook (Dia 47/50) at
  `https://your-domain.com/api/payment/webhook` instead of the Railway
  subdomain, if you switch.

## 4. Post-deploy smoke check

Once both are live, repeat the same golden-path check this project has run
locally many times (Dia 80's `LAUNCH_CHECKLIST.md`, most recently): register
→ login → browse the catalog → play a free audiobook → check the AI chat →
confirm `/api/payment/create-checkout-session` returns a real Stripe
Checkout URL (not the 503 you'd see locally without keys).
