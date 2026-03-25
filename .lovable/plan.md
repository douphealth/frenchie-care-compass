

## Frenchie Care Planner — Personalized Care Plans for French Bulldog Owners

### Overview
A step-by-step quiz that generates a personalized French Bulldog care plan. Users see a preview of their plan, then enter their email to unlock the full version. Warm, earthy design matching the Frenchy Fab brand.

---

### Page 1: Landing / Quiz Start
- Hero section with headline: **"Get Your French Bulldog's Personalized Care Plan in 60 Seconds"**
- Subtext explaining what they'll get (feeding, grooming, exercise, health watch-outs)
- Cute Frenchie illustration placeholder + "Start My Plan" CTA button
- Warm color palette: cream background (#F5E6D3), brown accents (#8B4513), terracotta buttons (#D4956A)

### Page 2: Step-by-Step Quiz (5 screens with progress bar)
Each screen shows one question with visual option cards:

1. **Life Stage** — Puppy (under 1yr) / Adult (1-7yr) / Senior (7+yr)
2. **Weight & Body Condition** — Under 20 lbs / 20-28 lbs / Over 28 lbs + slider for body condition
3. **Main Concern** — Skin & allergies / Pulling on walks / Diet & weight / Breathing / General wellness
4. **Activity Level** — Low (couch potato) / Moderate / Active
5. **Living Environment** — Apartment / House with yard / Hot climate / Cold climate (multi-select)

Smooth transitions between steps, back button, progress indicator at top.

### Page 3: Plan Preview + Email Gate
- Show a teaser of the personalized plan (first 2-3 sections visible, rest blurred)
- Email capture form: "Enter your email to unlock your full care plan"
- After email entry, reveal the complete plan

### Page 4: Full Care Plan Results
Personalized sections based on quiz answers:

- **🍽️ Feeding Plan** — Portion guidance, meal frequency, food type suggestions
- **🧴 Grooming Routine** — Skin-fold cleaning schedule, bathing cadence, dental care
- **🏃 Exercise Plan** — Daily activity recommendations, weather considerations
- **⚠️ Health Watch-Outs** — Breed-specific concerns for their life stage
- **💊 Supplement Suggestions** — Based on age and concerns
- **🦮 Walking & Harness Tips** — If pulling was selected as a concern

Each section includes a "Read More on Frenchy Fab" link pointing to real article URLs:
- Grooming → frenchyfab.com/french-bulldog-grooming-blueprint/
- Harness → frenchyfab.com/best-harness-for-french-bulldog-that-pulls/
- Supplements → frenchyfab.com/essential-nutritional-supplements-french-bulldogs/
- Treats → frenchyfab.com/french-bulldog-healthy-treats

### Design System
- **Background**: Warm cream (#F5E6D3)
- **Primary**: Rich brown (#8B4513)
- **Accent/CTA**: Terracotta (#D4956A)
- **Text**: Dark brown (#2C1810)
- **Cards**: White with soft shadows, rounded corners (12px)
- **Font**: Friendly, readable sans-serif
- Mobile-first responsive layout (optimized for the 375px viewport)

### Technical Notes
- All quiz logic and plan generation handled client-side (no backend needed for MVP)
- Email capture stores to localStorage for now (can connect to Supabase later for real lead capture)
- Plan content is template-based: predefined care recommendations mapped to quiz answer combinations

