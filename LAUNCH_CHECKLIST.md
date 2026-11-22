# Launch checklist

Do not deploy until you intend to change production. This file is the order to follow. Nothing here was deployed from the audit branch.

The live worker is already `frenchyfab-careplan-selfhosted-proxy` in Cloudflare account `5dc0401c38d9de0c6947fee40a210937`, zone `frenchyfab.com`. `worker/wrangler.toml` uses that name and account id. `npx wrangler deploy` from `worker/` updates that worker. Do not create a second worker and do not rename it.

Verified dashboard state before this change:

- Routes: `care-plan.frenchyfab.com`, `care-plan.frenchyfab.com/`, and `care-plan.frenchyfab.com/*`. The toml keeps all three.
- Vars: `BREVO_LIST_ID=8`, `CHECKOUT_VIA_LINKS=1`, `MAIL_FROM=info@frenchyfab.com`. `BREVO_API_KEY` is a plain-text var. Move it to a secret before you rely on it.
- Secrets: `STRIPE_SECRET_KEY` is set. `STRIPE_WEBHOOK_SECRET` is not.
- KV: namespace `CAREPLAN_KV` id `c19be13a9f5c41e3b4dfad50d0e26efd` is in the toml. It is not bound on the live worker until you deploy.

## 1. Stripe

`STRIPE_SECRET_KEY` already exists. Replace it only if it cannot write Checkout Sessions. Read is required for verify, recovery, and refunds. Write is required to create the session that stores quiz answers.

```bash
cd worker
npx wrangler secret put STRIPE_SECRET_KEY
```

`worker/wrangler.toml` sets `CHECKOUT_VIA_LINKS = "0"`. The live var is `"1"`. The next deploy changes it to `"0"`. If Stripe then rejects session creation, the app opens the Payment Link instead of unlocking anything.

Price IDs in the code are live mode: vault `price_1TFD07GCqwm95OGXc26k5JkI` ($7.99), emergency card `price_1THjRhGCqwm95OGXJZf9x553` ($4.99). There is no test-mode price. Do not pay with a real card unless you will refund it.

## 2. Webhook

`STRIPE_WEBHOOK_SECRET` is not set. The current worker also has no webhook route.

1. Stripe → Developers → Webhooks → add `https://care-plan.frenchyfab.com/functions/v1/stripe-webhook`.
2. Events: `checkout.session.completed`, `charge.refunded`, `charge.dispute.created`.
3. `npx wrangler secret put STRIPE_WEBHOOK_SECRET` with the `whsec_...` value.

This route exists only after the new worker is deployed. Stripe will show delivery failures until that deploy.

## 3. KV

The namespace already exists in account `5dc0401c38d9de0c6947fee40a210937`:

```toml
[[kv_namespaces]]
binding = "CAREPLAN_KV"
id = "c19be13a9f5c41e3b4dfad50d0e26efd"
```

Do not create another namespace. Deploy binds this one. Without that binding, accounts return 503, the access email is skipped, and a refund webhook cannot store a revocation (the next page view still re-checks Stripe).

## 4. Brevo

The frenchyfab Brevo account has IP allowlisting on. Cloudflare Workers do not use a fixed IP, so allowlisting blocks every API call. The live lead route still returns success when Brevo rejects the contact. This branch returns 502 and logs the status instead.

Before deploy:

1. In Brevo, turn IP allowlisting off for this account. Workers cannot be allowlisted by address.
2. Confirm the sender `info@frenchyfab.com` and its domain are verified. `MAIL_FROM` stays `info@frenchyfab.com`.
3. Create the list that should receive care-plan opt-ins and set `BREVO_LIST_ID` in `worker/wrangler.toml` to that id. List 8 is the current value. Leave 8 only if that list is still the one you want.
4. Copy the current API key into a secret, then delete the plain-text var. A deploy that syncs `[vars]` can drop a dashboard var that is not in the toml, so put the secret first:

```bash
cd worker
npx wrangler secret put BREVO_API_KEY
```

Then in the worker settings, delete the plain-text `BREVO_API_KEY` variable. Do not add the key under `[vars]`.

## 5. Customer portal

New Checkout Sessions set `customer_creation=always`. Payment Links already in use may have no Customer.

