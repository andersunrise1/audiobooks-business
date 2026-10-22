# Google Play Billing setup

Second lifetime-purchase path alongside Mercado Pago (`services/paymentService.js`
owns that one; this one is `services/googlePlayService.js`) - a purchase made
_inside_ the Android app via Google Play Billing. The mobile app's own
`GOOGLE_PLAY_BILLING.md` (packages/mobile) covers the client side; this is the
backend verification side.

**Why this exists**: Google Play's payments policy requires digital content
bought and consumed inside an Android app distributed via Google Play to use
Google Play Billing, not an external checkout link - see `CLAUDE.md`'s
"Google Play Billing" entry for the full reasoning. The website
(techspeaking.dev) keeps selling via Mercado Pago unaffected; this only
covers purchases made from inside the Android app. Either path sets the same
`users.plan = 'pro'`, so access is shared across web/mobile regardless of
which one a customer used.

## 1. Create a Google Cloud service account

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and
   create a new project (or reuse one), e.g. `techspeaking-play-billing`.
2. Enable the **Google Play Android Developer API** for that project
   (APIs & Services > Library > search "Google Play Android Developer API"
   > Enable).
3. APIs & Services > Credentials > Create credentials > Service account.
   Give it a name (e.g. `play-billing-verifier`), no roles needed at the
   Cloud project level (access is granted inside Play Console instead, next
   step).
4. Open the new service account > Keys > Add key > Create new key > JSON.
   This downloads a `.json` file - **treat it as a password**, never commit
   it.

## 2. Grant that service account access in Play Console

1. Play Console > Setup > **API access**.
2. It should show the Cloud project from step 1 is linked (Play Console
   auto-detects a service account created under a linked Cloud project). If
   not linked yet, follow the on-screen "link" flow.
3. Find the service account in the list, click **Grant access**.
4. Permissions needed: under **Financial data**, enable "View financial
   data" - this is what lets `purchases.products.get`/`.acknowledge` work.
   App-level access isn't needed beyond that for this use case.

## 3. Put the key where the backend can read it

1. Save the downloaded JSON key file as
   `packages/backend/google-play-service-account.json` (already gitignored
   - see `.gitignore`'s "Google Play Developer API service account key"
     line). Never rename it to something outside that gitignore pattern.
2. In `packages/backend/.env`:
   ```
   GOOGLE_PLAY_PACKAGE_NAME=com.techspeaking.app
   GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH=./google-play-service-account.json
   ```
   `GOOGLE_PLAY_PACKAGE_NAME` must match `packages/mobile/app.json`'s
   `"package"` value exactly.
3. On Railway (production), add the same two variables - but
   `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH` needs an actual file on disk, which
   a plain env var can't provide. Options: Railway's own file-mount/secret
   file feature if available, or write the JSON content to a temp file from
   a `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` env var at startup. Not built yet -
   revisit when actually deploying this (same "figure it out when there's a
   real account" pattern as every other external integration in this app).
4. Restart the backend after editing `.env` - env vars are read once at
   startup, same as every other provider's key in this project.

## 4. Create the in-app product in Play Console

1. The app must already exist in Play Console (an app record, even in
   internal testing - a product can't be created before that).
2. Play Console > your app > Monetize > **Products** > **In-app products**
   > Create product.
3. Product ID: exactly `techspeak_vitalicio` (matches
   `LIFETIME_PRODUCT_ID` in `googlePlayService.js` - changing one without
   the other breaks verification). It's a **managed product** (one-time
   purchase, not a subscription), matching `PRICING.md`'s lifetime model.
4. Set the price (match `PRICING.md`'s current price, kept independent
   from the website's price - Google doesn't know about Mercado Pago's
   price at all).
5. Activate the product.

## 5. Testing before going live

Play Billing's sandbox only works for accounts added as **license testers**
(Play Console > Setup > License testing) using the app's **internal testing**
track - a sideloaded APK/manual build can't exercise a real purchase flow.
See `packages/mobile/GOOGLE_PLAY_BILLING.md` for the client-side testing
steps once that's set up.

## What this backend code actually does

`POST /api/payment/google-play/verify` (auth required, called by the mobile
app right after a purchase completes client-side):

1. 503s if `GOOGLE_PLAY_PACKAGE_NAME`/`GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH`
   aren't configured - same gate pattern as every other external service in
   this app.
2. Calls the real Android Publisher API
   (`purchases.products.get`) to confirm the purchase token Google gave the
   client is genuine and `purchaseState === 0` (actually purchased, not
   canceled/pending) - never trusts the client's own claim that it paid.
3. Acknowledges the purchase if not already acknowledged (Google
   auto-refunds an unacknowledged purchase after 3 days).
4. Sets `users.plan = 'pro'` and stores the purchase token in
   `users.google_play_purchase_token` (migration 057) - mirrors
   `paymentService.js`'s `grantLifetimeAccess` exactly, just keyed off a
   different column.

**Not built yet, honestly**: refunding a Google Play purchase from the admin
side (the Android Publisher API has a separate `orders.refund` endpoint for
this - `refundLifetimePurchase` in `paymentService.js` only knows how to
refund a Mercado Pago payment). Revisit if a real Play Billing refund
request ever comes in.
