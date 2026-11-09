import { describe, expect, it } from 'vitest';
import { generatePlan } from '@/lib/planGenerator';
import { buildMER } from '@/lib/clinical';
import { buildPremiumModules } from '@/lib/premiumContent';
import { parseQuizAnswers } from '@/lib/quizValidation';
import { QuizAnswers } from '@/lib/quizData';

const answers: QuizAnswers = {
  lifeStage: 'adult',
  weight: '20-28',
  bodyCondition: 5,
  concern: 'skin',
  activityLevel: 'moderate',
  environment: ['hot'],
};

describe('plan generation', () => {
  it('uses the same energy estimate as the on-screen calculator', () => {
    const plan = generatePlan(answers);
    const feeding = plan.find((section) => section.title.includes('Feeding'));
    expect(feeding?.items.join(' ')).toContain(String(buildMER(answers).kcalPerDay));
  });

  it('does not hand out supplement milligram doses', () => {
    const text = generatePlan(answers).flatMap((section) => section.items).join(' ');
    expect(text.toLowerCase()).not.toContain('mg per');
    expect(text).not.toMatch(/\d+\s*mg/);
  });

  it('rejects quiz payloads that are not the known choices', () => {
    expect(parseQuizAnswers({ ...answers, concern: 'not-a-concern' })).toBeNull();
    expect(parseQuizAnswers({ ...answers, bodyCondition: 12 })).toBeNull();
    expect(parseQuizAnswers(answers)?.concern).toBe('skin');
  });
});

describe('premium modules', () => {
  it('includes the emergency checklist without a drug dose', () => {
    const modules = buildPremiumModules(answers);
    const emergency = modules.find((module) => module.id === 'emergency');
    const text = emergency?.items.join(' ') || '';
    expect(text).toContain('ASPCA');
    expect(text.toLowerCase()).not.toContain('benadryl');
    expect(text.toLowerCase()).not.toContain('1mg');
    expect(modules.map((module) => module.id)).toEqual([
      'routine',
      'seasonal',
      'emergency',
      'vet-guide',
      'climate',
    ]);
  });
});