1. Stripe → Settings → Billing → Customer portal: turn it on for invoice history. There is no subscription to cancel.
2. Public business name: **FrenchyFab**. The live Payment Link still shows **MyFrenchyBulldog** and **Premium Frenchie Care Guide PDF**.
3. Rename the $7.99 product to **Frenchie Care Vault** and the $4.99 product to **One-page emergency fridge card**.

The payment-success page calls `POST /functions/v1/billing-portal`. A guest checkout with no customer gets a 409 and the support address `info@frenchyfab.com`.

## 6. Frontend origin

Two different Cloudflare Pages projects are involved:

| | Pages project | Account | Hostname |
| --- | --- | --- | --- |
| This repo (`main` builds here) | `frenchie-care-compass` | `284f1a03e12aa7416ab177db3f692c17` | `https://frenchie-care-compass.pages.dev` |
| DNS CNAME target | branch alias `frenchie-care-compass` on project `gearup-flow-master` | `5dc0401c38d9de0c6947fee40a210937` | `https://frenchie-care-compass.gearup-flow-master.pages.dev` |

`care-plan.frenchyfab.com` is a proxied CNAME to the gearup-flow-master branch alias. The worker does not serve that alias. `STATIC_ORIGIN` in `worker/careplan-proxy.js` is `https://frenchie-care-compass.pages.dev`. The worker route fetches that URL and returns it. That is why the live HTML matched `frenchie-care-compass.pages.dev` and not the gearup alias. Keep it that way.

Clean path:

1. Merge this PR to `main`. The Git-connected project in account `284f1a03e12aa7416ab177db3f692c17` builds `main` with `npm run build` and publishes `dist/` to `frenchie-care-compass.pages.dev`. Do not connect this repo to `gearup-flow-master`, and do not change `STATIC_ORIGIN` to the gearup alias.
2. From `worker/`, on account `5dc0401c38d9de0c6947fee40a210937`, run `npx wrangler deploy`. That updates `frenchyfab-careplan-selfhosted-proxy` only.
3. Leave the DNS CNAME as it is while the worker route stays attached. The route, not the CNAME, chooses the HTML. If the worker route is ever removed, the CNAME would serve the gearup-flow-master alias, which is the wrong app. The optional cleanup is to point the CNAME at `frenchie-care-compass.pages.dev` after you have confirmed that hostname is the production deployment of this repo.

Optional Pages variable: `VITE_AMAZON_TAG`. Empty means Amazon links have no `tag`.

## 7. Verify after deploy

`GET https://care-plan.frenchyfab.com/api/ffab-care/v1/health` does not exist on the worker that is live now. That URL returns a WordPress 404. The health JSON exists only after this worker is deployed. Do not treat today's 404 as a failed deploy of this branch.

After deploy, expect `stripeConfigured`, `webhookConfigured`, `brevoConfigured`, and `kvBound` true, and `checkoutMode` `"checkout-sessions"`. The body must not contain key material. Also expect `x-careplan-edge` to change from `worker-2026-11-10`, and the page's script URL to match `https://frenchie-care-compass.pages.dev` rather than `frenchie-care-compass.gearup-flow-master.pages.dev`.

Then:

1. `POST /functions/v1/create-payment` returns a `https://checkout.stripe.com/...` URL, not 503.
2. Finish a quiz and a payment you are willing to refund. `/payment-success?session_id=cs_...` shows **Vault unlocked** only after Stripe confirms it.
3. Refund the charge and reload. The vault locks.
4. Submit the email gate with Brevo allowlisting still on and confirm the UI reports failure. Turn allowlisting off, submit again, and confirm the contact lands on the list in `BREVO_LIST_ID`.
5. Create an account, reset the password, log out, and log in.

`scripts/deploy-to-github-and-cloudflare.sh` pushes `main` and runs `wrangler deploy`. It exits unless `CONFIRM_PRODUCTION_DEPLOY=1`.

## 1. Stripe key that can create Checkout Sessions

The worker creates a Checkout Session so the quiz answers travel in session metadata and a new device can rebuild the plan.

