import { QuizAnswers } from './quizData';

export type PlanSection = {
  icon: string;
  title: string;
  items: string[];
  articleLink?: { label: string; url: string };
};

/* ─── helpers ──────────────────────────────────────── */

function weightLbs(w: string): { min: number; max: number; label: string } {
  if (w === 'under20') return { min: 10, max: 19, label: 'under 20 lbs' };
  if (w === '20-28') return { min: 20, max: 28, label: '20–28 lbs' };
  return { min: 29, max: 38, label: 'over 28 lbs' };
}

function calorieRange(w: string, stage: string, bc: number): string {
  const { min, max } = weightLbs(w);
  let calPerLb = 30;
  if (stage === 'puppy') calPerLb = 40;
  else if (stage === 'senior') calPerLb = 25;
  if (bc > 6) calPerLb -= 5;
  if (bc < 4) calPerLb += 5;
  return `${min * calPerLb}–${max * calPerLb} kcal/day`;
}

function portionCups(w: string, stage: string, bc: number): string {
  const { min, max } = weightLbs(w);
  const avgLbs = (min + max) / 2;
  let cups = avgLbs / 15; // rough kibble calc
  if (stage === 'puppy') cups *= 1.3;
  if (stage === 'senior') cups *= 0.85;
  if (bc > 6) cups *= 0.9;
  if (bc < 4) cups *= 1.1;
  return `${cups.toFixed(1)}–${(cups * 1.15).toFixed(1)} cups of kibble`;
}

function mealsPerDay(stage: string): number {
  return stage === 'puppy' ? 3 : 2;
}

function walkMinutes(stage: string, activity: string): { min: number; max: number } {
  if (stage === 'puppy') return { min: 10, max: 20 };
  if (stage === 'senior') return { min: 10, max: 15 };
  if (activity === 'low') return { min: 15, max: 20 };
  if (activity === 'active') return { min: 25, max: 35 };
  return { min: 20, max: 25 };
}

const proteinPct = (stage: string) => stage === 'puppy' ? '22–28%' : stage === 'senior' ? '18–22%' : '22–26%';

/* ─── main generator ───────────────────────────────── */

