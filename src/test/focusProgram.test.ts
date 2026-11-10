import { describe, expect, it } from 'vitest';
import { buildFocusProgram } from '@/lib/focusProgram';
import { formatCups } from '@/lib/clinical';
import { generatePlan } from '@/lib/planGenerator';
import { includedPremiumPages } from '@/lib/pdfOutline';
import type { QuizAnswers } from '@/lib/quizData';

const base: QuizAnswers = {
  lifeStage: 'adult', weight: '20-28', bodyCondition: 5, concern: 'breathing', activityLevel: 'moderate', environment: ['apartment'],
};

describe('4-week focus program', () => {
  it.each(['skin', 'pulling', 'diet', 'breathing', 'wellness'])('builds four weeks with vet red flags for %s', (concern) => {
    const program = buildFocusProgram({ ...base, concern });
    expect(program.weeks).toHaveLength(4);
    program.weeks.forEach((w) => expect(w.actions.length).toBeGreaterThanOrEqual(3));
    expect(program.vetNow.length).toBeGreaterThan(0);
    const text = JSON.stringify(program);
    expect(text).not.toMatch(/\d+\s*mg\b/i);
    expect(text.toLowerCase()).not.toContain('diphenhydramine');
  });

  it('changes the diet plan for underweight and overweight dogs', () => {
    const under = buildFocusProgram({ ...base, concern: 'diet', bodyCondition: 3 });
    const over = buildFocusProgram({ ...base, concern: 'diet', bodyCondition: 7 });
    expect(under.weeks[2].actions.join(' ')).toMatch(/vet check before increasing/i);
    expect(over.weeks[2].actions.join(' ')).toMatch(/reduce each meal by about 10%/i);
  });

  it('uses hot-climate guidance when the dog lives somewhere hot', () => {
    const hot = buildFocusProgram({ ...base, environment: ['hot'] });
    expect(hot.weeks[1].actions.join(' ')).toMatch(/somewhere hot/);
  });

  it('is the first page of the paid PDF and absent from the free one', () => {
    expect(includedPremiumPages('premium')[0]).toBe('focus-program');
    expect(includedPremiumPages('free')).toEqual([]);
  });
});

describe('portion math', () => {
  it('formats cups to the nearest eighth', () => {
    expect(formatCups(1.625)).toBe('1⅝');
    expect(formatCups(0.8)).toBe('¾');
    expect(formatCups(2)).toBe('2');
    expect(formatCups(0.01)).toBe('⅛');
  });

  it('keeps per-meal and per-day amounts consistent in the plan text', () => {
    const feeding = generatePlan(base)[0].items.join(' ');
    expect(feeding).toMatch(/about 1⅝ cups a day/);
    expect(feeding).toMatch(/about ⅞ cup per meal/);
  });
});
