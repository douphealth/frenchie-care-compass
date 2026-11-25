# Launch checklist

A plain `npx wrangler deploy` from `worker/` on `main` must match the live worker. Do not rename `frenchyfab-careplan-selfhosted-proxy`. It is in Cloudflare account `5dc0401c38d9de0c6947fee40a210937`, zone `frenchyfab.com`.

`worker/wrangler.toml` vars that a deploy will write:

- `BREVO_LIST_ID = "13"` (Brevo list "Frenchie Care Plan Leads". List 8 is another app.)
- `MAIL_FROM = "info@frenchyfab.com"`
- `CHECKOUT_VIA_LINKS = "1"` (Payment Links). Flip to `"0"` only after `STRIPE_SECRET_KEY` is the MyFrenchyBulldog restricted key with `checkout_session_write`.
- `INVOICE_CREATION = "1"`

Routes stay `care-plan.frenchyfab.com`, `care-plan.frenchyfab.com/`, and `care-plan.frenchyfab.com/*`. KV binding `CAREPLAN_KV` is `c19be13a9f5c41e3b4dfad50d0e26efd` and is already bound on the live worker.

## Already live

- Webhook `we_1UeYW8GCqwm95OGXL7So4Hpj` at `https://care-plan.frenchyfab.com/functions/v1/stripe-webhook`, and `STRIPE_WEBHOOK_SECRET` is set.
- Customer Portal default config `bpc_1UeYeZGCqwm95OGXOTbnvceF` (invoice history).
- Payment Links create a Stripe customer and an invoice.
- `CAREPLAN_KV` is bound.
- `INVOICE_CREATION` is on, so Checkout Sessions created after the worker that contains this flag is deployed will also create an invoice. Payment Links already do.

## Stripe product wording (owner, Stripe dashboard)

The vault Payment Link `https://buy.stripe.com/dRm14ncpW1qw3oh9f0ejK09` already charges $7.99 USD, one-time, in live mode (checked on its checkout page 2026-11-25). Its product is still named "Premium Frenchie Care Guide PDF" and the description says "12-page". The site sells it as "Frenchie Care Vault". Edit the product of price `price_1TFD07GCqwm95OGXc26k5JkI` (do not create a new price; the code and JSON-LD use this one):

- Name: `Frenchie Care Vault`
- Description: `Personalized French Bulldog care vault: a 4-week program for your main concern, daily routine and feeding chart, grooming, seasonal and vet-visit checklists, and an emergency red-flag guide, as a printable PDF. General education, not veterinary advice.`
- Price stays $7.99 USD, one-time.
- On both Payment Links, After payment → "Don't show confirmation page" → redirect to `https://care-plan.frenchyfab.com/payment-success?session_id={CHECKOUT_SESSION_ID}` (set on 2026-11-10; confirm it is unchanged).

If the price ever changes, change `VAULT_PRICE_USD` in `src/lib/stripeConfig.ts` and the JSON-LD offer in `index.html` together. `src/test/vaultOffer.test.tsx` fails when they differ.

## Remaining owner steps

1. Paste the MyFrenchyBulldog restricted key into `STRIPE_SECRET_KEY`. It needs Checkout Sessions read and `checkout_session_write`. Then set `CHECKOUT_VIA_LINKS` to `"0"` in `worker/wrangler.toml` and deploy the worker. Until that key is on the worker, leave the flag at `"1"`.
2. In the Brevo account `frenchyfab3`, turn IP blocking off. Workers have no fixed IP. Confirm the sender `info@frenchyfab.com` is verified.
3. Add the SPF record Brevo asks for on the sending domain.
4. In Stripe, confirm customer receipt emails are on.
5. Make one real purchase and refund it. The success page should unlock only after Stripe confirms the session, the receipt should show in the Customer Portal, and the refund should lock the vault on the next visit.

```bash
cd worker
npx wrangler secret put STRIPE_SECRET_KEY
```

Price IDs in the code are live mode: vault `price_1TFD07GCqwm95OGXc26k5JkI` ($7.99), emergency card `price_1THjRhGCqwm95OGXJZf9x553` ($4.99). There is no test-mode price.

`BREVO_API_KEY` stays a secret. Do not put it under `[vars]`.

## Frontend origin

| | Pages project | Account | Hostname |
| --- | --- | --- | --- |
| This repo (`main` builds here) | `frenchie-care-compass` | `284f1a03e12aa7416ab177db3f692c17` | `https://frenchie-care-compass.pages.dev` |
| DNS CNAME target | branch alias `frenchie-care-compass` on project `gearup-flow-master` | `5dc0401c38d9de0c6947fee40a210937` | `https://frenchie-care-compass.gearup-flow-master.pages.dev` |

`STATIC_ORIGIN` in `worker/careplan-proxy.js` is `https://frenchie-care-compass.pages.dev`. The worker route fetches that URL. Do not point it at the gearup-flow-master alias. While the worker route is attached, the CNAME is not the HTML origin. If the route is removed, the CNAME would serve the wrong app.

Optional Pages variable: `VITE_AMAZON_TAG`. Empty means Amazon links have no `tag`.

## After the Stripe key flip

`POST /functions/v1/create-payment` should return a `https://checkout.stripe.com/...` URL instead of 503. Health at `https://care-plan.frenchyfab.com/api/ffab-care/v1/health` should show `checkoutMode` `"checkout-sessions"`, and `stripeConfigured`, `webhookConfigured`, `brevoConfigured`, and `kvBound` true, with no key material in the body.

Until `CHECKOUT_VIA_LINKS` is `"0"`, health reports `checkoutMode` `"payment-links"`. That is the safe live state.

`scripts/deploy-to-github-and-cloudflare.sh` pushes `main` and runs `wrangler deploy`. It exits unless `CONFIRM_PRODUCTION_DEPLOY=1`.
