# FrenchyFab Care Compass

Free French Bulldog care-plan quiz with a paid "Care Vault", live at
https://care-plan.frenchyfab.com.

## How it fits together

| Piece | Where | What it does |
| --- | --- | --- |
| App (Vite + React) | `src/` → Cloudflare Pages project `frenchie-care-compass` (builds `main` with `npm run build`, output `dist/`) | Quiz, free plan, PDF/ICS export, vault UI. The plan is computed in the browser (`src/lib/planGenerator.ts`). |
| Edge worker | `worker/careplan-proxy.js` (Cloudflare Worker on `care-plan.frenchyfab.com/*`) | Sits in front of the Pages build (`care-plan` CNAME → `frenchie-care-compass.gearup-flow-master.pages.dev`) and is the only backend: Stripe checkout, payment verification, purchase recovery, lead capture to Brevo. |
| Stripe | `PREMIUM_PRICE_ID`, `EMERGENCY_CARD_PRICE_ID` in `src/lib/stripeConfig.ts` and the worker | Checkout Sessions created by the worker. Payment Links are only a fallback. |

## Free vs paid

* **Free:** 5-question quiz → plan with calorie estimate, grooming, exercise, health watch-outs, heat meter, breathing notes, free PDF and calendar file. Email is asked once to save the plan.
* **Care Vault ($7.99, +$4.99 emergency fridge card):** a 4-week, week-by-week program for the owner's main concern (`src/lib/focusProgram.ts`), daily routine, seasonal calendar, red-flag checklist, when-to-call-the-vet guide, heat/cold protocol, and a ~20-page printable PDF.

## Paid flow

1. `PremiumUpsell` → `createCheckout()` → `POST /functions/v1/create-payment`. With `CHECKOUT_VIA_LINKS=1` (current
   setting, because the live key cannot create sessions) the worker answers 503 and the app opens the Stripe Payment Link,
   which returns to `/payment-success?session_id={CHECKOUT_SESSION_ID}`. With session-write permission the worker creates the
   Checkout Session itself and stores the quiz answers in its metadata (enables the cross-device rebuild).
2. `/payment-success` → `POST /functions/v1/verify-payment` → the worker asks Stripe: complete, paid, contains the vault price, not refunded or disputed.
   Only then is the vault unlocked. The answers on the session rebuild the plan on a new device.
3. The success page asks for fulfilment once (`fulfil: true`); the worker emails a permanent access link (Brevo).
   "Sent" is remembered in KV when `CAREPLAN_KV` is bound, otherwise in the edge cache. Emailed links carry `via=email`
   so opening them never sends another email.
4. Lost access: `POST /functions/v1/restore-purchase` emails the link again (same response for unknown emails, 10-minute cooldown).
5. The results page re-verifies a stored purchase on every visit, so refunds re-lock the vault. Buyers never see the upsell again.

If `STRIPE_SECRET_KEY` is not set, the payment routes return 503, the app sends buyers to the Payment Links,
and **nothing unlocks**. Set the key before deploying the app build.

## One-time Stripe/Cloudflare setup

1. `STRIPE_SECRET_KEY` (worker secret): restricted key with Checkout Sessions *read* at minimum. Add *write* and remove
   `CHECKOUT_VIA_LINKS` to let the worker create sessions.
2. Both Payment Links already redirect to `https://care-plan.frenchyfab.com/payment-success?session_id={CHECKOUT_SESSION_ID}`.
3. `BREVO_API_KEY` should be a worker secret, not a plain-text variable.
4. Optional: bind a KV namespace as `CAREPLAN_KV` for durable "email sent" markers.

## Develop

```sh
npm ci
npm run dev          # http://localhost:8080 (payment routes fail locally -> safe fallbacks)
npm test             # unit tests, including the worker against a mocked Stripe/Brevo
npm run lint
npm run build
```

To exercise the real worker from local dev: `VITE_API_BASE=https://care-plan.frenchyfab.com npm run dev`
(the worker allows `http://localhost:8080` as an origin and builds localhost return URLs for it).

## Deploy

* Worker: `cd worker && npx wrangler deploy`
* App: merge to `main`. Cloudflare Pages runs `npm ci` with **npm 10**, so regenerate `package-lock.json` with
  `npx npm@10 install` after dependency changes (an npm 11 lockfile left out a peer and broke every build from May to November).
  Then purge the cache for `care-plan.frenchyfab.com`.
* The `gh-pages` branch is not what the domain serves.

## Content rules

Educational only, not veterinary advice and not vet-reviewed. No drug or supplement doses, no invented
reviews, counts or urgency. Tests in `src/test/` enforce the no-dose rule for plan and vault text.
