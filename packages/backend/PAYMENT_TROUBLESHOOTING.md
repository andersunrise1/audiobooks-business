# Payment Troubleshooting Guide

Dia 50's plan template ("Teste de Pagamento Sandbox") assumes a subscription
flow with its own checklist item for cancellation. That doesn't apply here —
`TechSpeak Vitalício` is a one-time purchase (Dia 46's pricing decision, see
`../PRICING.md`), so there is no recurring billing and nothing to cancel.
The adapted checklist for this project is:

- [x] Processar pagamento — `POST /api/payment/create-checkout-session` (Dia 47)
- [x] Webhook funciona — `POST /api/payment/webhook` (Dia 47)
- [x] Acesso liberado — `users.plan` flips to `'pro'` and the frontend reflects
      it without a re-login (Dia 48's `refreshUser()`)
- [ ] **Real Stripe test-mode run** — still not done. This dev environment has
      no Stripe account/keys yet (confirmed with the user on 2026-07-25). Every
      test covering the payment flow (`tests/unit/paymentService.test.js`,
      `tests/integration/payment.test.js`) mocks the Stripe SDK at the
      `stripeClient.checkout.sessions.create` / `stripeClient.webhooks.constructEvent`
      boundary — the only boundary controllable without real keys. This proves
      our own code (route guards, DB writes, `plan` propagation to the
      frontend) is correct, but a genuine Stripe-hosted checkout page and a
      real webhook delivery have never been exercised. The rest of this
      document is a checklist for whenever real test-mode keys exist.

## Once you have real Stripe test-mode keys

1. **Get keys**: Stripe Dashboard → Developers → API keys (make sure the
   dashboard is in **Test mode**, top-right toggle). Set
   `STRIPE_SECRET_KEY=sk_test_...` in `packages/backend/.env`.
2. **Forward webhooks to your local machine**: Stripe's dashboard can't reach
   `localhost`. Use the [Stripe CLI](https://stripe.com/docs/stripe-cli):
   ```bash
   stripe listen --forward-to localhost:3000/api/payment/webhook
   ```
   This prints a webhook signing secret (`whsec_...`) — set that as
   `STRIPE_WEBHOOK_SECRET` in `.env`. It's different from (and takes priority
   over, for local testing) whatever secret is configured on a dashboard
   webhook endpoint, since the CLI creates its own ephemeral endpoint.
3. **Run the full flow**:
   - Log in to the app, go to `/pricing`, click "Comprar Vitalício".
   - You should land on a real Stripe-hosted checkout page (not a 503 — if you
     still see one, `STRIPE_SECRET_KEY` isn't picked up; restart the backend
     after editing `.env`).
   - Pay with a Stripe test card: `4242 4242 4242 4242`, any future expiry, any
     3-digit CVC, any postal code. ([Full test card list](https://stripe.com/docs/testing).)
   - Stripe redirects to `/payment/success?session_id=...`; the CLI terminal
     should show the webhook being forwarded and a `200` response logged.
   - Confirm `users.plan` is `'pro'` in Postgres, and that `/payment/success`
     shows the confirmed state (it polls `refreshUser()` up to 5 times, Dia 48).
4. **Test the "not yet confirmed" path on purpose**: temporarily stop
   `stripe listen` before completing a checkout, pay, and confirm
   `/payment/success` shows the "ainda confirmando" message instead of hanging
   or erroring — this is the real-world case where the webhook lags the
   redirect.

## Common failure modes

- **503 "Payments are not configured"** — `STRIPE_SECRET_KEY` isn't set, or
  the backend process was started before it was added to `.env` (env vars are
  only read at process start). Restart `npm run dev:backend`.
- **503 on the webhook route specifically** — same thing but for
  `STRIPE_WEBHOOK_SECRET`. The checkout route and the webhook route are gated
  independently (`isStripeConfigured()` / `isWebhookConfigured()` in
  `services/paymentService.js`), so it's possible for one to work and not the
  other.
- **400 "invalid signature" on every webhook call** — `STRIPE_WEBHOOK_SECRET`
  doesn't match the endpoint that actually sent the event. Using the Stripe
  CLI? Use the secret it printed, not one from the dashboard's webhook
  settings (those are two different endpoints with two different secrets).
  Also double check `app.js` registers the webhook route with
  `express.raw({ type: 'application/json' })` **before** the global
  `express.json()` — if a change accidentally reorders this, Stripe's
  signature check will fail for every real request even with the right
  secret, because it verifies the exact raw bytes it signed.
- **Checkout succeeds but `plan` never flips** — check the `stripe listen`
  terminal (or the dashboard's webhook event log) for a non-200 response from
  `/api/payment/webhook`. If the webhook never arrives at all, confirm the
  forwarding command/dashboard endpoint URL is correct and the backend is
  actually running on the port it expects.
- **`/payment/success` stuck on "ainda confirmando"** — either the webhook
  hasn't arrived yet (transient, the page polls automatically) or it errored
  silently server-side; check the backend logs for `grantLifetimeAccess`
  failures.
