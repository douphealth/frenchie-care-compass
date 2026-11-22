# Frenchie Care Compass — end-to-end audit

Audit date: 2026-11-22. Scope is the repo at `main` (`f0bebdb`), the owner snapshot dated 2026-11-22 07:58–08:02, and the live hosts named in the request. This branch then fixes the issues that can be fixed in code. Production was not modified, except that a headless browser opened the existing Stripe Payment Link and did not pay.

## (a) Verdict

**No.** The app that is live at https://care-plan.frenchyfab.com is not a finished end-to-end product. The free quiz renders and the Payment Link opens a real $7.99 Stripe checkout, but Checkout Sessions are switched off (`CHECKOUT_VIA_LINKS=1` returns 503), there is no webhook, no account system, no sitemap, and the health check falls through to WordPress. Premium text for the 4-week program shipped inside the public JavaScript bundle, while the on-screen lock could be reasoned about from `localStorage` only after a server check that the UI already required. It is a one-time purchase, not a subscription.

This branch makes the code launch-ready for that one-time product: server-checked vault content, signed webhooks (including refund and dispute revocation), email/password accounts, checkout session creation when the Stripe key allows it, security headers, SEO files, and a local production build that typechecks, lints with no errors, passes 56 tests, and scores Lighthouse 100 accessibility / 100 SEO on the landing page. It is **not live** until the owner completes `LAUNCH_CHECKLIST.md` (Stripe write key, webhook secret, KV, Brevo, portal, and deploy).

## What each host serves

Verified 2026-11-22 by SHA-256 of the entry JavaScript.

| Host | What it is | Entry asset | SHA-256 |
| --- | --- | --- | --- |
| https://care-plan.frenchyfab.com | This app, via the worker (`x-careplan-edge: worker-2026-11-10`) | `index-CjnT5hcX.js` | `c454624cec0fb406b269d8593f053859c797b23fc7741cacf8fcbd000d416049` |
| https://frenchie-care-compass.pages.dev | Same bytes as care-plan. The worker's `STATIC_ORIGIN` | `index-CjnT5hcX.js` | same hash |
| https://frenchie-care-compass.gearup-flow-master.pages.dev | An older or different Pages build of this app, not what the domain serves | `index-DSqAg0yJ.js` | `f515ca44174a57a43c71f53f474c1ee8faf514e8419159a0bb1dbeaecb556746` |
| https://gearup-flow-master.pages.dev | A different product: "Running Shoe Reviews, Fitness Calculators & Training Tools \| GearUpToFit" | `index-DW_b1-4B.js` | not this repo |
| Snapshot `dist/` (2026-11-22 08:02) | A local build of the snapshot, not deployed | `index-BD08Pi3c.js` | `174f8f53e75160bc22b594953284bbc271671ec95faf1f3729f0a4b450fef314` |

`care-plan.frenchyfab.com` and `frenchie-care-compass.pages.dev` are the same build. They are not the snapshot build, and they are not `gearup-flow-master.pages.dev`.

Owner-confirmed DNS, checked against the worker source: `care-plan.frenchyfab.com` is a proxied CNAME to `frenchie-care-compass.gearup-flow-master.pages.dev` (branch alias of Pages project `gearup-flow-master`, account `5dc0401c38d9de0c6947fee40a210937`). The worker does not fetch that alias. `STATIC_ORIGIN` is `https://frenchie-care-compass.pages.dev`, the Pages project `frenchie-care-compass` in account `284f1a03e12aa7416ab177db3f692c17`, which is the project GitHub builds from this repo. The worker route is why the custom domain matches that origin. Keep `STATIC_ORIGIN` on `frenchie-care-compass.pages.dev`.

## Snapshot changes

The zip is newer than `main` for the files listed in the request. Adopted means the change is on this branch. Adjusted means the idea is kept and the implementation changed. Rejected means it is not on this branch.

