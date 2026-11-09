import { describe, expect, it } from 'vitest';
import { approxWeightKg, boasScore, buildMER, calcMER, heatRisk, pickKFactor } from '@/lib/clinical';
import { QuizAnswers } from '@/lib/quizData';

const adult: QuizAnswers = {
  lifeStage: 'adult',
  weight: '20-28',
  bodyCondition: 5,
  concern: 'wellness',
  activityLevel: 'moderate',
  environment: ['apartment'],
};

describe('clinical estimates', () => {
  it('uses the maintenance equation for a typical adult', () => {
    const mer = buildMER(adult);
    expect(mer.k).toBe(95);
    expect(mer.kcalPerDay).toBe(calcMER(approxWeightKg(adult.weight), 95));
    expect(mer.cupsPerDay).toBeGreaterThan(0);
    expect(mer.citation.toLowerCase()).toContain('estimate');
  });

  it('lowers the factor when the body condition score is high', () => {
    expect(pickKFactor({ lifeStage: 'adult', activityLevel: 'moderate', bodyCondition: 8 }).k).toBe(80);
    expect(pickKFactor({ lifeStage: 'puppy', activityLevel: 'active', bodyCondition: 5 }).k).toBe(140);
  });

  it('treats struggling breathing as urgent and does not invent a numeric grade', () => {
    const result = boasScore({ sound: 'struggling', exerciseTolerance: 8, heatIntolerance: false });
    expect(result.level).toBe('urgent');
    expect(result).not.toHaveProperty('score');
    expect(result.reasons.join(' ').toLowerCase()).toContain('emergency');
  });

  it('does not call a moderate temperature an emergency by itself', () => {
    expect(heatRisk(72).zone).toBe('caution');
    expect(heatRisk(82).zone).toBe('danger');
    expect(heatRisk(92).zone).toBe('emergency');
    expect(heatRisk(65).message.toLowerCase()).toContain('does not guarantee');
  });
});
