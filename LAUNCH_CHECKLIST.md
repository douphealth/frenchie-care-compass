# Launch checklist

This branch does not change production. Complete these steps in order after the pull request is reviewed. Values below are names, not secrets. Never commit secret values.

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
