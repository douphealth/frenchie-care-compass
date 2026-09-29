import { describe, expect, it } from 'vitest';
import { approxWeightKg, buildMER, calcMER, heatRisk } from '@/lib/clinical';

describe('clinical calculations', () => {
  it('produces finite positive maintenance energy values', () => {
    const kg = approxWeightKg('20-28');
    expect(kg).toBeGreaterThan(0);
    expect(calcMER(kg, 95)).toBeGreaterThan(0);
  });

  it('builds a usable calorie estimate for a typical adult profile', () => {
    const result = buildMER({
      lifeStage: 'adult',
      weight: '20-28',
      bodyCondition: 5,
      concern: 'wellness',
      activityLevel: 'moderate',
      environment: ['house'],
    });
    expect(result.kcalPerDay).toBeGreaterThan(250);
    expect(result.cupsPerDay).toBeGreaterThan(0);
    expect(result.weightKg).toBeGreaterThan(9);
  });

  it('escalates heat risk as temperature rises', () => {
    expect(heatRisk(65).zone).toBe('safe');
    expect(heatRisk(75).zone).toBe('caution');
    expect(heatRisk(82).zone).toBe('danger');
    expect(heatRisk(90).zone).toBe('emergency');
  });
});
