# Frenchie Care Compass — Enterprise Overhaul Plan

A focused plan to rebuild the app around a clinical engine, dynamic helpful tools, and stronger monetization without breaking the existing Stripe / PDF / Supabase flow.

## 1. Design System Refresh
- Update `src/index.css` + `tailwind.config.ts` semantic tokens:
  - `--primary`: deep vet green `#1E3F20`
  - `--background`: clean cream `#FAF7EF`
  - `--accent` / `--warning`: amber/orange for safety callouts
  - `--destructive`: warm red for "Urgent Action" banners
- Keep shadcn component shapes; only retheme tokens so existing UI stays consistent.

## 2. Local-First Persistence
- New `src/lib/profileStore.ts` wrapping `localStorage` with a single key (`frenchie_profile_v1`) storing:
  - `dogProfile` (name, age in months, weight kg, sex, neutered, conditions[])
  - `quizAnswers`
  - `plan` (last generated)
  - `email`, `completedAt`
- On `Index.tsx` mount: hydrate state; if a completed plan exists, skip landing/quiz and land on `results` (with a small "Start over" affordance already present).

## 3. Clinical Engine
New `src/lib/clinical.ts` with pure functions + unit-tested logic:
- `calcMER({ weightKg, kFactor })` → `K * weight^0.75` kcal/day
- `pickKFactor(profile)` → 140 / 130 / 95 / 80 based on life stage, neuter status, BCS / activity
- `kcalToCups(kcal, kcalPerCup = 350)` → cups/day (rounded to ¼)
- `boasScore({ breathingSound, activityTolerance, snoring })` → `{ level: 'low'|'moderate'|'urgent', score, reasons[] }`
- `heatRisk({ tempF })` → zones: safe (<70), caution (70–80), danger (80–85), emergency (>85)
- Each output carries a `citation` string (e.g., "WSAVA / NRC 2006 clinical equation").

Quiz additions (`src/lib/quizData.ts`):
- Add `breathingSound` (Quiet / Snoring / Raspy / Struggling)
- Add `neutered` (yes/no), `ageMonths` numeric, `weightKg` numeric, `name`

## 4. New Result Modules
Under `src/components/results/`:
- `CalorieCard.tsx` — shows MER kcal, cups/day, K-factor used, formula citation badge.
- `BoasScorecard.tsx` — interactive slider mapping breathing symptoms → live score + color band.
- `HeatStressMeter.tsx` — vertical thermometer SVG with safe/caution/danger/emergency bands and the 80°F absolute limit marker.
- `UrgentVetBanner.tsx` — rendered when `boas==='urgent'` or `heat==='emergency'`; amber/red banner with telehealth CTA (affiliate URL placeholder via `VITE_TELEHEALTH_URL`).
- `AffiliateGrid.tsx` — pure function `pickProducts(answers)` returns curated items:
  - Gassy → 3 slow feeders + probiotic
  - Raspy/Struggling breathing → warning against neck collars + 2 Y-harnesses
  - Overheating/hot climate → cooling vest
  - Each card shows "why recommended" sentence derived from the triggering answer.
  Products live in `src/lib/affiliateCatalog.ts` with `{ id, title, badge, why, url, image }`.

Wire all modules into `ResultsScreen.tsx` above the existing premium upsell.

## 5. Calendar (.ICS) Generator
- `src/lib/icsGenerator.ts` builds a valid VCALENDAR string with recurring VEVENTs:
  - Daily: skin-fold check, face wipe
  - Weekly: weight log, ear check
  - Bi-weekly: nail trim
  - Monthly: full grooming + vet check reminder
  - Seasonal: heat-stroke alert (Jun–Aug) if puppy or hot climate
- `downloadIcs(filename, content)` triggers a Blob download.
- Button "Sync Daily Care Tasks to My Calendar" on results; gated by the email modal.

## 6. Email Lead-Gate Modal
- `src/components/LeadGateModal.tsx` reusing shadcn `Dialog` + zod-validated form (name, email, dog age).
- Persists to `localStorage` and POSTs to existing `submitLead` in `revenueBackend.ts` (extend payload).
- Gates: ICS download + "Detailed PDF Guide" button (existing free PDF stays open; the premium guide CTA stays Stripe-gated).
- Once captured, modal never reappears (flag in localStorage).

## 7. Print-Friendly Results
- Add `@media print` block in `index.css`:
  - Hide `.no-print` (nav, buttons, upsell, modals)
  - Force light background, single-column, page-break rules
  - Target ~2 pages of the personalized clinical summary
- Add "Print / Save as PDF" button on results that calls `window.print()`.

## 8. Cleanup / Wiring
- `Index.tsx`: hydrate from store, persist on each state change, add `resetProfile()` to clear store.
- Don't touch `create-payment` / Stripe / existing premium PDF generator — only add hooks.
- No DB migrations needed.

## Technical Notes
- All clinical functions pure + covered by a small vitest spec (`src/test/clinical.test.ts`).
- Strings carry citations: `"WSAVA NRC clinical equation"`, `"AVMA brachycephalic guidance"`.
- Affiliate URLs use `https://` placeholders the user can swap; no real partner IDs invented.
- No new secrets required; telehealth URL via Vite env with safe fallback.

## Files Touched (high level)
- new: `src/lib/clinical.ts`, `src/lib/profileStore.ts`, `src/lib/icsGenerator.ts`, `src/lib/affiliateCatalog.ts`
- new components: `CalorieCard`, `BoasScorecard`, `HeatStressMeter`, `UrgentVetBanner`, `AffiliateGrid`, `LeadGateModal`
- edited: `src/index.css`, `tailwind.config.ts`, `src/lib/quizData.ts`, `src/pages/Index.tsx`, `src/components/ResultsScreen.tsx`, `src/components/QuizScreen.tsx`, `src/lib/revenueBackend.ts`
- tests: `src/test/clinical.test.ts`

Approve and I'll implement in one pass.
