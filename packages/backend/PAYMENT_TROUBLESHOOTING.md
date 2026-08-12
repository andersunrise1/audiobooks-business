# Payment Troubleshooting Guide

Dia 50's plan template ("Teste de Pagamento Sandbox") assumes a subscription
flow with its own checklist item for cancellation. That doesn't apply here —
`TechSpeak Vitalício` is a one-time purchase (Dia 46's pricing decision, see
`../PRICING.md`), so there is no recurring billing and nothing to cancel.

**Provider switched from Stripe to Mercado Pago on 2026-08-11** (see
`CLAUDE.md`) — the user's Stripe identity-verification review got stuck on a
CEP-renumbering mismatch with no resolution timeline, so this project moved
to a Brazilian provider (faster MEI approval, native PIX). The adapted
checklist for this project is:

- [x] Processar pagamento — `POST /api/payment/create-checkout-session`
- [x] Webhook funciona — `POST /api/payment/webhook`
- [x] Acesso liberado — `users.plan` flips to `'pro'` and the frontend reflects
      it without a re-login (Dia 48's `refreshUser()`)
- [x] **Real Mercado Pago sandbox checkout page** — done 2026-08-11. A real
      test-mode `MERCADOPAGO_ACCESS_TOKEN` was configured and
      `create-checkout-session` was called against the live local backend:
      confirmed a genuine `mercadopago.com.br` checkout page loads, showing
      the correct product name and price. This surfaced a real bug (see
      below) that no amount of mocking would have caught.
- [ ] **Real webhook delivery + a completed test purchase** — still not done.
      `notification_url` currently points at `http://localhost:3000`, which
      Mercado Pago's servers can't reach — completing a real sandbox payment
      right now would leave `users.plan` stuck at `'free'` even though the
      "payment" succeeded, since the webhook never arrives. Needs the ngrok
      setup in step 2 below first. Every test covering the payment flow
      (`tests/unit/paymentService.test.js`, `tests/integration/payment.test.js`)
      mocks the Mercado Pago SDK at the `Preference.create` / `Payment.get` /
      `PaymentRefund.total` boundary, plus a real, correctly-computed webhook
      signature (the HMAC itself needs no external account, so that part
      _is_ exercised for real) — this proves our own code (route guards,
      signature verification, DB writes, `plan` propagation to the frontend)
      is correct, but an actual webhook delivery has never been exercised.

**Real bug found by this live test, not caught by any mock**: Mercado Pago
rejects preference creation outright (`400 auto_return invalid. back_url.success
must be defined`) whenever `auto_return: 'approved'` is combined with a
non-`https://` `back_urls.success` — a plain `http://localhost:5173` back URL
is otherwise accepted on its own, just not together with `auto_return`. Fixed
in `paymentService.js` by only sending `auto_return` when `FRONTEND_URL` is a
real `https://` URL; local dev now gets a working checkout without it (the
buyer has to click their own way back instead of auto-redirecting, a fine
trade-off for dev-only), and production will include it automatically once a
real `https://` domain is configured.

## Once you have real Mercado Pago credentials

1. **Get credentials**: [Mercado Pago Developers](https://www.mercadopago.com.br/developers) →
   "Suas integrações" → create/select an application → **Credenciais de
   teste** (sandbox — no real money moves) or **Credenciais de produção**.
   Set `MERCADOPAGO_ACCESS_TOKEN=TEST-...` (or `APP_USR-...` for production)
   in `packages/backend/.env`.
2. **Expose localhost**: Mercado Pago's webhook (`notification_url`) can't
   reach `localhost` — unlike Stripe, there's no official CLI tunnel, so use
   [ngrok](https://ngrok.com/) or similar:
   ```bash
   ngrok http 3000
   ```
   Set `BACKEND_PUBLIC_URL` in `.env` to the printed `https://...ngrok...`
   URL — `paymentService.js`'s `createLifetimeCheckoutSession` builds
   `notification_url` from it, so every new preference points webhooks at
   the tunnel automatically.
3. **Get the webhook secret**: same application in the dashboard → Webhooks
   → configure a notification URL (or rely on the per-preference
   `notification_url` from step 2, both work) → copy the **Chave secreta**
   (signing secret). Set as `MERCADOPAGO_WEBHOOK_SECRET` in `.env`.
4. **Run the full flow**:
   - Log in to the app, go to `/pricing`, click "Comprar Vitalício".
   - You should land on a real Mercado Pago-hosted checkout page (not a
     503 — if you still see one, `MERCADOPAGO_ACCESS_TOKEN` isn't picked up;
     restart the backend after editing `.env`).
   - Pay with a Brazil sandbox test card, cardholder name `APRO`, CPF
     `12345678909` (simulates an approved payment):
     - Mastercard `5480 8328 0103 3311`, CVV `123`, expiry `11/30`
     - Visa `4235 6477 2802 5682`, CVV `123`, expiry `11/30`
     - [Full test card list](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/integration-test/test-cards).
   - Mercado Pago redirects to `/payment/success?payment_id=...&status=approved&...`;
     the ngrok terminal (`http://127.0.0.1:4040` inspector) should show the
     webhook notification arriving and a `200` response logged.
   - Confirm `users.plan` is `'pro'` in Postgres, and that `/payment/success`
     shows the confirmed state (it polls `refreshUser()` up to 5 times, Dia 48).
5. **Test other outcomes on purpose**: swap the cardholder name to simulate
   a different result without changing the card number — `OTHE` (rejected),
   `CONT` (pending), `FUND` (insufficient funds), `EXPI` (expired card).
   Confirm a rejected/pending payment does **not** flip `plan` to `'pro'`
   (the webhook only grants access when the fetched payment's `status` is
   `'approved'` — see `handleMercadoPagoWebhook`).
6. **Test the "not yet confirmed" path on purpose**: temporarily kill the
   ngrok tunnel before completing a checkout, pay, and confirm
   `/payment/success` shows the "ainda confirmando" message instead of
   hanging or erroring — this is the real-world case where the webhook lags
   the redirect.

## Common failure modes

- **503 "Payments are not configured"** — `MERCADOPAGO_ACCESS_TOKEN` isn't
  set, or the backend process was started before it was added to `.env` (env
  vars are only read at process start). Restart `npm run dev:backend`.
- **503 on the webhook route specifically** — same thing but for
  `MERCADOPAGO_WEBHOOK_SECRET`. The checkout route and the webhook route are
  gated independently (`isMercadoPagoConfigured()` / `isWebhookConfigured()`
  in `services/paymentService.js`), so it's possible for one to work and not
  the other.
- **400 "invalid signature" on every webhook call** — `MERCADOPAGO_WEBHOOK_SECRET`
  doesn't match the application that actually sent the notification (double
  check you copied the secret from the same application whose access token
  is configured). Also worth checking directly: the manifest Mercado Pago
  signs is `id:<data.id lowercased>;request-id:<x-request-id>;ts:<ts>;` — if
  `data.id` ever gets read from the parsed body instead of the query string
  (`req.query['data.id']`), or isn't lowercased, the signature check fails
  even with the right secret (`verifyWebhookSignature` in
  `paymentService.js` is the one place this must stay correct).
- **Checkout succeeds but `plan` never flips** — check the ngrok inspector
  (`http://127.0.0.1:4040`) or the dashboard's webhook delivery log for a
  non-200 response from `/api/payment/webhook`. If the webhook never arrives
  at all, confirm the tunnel is still running and `BACKEND_PUBLIC_URL`
  matches its current URL (ngrok's free tier issues a new URL every restart
  — a stale `BACKEND_PUBLIC_URL` silently points new preferences at a dead
  tunnel).
- **`/payment/success` stuck on "ainda confirmando"** — either the webhook
  hasn't arrived yet (transient, the page polls automatically) or it errored
  silently server-side; check the backend logs for `grantLifetimeAccess`
  failures.
