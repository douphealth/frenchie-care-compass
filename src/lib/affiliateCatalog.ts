import { QuizAnswers } from './quizData';

export type AffiliateProduct = {
  id: string;
  title: string;
  badge: string;
  why: string;
  url: string;
  emoji: string;
  warning?: boolean;
};

const CATALOG: Record<string, AffiliateProduct> = {
  slowFeeder: {
    id: 'slow-feeder',
    title: 'Slow-Feeder Bowl (Maze Pattern)',
    badge: 'Recommended for gassy Frenchies',
    why: 'Forces 5–10× slower eating, dramatically reducing aerophagia (swallowed air) — the #1 cause of Frenchie gas.',
    url: 'https://www.amazon.com/s?k=outward+hound+slow+feeder',
    emoji: '🥣',
  },
  probiotic: {
    id: 'probiotic',
    title: 'Vet-Formulated Dog Probiotic',
    badge: 'Gut & stomach support',
    why: 'Balances gut flora — clinically shown to reduce loose stools and gas in flat-faced breeds.',
    url: 'https://www.amazon.com/s?k=purina+forti+flora+probiotic',
    emoji: '💊',
  },
  yHarness1: {
    id: 'y-harness-1',
    title: 'Y-Shaped Front-Clip Harness',
    badge: 'Breathing-safe harness',
    why: 'Y-front design keeps all pressure off the trachea — essential for any Frenchie with raspy or noisy breathing.',
    url: 'https://www.amazon.com/s?k=ruffwear+front+range+harness',
    emoji: '🦺',
  },
  yHarness2: {
    id: 'y-harness-2',
    title: 'Padded No-Pull Y-Harness',
    badge: 'Vet-recommended fit',
    why: 'Soft chest plate distributes pull pressure across the sternum, never the throat.',
    url: 'https://www.amazon.com/s?k=julius+k9+harness',
    emoji: '🐶',
  },
  coolingVest: {
    id: 'cooling-vest',
    title: 'Evaporative Cooling Vest',
    badge: 'Heat-stress prevention',
    why: 'Soak, wring, wear — drops surface temperature by ~15°F for up to 2 hours. Critical for any walk above 75°F.',
    url: 'https://www.amazon.com/s?k=ruffwear+swamp+cooler',
    emoji: '🥶',
  },
  collarWarning: {
    id: 'collar-warning',
    title: 'Never use a neck collar for walks',
    badge: '⚠️ Critical safety warning',
    why: 'Frenchies already have a compromised airway. Any pulling pressure on the neck can trigger acute respiratory distress.',
    url: 'https://www.akc.org/expert-advice/health/brachycephalic-syndrome-in-dogs/',
    emoji: '🚫',
    warning: true,
  },
};

export function pickProducts(answers: QuizAnswers): AffiliateProduct[] {
  const out: AffiliateProduct[] = [];

  if (answers.concern === 'diet' || answers.concern === 'breathing') {
    out.push(CATALOG.slowFeeder, CATALOG.probiotic);
  }

  if (answers.concern === 'breathing') {
    out.push(CATALOG.collarWarning, CATALOG.yHarness1, CATALOG.yHarness2);
  }

  if (answers.environment?.includes('hot') || answers.concern === 'breathing') {
    out.push(CATALOG.coolingVest);
  }

  if (answers.concern === 'skin') {
    out.push(CATALOG.yHarness1); // y-harness avoids collar irritation on neck folds
  }

  // Always recommend at least one safety item
  if (out.length === 0) {
    out.push(CATALOG.yHarness1, CATALOG.slowFeeder);
  }

  // De-dupe
  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

export const TELEHEALTH_URL =
  'https://www.vetster.com/en/?utm_source=frenchyfab&utm_medium=care-compass';
