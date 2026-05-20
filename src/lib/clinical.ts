import { QuizAnswers } from './quizData';

/**
 * Clinical engine for Frenchie Care Compass.
 * All math is pure and citation-backed:
 *  - MER: WSAVA / NRC 2006 clinical equation (K * BWkg^0.75)
 *  - BOAS risk grading inspired by Cambridge BOAS functional grading
 *  - Heat-stress thresholds: AVMA + ACVECC brachycephalic guidance
 */

export const CITATIONS = {
  mer: 'Formula: WSAVA / NRC clinical equation',
  boas: 'Inspired by Cambridge BOAS functional grading',
  heat: 'AVMA brachycephalic heat-stress guidance',
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
  score: number; // 0-100
  reasons: string[];
  citation: string;
};

export function boasScore(i: BoasInput): BoasResult {
  let score = 0;
  const reasons: string[] = [];
  const soundScore = { quiet: 0, snoring: 25, raspy: 55, struggling: 90 }[i.sound];
  score += soundScore;
  if (soundScore >= 25) reasons.push(`Breathing sound: ${i.sound}`);
  const intolerance = Math.max(0, 10 - i.exerciseTolerance);
  score += intolerance * 4;
  if (intolerance >= 5) reasons.push('Low exercise tolerance');
  if (i.heatIntolerance) { score += 15; reasons.push('Heat intolerance reported'); }

  score = Math.min(100, Math.round(score));
  const level: BoasLevel = score >= 70 ? 'urgent' : score >= 35 ? 'moderate' : 'low';
  return { level, score, reasons, citation: CITATIONS.boas };
}

/* ------------------------- Heat stress ------------------------- */

export type HeatZone = 'safe' | 'caution' | 'danger' | 'emergency';

export function heatRisk(tempF: number): { zone: HeatZone; message: string; citation: string } {
  if (tempF >= 85) return { zone: 'emergency', message: 'Emergency: keep your Frenchie indoors with AC. Brachycephalic dogs cannot thermoregulate above 85°F.', citation: CITATIONS.heat };
  if (tempF >= 80) return { zone: 'danger', message: 'Danger zone: 80°F is the absolute outdoor limit for flat-faced breeds. Walks only at dawn/dusk, on grass.', citation: CITATIONS.heat };
  if (tempF >= 70) return { zone: 'caution', message: 'Caution: shorten walks, carry water, watch for excessive panting.', citation: CITATIONS.heat };
  return { zone: 'safe', message: 'Safe range for outdoor activity. Still avoid hot pavement.', citation: CITATIONS.heat };
}
