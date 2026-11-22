# Frenchie Care Compass

Free French Bulldog care-plan quiz and a one-time paid **Frenchie Care Vault** ($7.99, optional $4.99 emergency fridge card). There is no subscription.

The app is a Vite + React SPA. Its only backend is the Cloudflare Worker in `worker/`. Plans are computed in the browser. The week-by-week vault program is returned by the worker only after Stripe says the checkout is paid.

Live site today: https://care-plan.frenchyfab.com (worker in front of the Pages project `frenchie-care-compass`). See `LAUNCH_CHECKLIST.md` before deploying this branch. Do not run `scripts/deploy-to-github-and-cloudflare.sh` unless you intend to change production.

## Develop

```bash
npm ci
npm run typecheck
npm test
npm run lint
npm run build
npm run dev          # http://localhost:8080
```

`npm run dev` has no worker, so checkout falls back to the Stripe Payment Link and nothing unlocks until a verified session returns. To call the deployed worker from local dev: `VITE_API_BASE=https://care-plan.frenchyfab.com npm run dev`.

Cloudflare Pages installs with **npm 10**. After dependency changes, regenerate `package-lock.json` with npm 10. An npm 11 lockfile previously omitted a peer and broke Pages builds.

## Content rules

Educational only. Not veterinary advice and not vet-reviewed. No drug or supplement doses, and no invented reviews, counts, or urgency.

## Deploy

Pages builds `main` with `npm run build` and publishes `dist/`. The worker is deployed separately (`cd worker && npx wrangler deploy`) and is what `care-plan.frenchyfab.com` actually runs. The `gh-pages` branch is not what the domain serves. `https://gearup-flow-master.pages.dev` is a different site.
