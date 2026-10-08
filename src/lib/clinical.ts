import { QuizAnswers } from './quizData';

/**
 * Owner-facing educational estimates and observation tools.
 * These do not diagnose BOAS, heat illness or an individual dog's energy needs.
 * Clinical assessment and treatment decisions belong to a veterinarian.
 */

export const CITATIONS = {
  mer: 'WSAVA: energy needs are individual estimates',
  boas: 'Cambridge BOAS: functional grading requires veterinary assessment',
  heat: 'AVMA: watch the dog and conditions, not only the temperature',
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

/* ------------------------- Breathing observations ------------------------- */

/** Educational symptom checklist; this is NOT a BOAS test or veterinary grade. */
export type BreathingSound = 'quiet' | 'snoring' | 'raspy' | 'struggling';
export type BoasLevel = 'low' | 'moderate' | 'urgent';

export type BoasInput = {
  sound: BreathingSound;
  exerciseTolerance: number; // Self-reported 0 (poor) - 10 (excellent).
  heatIntolerance: boolean;
};

export type BoasResult = {
  level: BoasLevel;
  reasons: string[];
  citation: string;
};

export function boasScore(i: BoasInput): BoasResult {
  const reasons: string[] = [];
  if (i.sound !== 'quiet') reasons.push('Breathing noise or difficulty reported');
  if (i.exerciseTolerance <= 5) reasons.push('Reduced exercise tolerance reported');
  if (i.heatIntolerance) reasons.push('Heat intolerance reported');

  // Struggling to breathe is an emergency sign, regardless of other answers.
  if (i.sound === 'struggling') {
    return {
      level: 'urgent',
      reasons: [...reasons, 'Seek emergency veterinary care now if breathing is difficult.'],
      citation: CITATIONS.boas,
    };
  }

  return {
    level: reasons.length > 0 ? 'moderate' : 'low',
    reasons,
    citation: CITATIONS.boas,
  };
}

/* ------------------------- Temperature planning ------------------------- */

/**
 * A temperature-only planning hint, NOT a heatstroke diagnostic or safety limit.
 * Exercise, humidity, sun, health, acclimation and clinical signs change risk.
 */
export type HeatZone = 'safe' | 'caution' | 'danger' | 'emergency';

export function heatRisk(tempF: number): { zone: HeatZone; message: string; citation: string } {
  if (!Number.isFinite(tempF)) {
    return { zone: 'caution', message: 'Check your local conditions and watch your dog for signs of overheating.', citation: CITATIONS.heat };
  }
  if (tempF >= 80) {
    return {
      zone: 'danger',
      message: 'Warm conditions call for extra caution. Avoid strenuous exercise, provide cool shelter and water, and watch for excessive panting, weakness or altered behavior. Temperature alone cannot diagnose heatstroke.',
      citation: CITATIONS.heat,
    };
  }
  if (tempF >= 70) {
    return {
      zone: 'caution',
      message: 'Consider shorter, gentler outings and check humidity, sunshine, pavement and your dog\'s breathing. Seek veterinary advice if symptoms develop.',
      citation: CITATIONS.heat,
    };
  }
  return {
    zone: 'safe',
    message: 'A lower reading does not guarantee safety. Watch your dog, especially during exercise or with breathing problems.',
    citation: CITATIONS.heat,
  };
}