| Snapshot change | Decision | Why |
| --- | --- | --- |
| `theme-color`, self-closed meta tags, product name "Frenchie Care Vault by FrenchyFab", `&amp;` in HTML attributes | Adopted | Valid HTML. The attribute form of `&amp;` is correct in `index.html`. |
| `package.json` name `frenchie-care-compass`, version `1.0.0`, `typecheck` script | Adjusted | Name and version kept. `tsc --noEmit` fails on the solution-style `tsconfig.json` ("files" is empty). The script is `tsc -p tsconfig.app.json --noEmit`. Lockfile name updated to match. npm 10 `npm ci` still works. |
| `public/_headers`, `public/_redirects` | Adjusted | Kept. `script-src` no longer includes `'unsafe-inline'`. The SPA fallback does not swallow real files such as `sitemap.xml`. |
| Feature comparison: drop the duplicate emergency row, add the 4-week program, export the list | Adjusted | Behavior kept. The constant moved to `src/lib/comparisonFeatures.ts` so ESLint fast-refresh stays quiet. |
| Landing hero: less motion, stronger text | Adjusted | Kept. JSX `&amp;` would have rendered the literal text `&amp;` (HTML attributes and JSX text are not the same). Replaced with `&`. Contrast of the badge, audience tags, and footer line was below 4.5:1; those classes are darker now. |
| Affiliate grid CTA and `rel` (warning links are not `sponsored`) | Adopted | The AKC safety link is not an ad. Amazon links stay `sponsored`. |
| `withAmazonTag` / `VITE_AMAZON_TAG` | Adopted | Empty tag leaves URLs unchanged. No Associates id was invented. |
| Results: PDF loading state, share fallback, print toast | Adopted | |
| Payment success: hide the PDF button until a profile exists | Adopted, then extended | The green checkmark also no longer shows when payment is missing or unconfirmed. |
| Worker webhook, health route, CSP, HSTS, `CHECKOUT_VIA_LINKS=0` | Adjusted | Signature check and health route kept. Webhook now also handles refunds and disputes, refuses payloads over 100kb, and does not email when KV cannot remember the send. Snapshot used `firstTime(..., true)`, which would email on every Stripe retry without KV. |
| Removal of legacy HTML rewrite, `/rest/v1/` stub, and the R2 og-image fallback | Adjusted | Rewrite of old Lovable/Supabase URLs is kept because `frenchie-care-compass.gearup-flow-master.pages.dev` is a different build. The unused R2 preview image fallback is not restored. |
| `scripts/deploy-to-github-and-cloudflare.sh` pushing `main` and running `wrangler deploy` | Adjusted | The script now exits unless `CONFIRM_PRODUCTION_DEPLOY=1`. It was not run. |
| Snapshot README that dropped the content rules and the npm 10 warning | Adjusted | Architecture notes kept in `README.md` and `LAUNCH_CHECKLIST.md`. Content rules and the npm 10 lockfile warning stay. |
| `dist/` | Rejected | `dist/` is gitignored. Not committed. |
| Snapshot claim that the live key should be assumed able to create sessions | Not trusted | Live `POST /functions/v1/create-payment` returned **503** `Checkout sessions are not enabled; use the payment link` on 2026-11-22. The code tries sessions when `CHECKOUT_VIA_LINKS` is not `"1"` and falls back to the Payment Link on failure. |

## (b) Findings

Severity is the production impact before this branch. Status is this branch.