export function generatePlan(answers: QuizAnswers): PlanSection[] {
  const { lifeStage, weight, bodyCondition, concern, activityLevel, environment } = answers;
  const sections: PlanSection[] = [];
  const wt = weightLbs(weight);
  const cals = calorieRange(weight, lifeStage, bodyCondition);
  const cups = portionCups(weight, lifeStage, bodyCondition);
  const meals = mealsPerDay(lifeStage);
  const walk = walkMinutes(lifeStage, activityLevel);

  /* ── 1. FEEDING ── */
  const feeding: PlanSection = {
    icon: '🍽️',
    title: 'Personalized Feeding Plan',
    items: [],
    articleLink: { label: 'Healthy Treats Guide', url: 'https://frenchyfab.com/french-bulldog-healthy-treats' },
  };

  feeding.items.push(`Daily calorie target: ${cals} (based on ${wt.label}, body score ${bodyCondition}/9).`);
  feeding.items.push(`Split into ${meals} meals per day — approximately ${cups} total.`);
  feeding.items.push(`Look for food with ${proteinPct(lifeStage)} protein, named meat as the first ingredient.`);

  if (lifeStage === 'puppy') {
    feeding.items.push('Use a puppy-specific formula with DHA for brain development.');
    feeding.items.push('Transition to adult food gradually at 10–12 months.');
    feeding.items.push('Avoid free-feeding — measured portions prevent rapid growth issues.');
  } else if (lifeStage === 'senior') {
    feeding.items.push('Choose a senior formula with glucosamine and chondroitin for joints.');
    feeding.items.push('Add a probiotic topper to support aging digestion.');
    feeding.items.push('Warm food slightly to improve palatability if appetite has decreased.');
  } else {
    feeding.items.push('Stick to a consistent feeding schedule — same times daily.');
    feeding.items.push('Avoid grain-free diets unless specifically recommended by your vet (linked to DCM).');
  }

  if (bodyCondition >= 7) {
    feeding.items.push(`⚠️ Body score ${bodyCondition}/9 suggests overweight. Reduce portion by 10–15% and eliminate high-calorie treats.`);
    feeding.items.push('Swap treats with frozen green beans or blueberries for low-cal rewards.');
  } else if (bodyCondition <= 3) {
    feeding.items.push(`Body score ${bodyCondition}/9 suggests underweight. Increase portions by 10% and add a calorie-dense topper.`);
    feeding.items.push('Schedule a vet visit to rule out parasites or malabsorption.');
  }

  if (concern === 'diet') {
    feeding.items.push('Consider a limited-ingredient diet (LID) — single protein, single carb source.');
    feeding.items.push('Keep a food diary for 2 weeks noting stool quality, energy, and skin changes.');
    feeding.items.push('Common allergens for Frenchies: chicken, beef, wheat, soy, dairy.');
  }

  if (activityLevel === 'active') {
    feeding.items.push('Active Frenchies may need 10–15% more calories — adjust if ribs become visible.');
  } else if (activityLevel === 'low') {
    feeding.items.push('Couch-potato Frenchies gain weight easily — stick strictly to measured portions.');
  }

  sections.push(feeding);

  /* ── 2. GROOMING ── */
  const grooming: PlanSection = {
    icon: '🧴',
    title: 'Grooming Routine',
    items: [],
    articleLink: { label: 'Complete Grooming Blueprint', url: 'https://frenchyfab.com/french-bulldog-grooming-blueprint/' },
  };

  grooming.items.push('Clean facial wrinkles DAILY with a damp cloth — dry thoroughly to prevent yeast.');
  grooming.items.push('Brush coat 2–3 times per week with a rubber curry brush to reduce shedding.');

  if (concern === 'skin') {
    grooming.items.push('Use a hypoallergenic, oatmeal-based shampoo ONLY.');
    grooming.items.push('Bathe every 2–3 weeks max — over-bathing strips natural oils.');
    grooming.items.push('After baths, apply a vet-approved leave-in conditioner for dry skin.');
    grooming.items.push('Check between toes and inside ears weekly for redness or yeast smell.');
    grooming.items.push('Use unscented, alcohol-free wipes for wrinkle cleaning.');
  } else {
    grooming.items.push('Bathe every 4–6 weeks with a gentle, pH-balanced dog shampoo.');
    grooming.items.push('Use an ear cleaner weekly — Frenchies are prone to ear infections.');
  }

  grooming.items.push('Trim nails every 2–3 weeks (if you hear clicking on floors, they\'re too long).');
  grooming.items.push('Brush teeth 3–4 times per week with enzymatic dog toothpaste.');

  if (environment.includes('hot')) {
    grooming.items.push('Rinse paws after outdoor time to remove allergens and hot pavement residue.');
  }

  if (lifeStage === 'puppy') {
    grooming.items.push('Start handling paws, ears, and mouth now — early desensitization makes grooming easier forever.');
  }

  sections.push(grooming);

  /* ── 3. EXERCISE ── */
  const exercise: PlanSection = {
    icon: '🏃',
    title: 'Exercise Plan',
    items: [],
  };

  if (lifeStage === 'puppy') {
    exercise.items.push(`Rule of thumb: 5 minutes of exercise per month of age, twice daily.`);
    exercise.items.push('Focus on play sessions and socialization over structured walks.');
    exercise.items.push('Avoid repetitive jumping until growth plates close (around 12–14 months).');
  } else if (lifeStage === 'senior') {
    exercise.items.push(`Two gentle ${walk.min}–${walk.max} minute walks per day at your Frenchie's pace.`);
    exercise.items.push('Substitute one walk with mental enrichment (puzzle toys, snuffle mats).');
    exercise.items.push('Watch for lagging behind, limping, or reluctance — signs of joint pain.');
  } else {
    exercise.items.push(`Two ${walk.min}–${walk.max} minute walks per day, plus one interactive play session.`);
    if (activityLevel === 'active') {
      exercise.items.push('Add fetch, tug-of-war, or flirt pole sessions (keep bursts under 5 minutes).');
      exercise.items.push('Consider canine sports like nosework — great mental + physical combo.');
    } else if (activityLevel === 'low') {
      exercise.items.push('Even low-energy Frenchies need daily walks — aim for at least two 15-minute outings.');
      exercise.items.push('Use food puzzles to provide mental stimulation at home.');
    } else {
      exercise.items.push('Mix walk routes weekly to provide new smells and mental stimulation.');
    }
  }

  if (concern === 'breathing') {
    exercise.items.push('⚠️ BOAS WARNING: Avoid exercise in humidity > 60% or temps > 75°F.');
    exercise.items.push('Watch for heavy panting, blue/purple gums, or collapsing — stop immediately.');
    exercise.items.push('Walk during cooler parts of the day only (before 8am, after 6pm in summer).');
    exercise.items.push('Use a harness (never collar) to avoid airway compression.');
  }

  if (environment.includes('hot')) {
    exercise.items.push('Carry fresh water on every walk. Offer every 10 minutes.');
    exercise.items.push('Test pavement with your hand — if too hot for 5 seconds, it\'s too hot for paws.');
    exercise.items.push('Consider a cooling vest for walks above 70°F.');
  }

  if (environment.includes('cold')) {
    exercise.items.push('Use a warm coat or insulated sweater for walks below 45°F.');
    exercise.items.push('Wipe paws after walks to remove ice-melt chemicals.');
    exercise.items.push('Keep walks shorter in extreme cold — Frenchies lose body heat quickly.');
  }

  if (bodyCondition >= 7) {
    exercise.items.push(`At body score ${bodyCondition}/9, gradual exercise increase helps — add 5 minutes per walk each week.`);
  }

  sections.push(exercise);

  /* ── 4. HEALTH WATCH-OUTS ── */
  const health: PlanSection = {
    icon: '⚠️',
    title: 'Health Watch-Outs',
    items: [],
  };

  health.items.push('Schedule vet checkups every 6 months — Frenchies are prone to breed-specific issues.');

  if (lifeStage === 'puppy') {
    health.items.push('Complete full vaccination series (DHPP, rabies, bordetella).');
    health.items.push('Discuss spay/neuter timing with your vet (usually 6–9 months for Frenchies).');
    health.items.push('Watch for cherry eye (red bulge in corner of eye) — common in Frenchie pups.');
    health.items.push('Get a baseline BOAS assessment before your puppy turns 1.');
  } else if (lifeStage === 'senior') {
    health.items.push('Annual bloodwork + urine panel to catch kidney/liver issues early.');
    health.items.push('Bi-annual dental cleanings under anesthesia (discuss anesthesia protocol for brachs).');
    health.items.push('Monitor for cognitive dysfunction: disorientation, night waking, potty regression.');
    health.items.push('Watch for lumps/bumps — report any new growths to your vet immediately.');
  } else {
    health.items.push('Keep vaccinations current. Annual titer tests can replace some boosters.');
    health.items.push('Annual dental exam minimum — most Frenchies need professional cleanings.');
  }

  if (concern === 'breathing') {
    health.items.push('Request a BOAS grading from a specialist — surgery can dramatically improve quality of life.');
    health.items.push('Always use a harness instead of collar to reduce tracheal pressure.');
    health.items.push('Keep your Frenchie at a lean body weight — every extra pound worsens breathing.');
    health.items.push('Discuss stenotic nares surgery if nostrils appear pinched.');
  }

  if (concern === 'skin') {
    health.items.push('Ask your vet about intradermal allergy testing or serum allergy panels.');
    health.items.push('Consider Omega-3 supplements (EPA/DHA) at 75–100mg per kg body weight.');
    health.items.push('Cytopoint or Apoquel may help if allergies are severe — discuss with your vet.');
    health.items.push('Interdigital cysts are common — soak paws in dilute chlorhexidine if redness appears.');
  }

  if (environment.includes('hot')) {
    health.items.push('Heatstroke kills Frenchies — learn the signs: excessive drooling, bright red gums, vomiting.');
    health.items.push('Never leave your Frenchie in a parked car, even with windows cracked.');
  }

  if (weight === 'over28' && bodyCondition >= 6) {
    health.items.push(`At ${wt.label} with body score ${bodyCondition}/9, your Frenchie is at higher risk for IVDD (disc disease).`);
    health.items.push('Avoid jumping on/off furniture — use ramps or pet stairs.');
  }

  sections.push(health);

  /* ── 5. SUPPLEMENTS ── */
  const supplements: PlanSection = {
    icon: '💊',
    title: 'Supplement Recommendations',
    items: [],
    articleLink: { label: 'Supplement Guide: Puppy to Senior', url: 'https://frenchyfab.com/essential-nutritional-supplements-french-bulldogs/' },
  };

  supplements.items.push('Probiotics DAILY — Frenchies have sensitive stomachs; look for multi-strain formulas.');

  if (lifeStage === 'senior') {
    supplements.items.push('Glucosamine + Chondroitin (500mg + 400mg daily) for joint support.');
    supplements.items.push('Omega-3 fish oil (EPA+DHA) — 1000mg daily for coat, skin, brain, and joint health.');
    supplements.items.push('CoQ10 (30–60mg daily) for heart health — common need in aging Frenchies.');
    supplements.items.push('Consider SAMe for liver support if on long-term medications.');
  } else if (lifeStage === 'puppy') {
    supplements.items.push('DHA supplement if not already in puppy food — critical for brain development.');
    supplements.items.push('Omega-3 fish oil (500mg daily) for coat development.');
    supplements.items.push('Avoid calcium supplements unless prescribed — excess calcium causes skeletal issues.');
  } else {
    supplements.items.push('Omega-3 fish oil (750–1000mg daily) for a glossy coat and skin barrier.');
  }

  if (concern === 'skin') {
    supplements.items.push('Quercetin (natural antihistamine) — 25mg per lb body weight, twice daily. Confirm with vet.');
    supplements.items.push('Vitamin E (100–200 IU daily) supports skin healing.');
    supplements.items.push('Consider colostrum supplements for immune-mediated skin issues.');
  }

  if (concern === 'breathing') {
    supplements.items.push('Maintain lean body weight — single most impactful thing for breathing.');
    supplements.items.push('Bromelain (natural anti-inflammatory) may help reduce airway swelling — ask your vet.');
  }

  if (concern === 'diet') {
    supplements.items.push('Digestive enzymes with meals can improve nutrient absorption.');
    supplements.items.push('Pumpkin puree (1–2 tbsp per meal) for fiber and digestive regularity.');
  }

  if (bodyCondition >= 7) {
    supplements.items.push('L-Carnitine supports fat metabolism — helpful for weight management.');
  }

  sections.push(supplements);

  /* ── 6. ENVIRONMENT-SPECIFIC ── */
  if (environment.length > 0) {
    const env: PlanSection = {
      icon: '🏠',
      title: 'Environment & Safety',
      items: [],
    };

    if (environment.includes('apartment')) {
      env.items.push('Create a designated potty schedule — take out first thing AM, after meals, and before bed.');
      env.items.push('Use puzzle feeders and snuffle mats to burn mental energy indoors.');
      env.items.push('Socialize in controlled settings to prevent reactivity from limited exposure.');
      if (activityLevel === 'low') {
        env.items.push('Even in an apartment, daily walks are non-negotiable for physical and mental health.');
      }
    }

    if (environment.includes('house')) {
      env.items.push('Fence gaps and pools are hazards — Frenchies cannot swim (they sink).');
      env.items.push('Provide shade and fresh water outdoors at all times.');
      if (lifeStage === 'puppy') {
        env.items.push('Puppy-proof the yard: remove toxic plants (lilies, sago palm, azaleas).');
      }
    }

    if (environment.includes('hot')) {
      env.items.push('Keep indoor temperature below 75°F with AC or fans.');
      env.items.push('Provide a cooling mat or elevated mesh bed.');
      env.items.push('Freeze a Kong with peanut butter for a cooling treat.');
    }

    if (environment.includes('cold')) {
      env.items.push('Provide a warm, draft-free sleeping area with an elevated bed.');
      env.items.push('Limit outdoor time to 15–20 minutes when below freezing.');
      env.items.push('Consider dog booties to protect paws from salt and ice.');
    }

    sections.push(env);
  }

  /* ── 7. CONCERN-SPECIFIC DEEP DIVE ── */
  if (concern === 'pulling') {
    sections.push({
      icon: '🦮',
      title: 'Leash Training & Harness Tips',
      items: [
        'Use a front-clip, no-pull harness — never a flat collar for pullers.',
        'Practice "stop & wait": freeze when your Frenchie pulls, walk when there\'s slack.',
        'Reward heel position with high-value treats (cheese, chicken) during walks.',
        'Start with 10-minute structured training walks before longer outings.',
        'Change direction unpredictably — this teaches your Frenchie to watch you.',
        'Everyone in the household MUST follow the same leash rules — consistency is everything.',
        `At ${wt.label}, your Frenchie has enough strength to pull hard — start training early.`,
      ],
      articleLink: { label: 'Best Harness for Frenchies That Pull', url: 'https://frenchyfab.com/best-harness-for-french-bulldog-that-pulls/' },
    });
  }

  if (concern === 'wellness') {
    sections.push({
      icon: '💚',
      title: 'Preventive Wellness Checklist',
      items: [
        `Keep your Frenchie at body score 4–5 (currently ${bodyCondition}/9).`,
        'Maintain a consistent daily routine — Frenchies thrive on predictability.',
        'Rotate toys weekly to prevent boredom.',
        'Practice regular handling exercises — paws, ears, mouth — for stress-free vet visits.',
        lifeStage === 'puppy'
          ? 'Socialize your puppy with 3+ new experiences per week before 16 weeks.'
          : 'Continue exposing your Frenchie to new environments to maintain confidence.',
        'Mental enrichment is as tiring as physical exercise — use puzzle toys daily.',
      ],
    });
  }

  return sections;
}
