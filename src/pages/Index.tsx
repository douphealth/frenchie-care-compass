import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import LandingHero from '@/components/LandingHero';
import QuizScreen from '@/components/QuizScreen';
import ResultsScreen from '@/components/ResultsScreen';
import PremiumUpsell from '@/components/PremiumUpsell';
import LoadingScreen from '@/components/LoadingScreen';
import ExitIntentPopup from '@/components/ExitIntentPopup';
import { quizSteps, QuizAnswers } from '@/lib/quizData';
import { generatePlan, PlanSection } from '@/lib/planGenerator';
import { retryPendingLead, trackRevenueEvent } from '@/lib/revenueBackend';
import { loadProfile, saveProfile, clearProfile } from '@/lib/profileStore';
import { parseQuizAnswers } from '@/lib/quizValidation';
import { toast } from '@/hooks/use-toast';

type Screen = 'landing' | 'quiz' | 'loading' | 'results' | 'upsell';

const defaultAnswers: QuizAnswers = {
  lifeStage: '', weight: '', bodyCondition: 5, concern: '', activityLevel: '', environment: [],
};

const Index = () => {
  const [screen, setScreen] = useState<Screen>('landing');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>(defaultAnswers);
  const [plan, setPlan] = useState<PlanSection[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once
  useEffect(() => {
    const stored = loadProfile();
    if (stored.answers) setAnswers(stored.answers);
    // Rebuild the plan from the saved answers so returning visitors get current guidance,
    // not text cached by an older version of the app.
    const savedAnswers = parseQuizAnswers(stored.answers);
    if (savedAnswers && stored.plan) {
      const fresh = generatePlan(savedAnswers);
      stored.plan = fresh;
      setPlan(fresh);
      saveProfile({ plan: fresh });
    } else if (stored.plan) {
      setPlan(stored.plan);
    }
    const cancelled = new URLSearchParams(window.location.search).get('checkout') === 'cancelled';
    if (cancelled) window.history.replaceState(null, '', window.location.pathname);
    void retryPendingLead();
    if (cancelled) {
      setScreen('upsell');
      toast({
        title: 'Checkout cancelled',
        description: 'No payment was taken. The free plan is still here.',
      });
    } else if (stored.plan && stored.answers) {
      setScreen('results');
    } else if (stored.screen === 'quiz' && typeof stored.step === 'number') {
      setScreen('quiz');
      setStep(stored.step);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    const titles: Record<Screen, string> = {
      landing: 'Frenchie Care Plan in 60 Seconds | FrenchyFab Care Compass',
      quiz: 'Frenchie care quiz | FrenchyFab Care Compass',
      loading: 'Building your Frenchie care plan | FrenchyFab',
      results: 'Your Frenchie care plan | FrenchyFab',
      upsell: 'Frenchie Care Vault | FrenchyFab',
    };
    document.title = titles[screen];
  }, [screen]);

  // Persist key state
  useEffect(() => {
    if (!hydrated) return;
    saveProfile({ answers, plan, step, screen });
  }, [answers, plan, step, screen, hydrated]);

  const currentStep = quizSteps[step];

  const canProceed = useCallback(() => {
    const key = currentStep.id as keyof QuizAnswers;
    const val = answers[key];
    if (currentStep.type === 'multi') return Array.isArray(val) && val.length > 0;
    return !!val;
  }, [answers, currentStep]);

  const handleNext = async () => {
    if (step < quizSteps.length - 1) {
      setStep(s => s + 1);
    } else {
      if (!parseQuizAnswers(answers)) {
        toast({ title: 'Check your answers', description: 'A quiz answer was missing or not recognized.', variant: 'destructive' });
        return;
      }
      setScreen('loading');
      trackRevenueEvent('quiz_completed', { concern: answers.concern, life_stage: answers.lifeStage });
      // The plan is computed locally and instantly; the short pause lets the transition read as a step.
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      const finalPlan = generatePlan(answers);
      setPlan(finalPlan);
      saveProfile({ plan: finalPlan, completedAt: new Date().toISOString() });
      // No email gate: the free result shows straight away. Email sign-up is optional on the results screen.
      setScreen('results');
      trackRevenueEvent('free_result_viewed');
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
    else setScreen('landing');
  };

  const handleStartOver = () => {
    clearProfile();
    setScreen('landing');
    setStep(0);
    setAnswers(defaultAnswers);
    setPlan([]);
  };

  // Avoid flashing the landing page at returning visitors before their saved plan loads.
  if (!hydrated) return null;

  return (
    <>
      {screen === 'landing' && <ExitIntentPopup onStartQuiz={() => setScreen('quiz')} />}
      <AnimatePresence mode="wait">
        <motion.div
          key={screen + (screen === 'quiz' ? `-${step}` : '')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {screen === 'landing' && <LandingHero onStart={() => setScreen('quiz')} />}

          {screen === 'quiz' && (
            <QuizScreen
              step={step}
              answers={answers}
              onAnswer={(key, value) => setAnswers(prev => ({ ...prev, [key]: value }))}
              onSliderChange={(v) => setAnswers(prev => ({ ...prev, bodyCondition: v }))}
              onNext={handleNext}
              onBack={handleBack}
              canProceed={canProceed()}
            />
          )}

          {screen === 'loading' && <LoadingScreen />}

          {screen === 'results' && (
            <ResultsScreen
              plan={plan}
              answers={answers}
              onStartOver={handleStartOver}
              onUpgrade={() => setScreen('upsell')}
            />
          )}

          {screen === 'upsell' && (
            <PremiumUpsell answers={answers} onSkip={() => setScreen('results')} />
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default Index;