1. In Stripe, create a restricted key with **Checkout Sessions: Write** and **Checkout Sessions: Read**. Read is what verifies payment, recovery, and refunds. Write is what creates the session.
2. `cd worker && npx wrangler secret put STRIPE_SECRET_KEY`
3. In the Cloudflare Worker settings, set `CHECKOUT_VIA_LINKS` to `0` or delete the variable. The repo's `worker/wrangler.toml` already sets `"0"`. A dashboard value of `"1"` overrides the file and forces the Payment Link fallback. That fallback cannot store quiz answers.
4. Confirm `POST https://care-plan.frenchyfab.com/functions/v1/create-payment` returns a `https://checkout.stripe.com/...` URL, not 503.

Price IDs already in the code (live mode):

- Vault: `price_1TFD07GCqwm95OGXc26k5JkI` ($7.99)
- Emergency fridge card: `price_1THjRhGCqwm95OGXJZf9x553` ($4.99)

There is no test-mode price in this repo. Do not run a real card against production to "try it" unless you intend to refund it. Stripe test mode needs separate test price IDs, which are not configured.

## 2. Webhook

1. Stripe Dashboard → Developers → Webhooks → add endpoint  
   `https://care-plan.frenchyfab.com/functions/v1/stripe-webhook`
2. Events: `checkout.session.completed`, `charge.refunded`, `charge.dispute.created`.
3. `npx wrangler secret put STRIPE_WEBHOOK_SECRET` with the `whsec_...` signing secret.

`checkout.session.completed` sends the access email once (only if KV is bound). `charge.refunded` and `charge.dispute.created` mark the stored entitlement revoked. The success page also re-checks Stripe on every visit, so a refund locks the vault even if the webhook is late.

## 3. KV namespace

Accounts, entitlement records, fulfilment-email dedupe, recovery cooldown, and rate limits need KV.

```bash
cd worker
npx wrangler kv namespace create CAREPLAN_KV
```

Uncomment the `[[kv_namespaces]]` block in `worker/wrangler.toml`, paste the id, and deploy the worker. Without KV:

- `POST /functions/v1/auth/*` returns 503
- the fulfilment email is skipped (Stripe retries would otherwise send duplicates)
- refund webhooks cannot remember a revocation until the next live Stripe check

## 4. Brevo

`npx wrangler secret put BREVO_API_KEY`  
Keep `BREVO_LIST_ID` (`8`) and `MAIL_FROM` (`info@frenchyfab.com`) as worker vars. The sender must be verified in Brevo.

Brevo sends the vault access link and the password-reset email. Lead capture also writes the contact when the key is set.

## 5. Customer portal (receipts and refunds)

New Checkout Sessions set `customer_creation=always`, so Stripe creates a customer. Payment Links used before this change may not have one.

1. Stripe Dashboard → Settings → Billing → Customer portal: enable it, and allow customers to see invoice history. This product is one-time, so there is no subscription to cancel.
2. Update the public business name to **FrenchyFab**. The live Payment Link still shows **MyFrenchyBulldog** and the product title **Premium Frenchie Care Guide PDF**.
3. Rename the $7.99 product to **Frenchie Care Vault** and the $4.99 product to **One-page emergency fridge card**, matching the app.

Buyers open **Receipt or refund** on the payment-success page. That calls `POST /functions/v1/billing-portal`. Guest checkouts with no customer get a 409 and are told to use the receipt email or `info@frenchyfab.com`.

## 6. Pages

Merge to `main`. Cloudflare Pages project `frenchie-care-compass` builds `main` (`npm run build`, output `dist/`). Then deploy the worker and purge the cache for `care-plan.frenchyfab.com`.

Optional Pages environment variable: `VITE_AMAZON_TAG` (Amazon Associates ID). Empty means Amazon links have no `tag`.

## 7. Verify

Open `https://care-plan.frenchyfab.com/api/ffab-care/v1/health`.

Expect `stripeConfigured`, `webhookConfigured`, `brevoConfigured`, and `kvBound` to be true, and `checkoutMode` to be `"checkout-sessions"`. The response must not contain key material.

Then, with a Stripe test clock or a payment you are willing to refund:

1. Finish the quiz, create an account, and start checkout.
2. Land on `/payment-success?session_id=cs_...` and see **Vault unlocked** only after Stripe confirms it.
3. Reload. The vault stays open. Refund the charge. Reload. The vault locks.
4. Password reset email arrives. Logout and login work.

`scripts/deploy-to-github-and-cloudflare.sh` pushes `main` and runs `wrangler deploy`. It exits unless `CONFIRM_PRODUCTION_DEPLOY=1`.
