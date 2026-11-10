import { QuizAnswers } from './quizData';

/**
 * Owner-facing estimates. These do not diagnose airway disease, heatstroke,
 * or an individual dog's calorie need. A veterinarian has to examine the dog.
 */

export const CITATIONS = {
  mer: 'WSAVA: energy needs are individual estimates',
  boas: 'Cambridge BOAS grading requires a veterinary exam',
  heat: 'AVMA: watch the dog and the conditions, not only the thermometer',
};

/* ------------------------- Weight & K factor ------------------------- */

export function lbsToKg(lbs: number) {
  return lbs * 0.453592;
}

/** Approximate kg from the quiz weight bucket. */
export function approxWeightKg(weightBucket: string): number {
  if (weightBucket === 'under20') return lbsToKg(17);
  if (weightBucket === '20-28') return lbsToKg(24);
  if (weightBucket === 'over28') return lbsToKg(31);
  return lbsToKg(24);
}

export type KFactorInput = {
  lifeStage: string;          // puppy | adult | senior
  activityLevel: string;      // low | moderate | active
  bodyCondition: number;      // 1-9
  neutered?: boolean;         // default true (assume neutered pet)
};

export function pickKFactor(p: KFactorInput): { k: number; label: string; reason: string } {
  if (p.lifeStage === 'puppy') {
    return { k: 140, label: 'Active puppy', reason: 'Growing puppies (<1 yr) need ~2× adult maintenance.' };
  }
  if (p.bodyCondition >= 7 || p.activityLevel === 'low') {
    return { k: 80, label: 'Weight-prone / inactive', reason: 'High BCS or low activity — Frenchies gain weight easily.' };
  }
  if (p.neutered === false && p.activityLevel === 'active') {
    return { k: 130, label: 'Active / intact adult', reason: 'Intact, active adults run higher metabolic demand.' };
  }
  return { k: 95, label: 'Neutered adult', reason: 'Standard maintenance for a neutered Frenchie.' };
}

/* ------------------------- MER ------------------------- */

export type MerResult = {
  kcalPerDay: number;
  cupsPerDay: number;           // rounded to nearest 0.25
  k: number;
  kLabel: string;
  kReason: string;
  weightKg: number;
  citation: string;
};

export function calcMER(weightKg: number, k: number): number {
  return Math.round(k * Math.pow(weightKg, 0.75));
}

const EIGHTHS = ['', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞'];

/** 1.625 -> "1⅝", 0.875 -> "⅞". Rounds to the nearest eighth of a cup, the finest a measuring cup shows. */
export function formatCups(cups: number): string {
  const eighths = Math.max(1, Math.round(cups * 8));
  const whole = Math.floor(eighths / 8);
  const frac = EIGHTHS[eighths % 8];
  return whole === 0 ? frac : `${whole}${frac}`;
}

export function kcalToCups(kcal: number, kcalPerCup = 350): number {
  const raw = kcal / kcalPerCup;
  return Math.round(raw * 4) / 4; // nearest 0.25 cup
}

export function buildMER(answers: QuizAnswers, opts?: { neutered?: boolean; kcalPerCup?: number }): MerResult {
  const weightKg = approxWeightKg(answers.weight);
  const k = pickKFactor({
    lifeStage: answers.lifeStage,
    activityLevel: answers.activityLevel,
    bodyCondition: answers.bodyCondition,
    neutered: opts?.neutered ?? true,
  });
  const kcalPerDay = calcMER(weightKg, k.k);
  const cupsPerDay = kcalToCups(kcalPerDay, opts?.kcalPerCup ?? 350);
  return {
    kcalPerDay,
    cupsPerDay,
    k: k.k,
    kLabel: k.label,
    kReason: k.reason,
    weightKg: Math.round(weightKg * 10) / 10,
    citation: CITATIONS.mer,
  };
}

/* ------------------------- BOAS ------------------------- */

export type BreathingSound = 'quiet' | 'snoring' | 'raspy' | 'struggling';
export type BoasLevel = 'low' | 'moderate' | 'urgent';

export type BoasInput = {
  sound: BreathingSound;
  exerciseTolerance: number; // 0 (none) – 10 (excellent)
  heatIntolerance: boolean;
};

export type BoasResult = {
  level: BoasLevel;
  reasons: string[];
  citation: string;
};

export function boasScore(i: BoasInput): BoasResult {
  const reasons: string[] = [];
  if (i.sound !== 'quiet') reasons.push(`Breathing sound reported: ${i.sound}`);
  if (i.exerciseTolerance <= 5) reasons.push('Reduced exercise tolerance reported');
  if (i.heatIntolerance) reasons.push('Heat intolerance reported');

  if (i.sound === 'struggling') {
    return {
      level: 'urgent',
      reasons: [...reasons, 'Difficult breathing needs emergency veterinary care, not a home score.'],
      citation: CITATIONS.boas,
    };
  }

  return {
    level: reasons.length > 0 ? 'moderate' : 'low',
    reasons,
    citation: CITATIONS.boas,
  };
}

/* ------------------------- Heat stress ------------------------- */

export type HeatZone = 'safe' | 'caution' | 'danger' | 'emergency';

export function heatRisk(tempF: number): { zone: HeatZone; message: string; citation: string } {
  if (!Number.isFinite(tempF)) {
    return { zone: 'caution', message: 'Check local conditions and watch your dog for heavy panting, weakness, or vomiting.', citation: CITATIONS.heat };
  }
  if (tempF >= 90) {
    return {
      zone: 'emergency',
      message: 'Very hot conditions. Skip exercise. If your dog is panting heavily, weak, vomiting, or unsteady, cool them with room-temperature water and contact a veterinarian now. Temperature alone is not a diagnosis.',
      citation: CITATIONS.heat,
    };
  }
  if (tempF >= 80) {
    return {
      zone: 'danger',
      message: 'Warm enough to skip hard exercise. Provide shade and water, and stop if panting becomes loud or your dog lags. There is no single temperature that is safe for every French Bulldog.',
      citation: CITATIONS.heat,
    };
  }
  if (tempF >= 70) {
    return {
      zone: 'caution',
      message: 'Consider a shorter outing. Humidity, sun, and pavement still matter, and a cooler reading is not a guarantee.',
      citation: CITATIONS.heat,
    };
  }
  return {
    zone: 'safe',
    message: 'A lower temperature does not guarantee a safe outing. Watch breathing, especially during play.',
    citation: CITATIONS.heat,
  };
}
