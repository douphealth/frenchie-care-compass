import { QuizAnswers } from './quizData';

const LIFE_STAGES = ['puppy', 'adult', 'senior'] as const;
const WEIGHTS = ['under20', '20-28', 'over28'] as const;
const CONCERNS = ['skin', 'pulling', 'diet', 'breathing', 'wellness'] as const;
const ACTIVITIES = ['low', 'moderate', 'active'] as const;
const ENVIRONMENTS = ['apartment', 'house', 'hot', 'cold'] as const;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function parseQuizAnswers(input: unknown): QuizAnswers | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const lifeStage = raw.lifeStage;
  const weight = raw.weight;
  const concern = raw.concern;
  const activityLevel = raw.activityLevel;
  const bodyCondition = Number(raw.bodyCondition);
  const environment = raw.environment;

  if (!LIFE_STAGES.includes(lifeStage as typeof LIFE_STAGES[number])) return null;
  if (!WEIGHTS.includes(weight as typeof WEIGHTS[number])) return null;
  if (!CONCERNS.includes(concern as typeof CONCERNS[number])) return null;
  if (!ACTIVITIES.includes(activityLevel as typeof ACTIVITIES[number])) return null;
  if (!Number.isInteger(bodyCondition) || bodyCondition < 1 || bodyCondition > 9) return null;
  if (!Array.isArray(environment) || environment.length < 1 || environment.length > ENVIRONMENTS.length) return null;
  if (!environment.every((item) => typeof item === 'string' && ENVIRONMENTS.includes(item as typeof ENVIRONMENTS[number]))) {
    return null;
  }

  return {
    lifeStage: lifeStage as string,
    weight: weight as string,
    concern: concern as string,
    activityLevel: activityLevel as string,
    bodyCondition,
    environment: [...new Set(environment as string[])],
  };
}
