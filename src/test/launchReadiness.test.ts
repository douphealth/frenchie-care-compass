import { describe, expect, it } from 'vitest';
import { COMPARISON_FEATURES } from '@/lib/comparisonFeatures';
import { pickProducts, withAmazonTag } from '@/lib/affiliateCatalog';
import { QuizAnswers } from '@/lib/quizData';

const SAMPLE_ANSWERS: QuizAnswers = {
  lifeStage: 'adult',
  weight: '20-28',
  bodyCondition: 5,
  concern: 'breathing',
  activityLevel: 'moderate',
  environment: ['apartment', 'hot'],
};

describe('launch readiness checks', () => {
  it('has no duplicate rows in FeatureComparison', () => {
    const names = COMPARISON_FEATURES.map((f) => f.name.trim().toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('appends Amazon Associates tag only to Amazon URLs when configured', () => {
    const tagged = withAmazonTag('https://www.amazon.com/s?k=outward+hound+slow+feeder', 'frenchyfab-20');
    expect(tagged).toContain('tag=frenchyfab-20');

    const nonAmazon = withAmazonTag('https://www.akc.org/expert-advice/health/brachycephalic-syndrome-in-dogs/', 'frenchyfab-20');
    expect(nonAmazon).toBe('https://www.akc.org/expert-advice/health/brachycephalic-syndrome-in-dogs/');

    const untagged = withAmazonTag('https://www.amazon.com/s?k=outward+hound+slow+feeder', '');
    expect(untagged).toBe('https://www.amazon.com/s?k=outward+hound+slow+feeder');
  });

  it('applies the Associates tag across picked affiliate products without touching warning links', () => {
    const products = pickProducts(SAMPLE_ANSWERS, 'frenchyfab-20');
    const amazonItems = products.filter((p) => !p.warning);
    const warningItems = products.filter((p) => p.warning);

    expect(amazonItems.length).toBeGreaterThan(0);
    for (const item of amazonItems) {
      expect(item.url).toContain('tag=frenchyfab-20');
    }
    for (const warning of warningItems) {
      expect(warning.url).not.toContain('tag=');
    }
  });
});
