import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResultsScreen from '@/components/ResultsScreen';
import { QuizAnswers } from '@/lib/quizData';

const answers: QuizAnswers = {
  lifeStage: 'adult',
  weight: '20-28',
  bodyCondition: 5,
  concern: 'breathing',
  activityLevel: 'moderate',
  environment: ['apartment'],
};

beforeEach(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('results vault gate', () => {
  it('stays locked when localStorage claims a paid session the server did not confirm', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    localStorage.setItem('frenchie_profile_v1', JSON.stringify({
      leadCaptured: true,
      email: 'forged@example.com',
      entitlement: {
        paid: true,
        refunded: false,
        sessionId: 'cs_test_forgedsession123',
        verifiedAt: '2026-11-22T00:00:00.000Z',
        email: 'forged@example.com',
        includeEmergencyCard: false,
      },
    }));

    render(
      <ResultsScreen
        plan={[{ icon: 'utensils', title: 'Feeding', items: ['Fresh water'] }]}
        answers={answers}
        onStartOver={() => {}}
        onUpgrade={() => {}}
      />,
    );

    expect(await screen.findByText(/Premium modules — locked/i)).toBeInTheDocument();
    expect(screen.queryByText(/Premium modules — unlocked/i)).not.toBeInTheDocument();
  });
});