| Severity | Area | Finding | Evidence | Status |
| --- | --- | --- | --- | --- |
| Critical | Payments | Checkout Sessions are disabled in production. Buyers get a Payment Link, which does not store quiz answers, so a new device cannot rebuild the plan from the session. | `curl -X POST https://care-plan.frenchyfab.com/functions/v1/create-payment` → 503. `worker/wrangler.toml` on `main` set `CHECKOUT_VIA_LINKS = "1"`. | Needs owner action. Code default is now `"0"`. The dashboard override and the Stripe key still have to change. See checklist steps 1. |
| High | Payments | No signed webhook. Fulfilment and revocation depended on the browser calling `verify-payment`. | Live worker header `worker-2026-11-10`. `GET /api/ffab-care/v1/health` returned WordPress `rest_no_route` (the path was proxied). | Fixed in code. Owner must set `STRIPE_WEBHOOK_SECRET` and the endpoint. |
| High | Entitlement | Vault program text (`buildFocusProgram` / `buildPremiumModules`) was in the client bundle. The UI did not trust a bare `{paid:true}` flag, but anyone could read the chunk. | `src/lib/focusProgram.ts` imported by `LockedModules`, `PremiumUpsell`, and `pdfGenerator` on `main`. | Fixed for the on-screen program. The UI fetches `POST /functions/v1/vault-content` after Stripe confirms the session. Production build of this branch does not contain `Photograph belly` or `reduce each meal by about 10%`. |
| High | Entitlement | Forged `localStorage` shaped like an entitlement must not unlock the screen. | `src/test/gating.ui.test.tsx` renders Results with `paid: true` and a fake `cs_test_...` id while `fetch` rejects. The screen stays on "Premium modules — locked". | Fixed (already the UI's initial state; now covered by a test). |
| High | Accounts | No sign-up, login, logout, or password reset. Access was only the Stripe session link. | `src/App.tsx` on `main` had `/` and `/payment-success` only. | Fixed in code. Needs `CAREPLAN_KV` and `BREVO_API_KEY` or auth returns 503 and reset email cannot send. |
| Medium | Payments | Success page showed a green check for "Payment not confirmed". | `PaymentSuccess.tsx` on `main` rendered `CheckCircle2` for every non-checking state. | Fixed. Local screenshot `audit/payment-missing.png` shows an alert icon and the heading "Payment not confirmed". |
| Medium | Payments | No way to open a receipt or request a refund in the product. | No billing-portal route on `main`. | Fixed as a one-time Customer Portal session. Needs the owner to enable the portal. There is no subscription to cancel. |
| Medium | Security | Worker responses lacked CSP, `X-Frame-Options`, and HSTS. | Live response headers: `x-careplan-edge: worker-2026-11-10`, no CSP. | Fixed in the worker and `public/_headers`. |
| Medium | Security | `/api/ffab-care/v1/*` proxied arbitrary methods and forwarded `Authorization` to WordPress. | Live health check returned a WordPress JSON 404. | Fixed: health is handled first; proxy strips `Authorization` and allows only GET, POST, HEAD. |
| Medium | Leads | Lead capture reported success even when Brevo rejected the contact. The live key is a plain-text worker var, list 8, and the Brevo account allowlists IPs, which blocks Workers. | Live route behavior described by the owner; code on `main` returned `success: true` after a valid email. | Fixed. A Brevo failure logs the status and list id and returns 502. `BREVO_LIST_ID` selects the list. The plain-text key still has to be moved to a secret, and IP allowlisting has to be turned off. See `LAUNCH_CHECKLIST.md`. |
| Medium | SEO | `/sitemap.xml` was the SPA shell. `robots.txt` had no Sitemap line. | Live `sitemap.xml` `content-type: text/html`, body starts `<!doctype html>`. | Fixed. Local preview serves `text/xml`. |
| Medium | A11y / SEO | Quiz and email gate had no `h1`. Landing contrast failed WCAG AA for small text. | Live quiz question is an `h2` (repo before this branch). Lighthouse on the first local build: contrast 4.31, 4.02, and 3.07. | Fixed. Second Lighthouse run: accessibility 100, contrast score 1. |
| Medium | UX | Exit-intent popup opened after 45 seconds even without a mouse leave, including on phones. | `ExitIntentPopup.tsx` `setTimeout(..., 45000)`. | Fixed. Desktop mouse-leave only. Copy no longer says "Don't miss out". |
| Medium | Copy | Email gate promised "No spam ever" while the lead is added to a Brevo list. | `EmailGate.tsx` on `main`. | Fixed. Copy is "Used to save your plan". |
| Low | Performance | Landing Lighthouse performance is 79 on the local preview (accessibility, SEO, and best-practices are 100). | `/tmp/lh2.json` against `http://127.0.0.1:4173/` with Playwright Chromium, 2026-11-22. | Won't fix in this pass. The score is the font and script cost of the existing landing, not a broken flow. |
| Low | Supply chain | `npm audit` after `npm audit fix` still reports 19 issues (2 critical, 2 high) that only go away by jumping to React Router 7, Zod 4, or Vitest 5. | `npm audit` on 2026-11-22. Vitest's critical advisory is the Vitest UI dev server, which this app does not run in production. | Won't fix by force-upgrading majors. Non-breaking fixes were applied. |
| Low | Lint | `button.tsx` and `sonner.tsx` warn about fast refresh because they export helpers. | `npm run lint` exit 0, 2 warnings, both pre-existing shadcn files. | Won't fix. No errors. |
| Info | Product | Stripe Payment Link business name is "MyFrenchyBulldog" and the product is "Premium Frenchie Care Guide PDF", not "Frenchie Care Vault". | Headless open of `https://buy.stripe.com/dRm14ncpW1qw3oh9f0ejK09?prefilled_email=audit-bot@example.com`. No card was entered. Screenshot `audit/desktop-checkout.png`. | Needs owner action in the Stripe Dashboard. |

## (c) Free-flow checklist

Browser walk of the **local production build** (`vite preview` on 127.0.0.1:4173) on 2026-11-22, desktop 1280 and mobile 375. Evidence: `audit/browser-evidence.json` and the screenshots in `audit/`. Live production was checked separately and was not submitted (no lead, no payment).

| Step | Local build | Live site (current deploy) |
| --- | --- | --- |
| Landing loads, one h1, no console exception | Pass. h1 "Get Your Frenchie's Personalized Care Plan in Under 2 Minutes". | Pass. Same h1. `x-careplan-edge: worker-2026-11-10`. No page errors. |
| Quiz → email → results | Pass. Desktop and 375px. Results h1 count 1. Horizontal overflow 0. | Not completed. Submitting the email would write a production lead. |
| Free tools on results (calorie card, BOAS, heat, plan sections, affiliate links, PDF/calendar buttons, share, start over) | Pass. Visible on `audit/mobile-results.png`. PDF generation itself was not downloaded in the browser (it needs a user gesture save). | Unverified live. |
| Lead POST | Preview has no worker, so the lead POST 404s and the UI keeps the plan on device (expected). | Unverified. Not submitted. |
| `/payment-success` with no session | Pass. Heading "Payment not confirmed", alert icon, recovery form. | Route returns 200 HTML and `x-robots-tag: noindex` (probed with curl). UI of the old bundle was not clicked. |
| `/account` | Pass. h1 "Your account". API 503 until KV exists; the page explains that. | Route is not in the live bundle (would be the SPA shell only). |
| Unknown URL | Pass. h1 "Page not found". | Live worker serves the SPA shell for extension-less 404s, so this is 200 HTML today. |
| `/sitemap.xml` and robots | Pass locally (`text/xml`, robots contains `Sitemap:`). | Fail. Sitemap is `text/html` (the app shell). |
| Mobile 375 | Pass. Overflow 0. | Landing only. |

## (d) Paid-flow checklist

| Step | Verified live | Verified by code / local test |
| --- | --- | --- |
| Upgrade button reaches Stripe | Yes. After the local quiz, the button navigated to the live Payment Link. Price shown $7.99. Email prefilled `audit-bot@example.com`. No card entered. | `createCheckout` falls back to `PAYMENT_LINKS.vault` when session creation fails. |
| Worker creates a Checkout Session | **No.** Live endpoint returns 503 while `CHECKOUT_VIA_LINKS=1`. | Unit test asserts `success_url` contains `{CHECKOUT_SESSION_ID}`, both price ids when the bump is on, and `customer_creation=always`. |
| Success redirect | Payment Links are documented to return to `/payment-success?session_id={CHECKOUT_SESSION_ID}`. Not completed, because that requires paying. | `createPayment` sets that success URL and `cancel_url` `/?checkout=cancelled`. |
| Cancel | Not clicked through Stripe. | `Index.tsx` reads `?checkout=cancelled`, shows a toast, and returns to the upsell. |
| Unlock only after Stripe says paid | Not exercised with a real session. | `acceptServerVerification` rejects a local `{paid:true}` that does not echo the session. `verify-payment` asks Stripe. UI test keeps a forged entitlement locked. |
| Vault body not returned unpaid | Not on the live worker (route does not exist there yet). | Test: unpaid session → 403 and the body does not contain "4-week". Paid session → 4 weeks and modules. |
| Webhook signature, replay, refund | Not live. No webhook secret is configured (health URL 404s on the current worker). | Tests: bad signature 400, stale timestamp rejected, `checkout.session.completed` emails once, no email without KV, `charge.refunded` sets `paid: false` on the KV record. |
| Account sign-up, bad password, reset, logout | Not live. Needs KV and Brevo. | Worker test uses a fake KV and a mocked Brevo call. Reset token is taken from the email body. |
| Subscription cancel | Not applicable. | Product is one-time. `customer.subscription.deleted` is acknowledged and ignored. Portal is for receipts and refunds. |
| Server-side enforcement of every PDF sentence | No, and not fully true in this branch either. | The 4-week program is server-only. The other printable chart pages are still drawn by `pdfGenerator.ts` in a lazy chunk (`dist/assets/pdfGenerator-*.js`). See "what's missing". |

## (e) What is still missing for a genuine launch

1. Owner deploy of this branch's Pages build and worker, plus the secrets in `LAUNCH_CHECKLIST.md`. Until then production behavior does not change.
2. A Stripe restricted key with Checkout Sessions write, and `CHECKOUT_VIA_LINKS` not forced to `"1"`.
3. Webhook signing secret and the three events.
4. `CAREPLAN_KV`, or accounts and the once-only access email do not work.
5. Brevo key, or reset and access emails do not send.
6. Customer portal enabled, and the Payment Link product renamed so checkout matches the app.
7. The printable chart copy inside `src/lib/pdfGenerator.ts` is still in the lazy client chunk. Hiding it would mean drawing those pages from server-supplied text. The week-by-week program, which is the paid centrepiece, is already withheld.
8. There is no recurring subscription. Adding one needs a new Stripe price and a product decision. This branch does not invent one.
9. No Stripe test-mode prices. A live end-to-end payment was intentionally not completed.
10. `npm audit` majors (React Router 7, Zod 4, Vitest 5) were not force-upgraded.

## (f) Top 5 fixes, in order

1. Deploy the worker with `CHECKOUT_VIA_LINKS=0` and a Stripe key that can write Checkout Sessions, then confirm `create-payment` returns a `checkout.stripe.com` URL.
2. Add the webhook endpoint and `STRIPE_WEBHOOK_SECRET`, and bind `CAREPLAN_KV`, so access email, accounts, and refund revocation persist.
3. Set `BREVO_API_KEY` and enable the Stripe Customer portal. Rename the live product from "Premium Frenchie Care Guide PDF" / "MyFrenchyBulldog" to Frenchie Care Vault / FrenchyFab.
4. Ship the Pages build from this branch so the sitemap, account page, and server-fetched vault UI replace `worker-2026-11-10`.
5. If the remaining PDF chart text must not be in the public bundle, move those page strings behind `vault-content` as well. That is the only paid copy still compiled into client JavaScript.

## Build health (this branch)

| Check | Result |
| --- | --- |
| `npm test` | 56 passed (vitest 3.2.7) |
| `npm run typecheck` | pass (`tsc -p tsconfig.app.json --noEmit`) |
| `npm run lint` | pass, 2 pre-existing warnings in `button.tsx` and `sonner.tsx` |
| `npm run build` | pass (vite 5.4.21) |
| Lighthouse, local preview `/` | performance 79, accessibility 100, best-practices 100, seo 100 |

## Security notes that were checked

- No `.env` with secrets is in the repo. `.env.example` has an empty `VITE_AMAZON_TAG`.
- Stripe secret, webhook secret, and Brevo key are worker secrets, not client code. Public price ids and Payment Link URLs are in `src/lib/stripeConfig.ts` on purpose.
- `npm audit fix` (no `--force`) was applied. Remaining advisories need major upgrades or are dev-only (Vitest UI).
