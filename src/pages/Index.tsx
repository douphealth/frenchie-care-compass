import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import LandingHero from '@/components/LandingHero';
import QuizScreen from '@/components/QuizScreen';
import EmailGate from '@/components/EmailGate';
import ResultsScreen from '@/components/ResultsScreen';
import PremiumUpsell from '@/components/PremiumUpsell';
import LoadingScreen from '@/components/LoadingScreen';
import ExitIntentPopup from '@/components/ExitIntentPopup';
import { quizSteps, QuizAnswers } from '@/lib/quizData';
import { generatePlan, PlanSection } from '@/lib/planGenerator';
import { generateAiPlan, submitLead, trackRevenueEvent } from '@/lib/revenueBackend';
import { loadProfile, saveProfile, clearProfile } from '@/lib/profileStore';
import { isValidEmail, normalizeEmail, parseQuizAnswers } from '@/lib/quizValidation';
import { toast } from '@/hooks/use-toast';

type Screen = 'landing' | 'quiz' | 'loading' | 'emailGate' | 'results' | 'upsell';

const defaultAnswers: QuizAnswers = {
  lifeStage: '', weight: '', bodyCondition: 5, concern: '', activityLevel: '', environment: [],
};

const Index = () => {
  const [screen, setScreen] = useState<Screen>('landing');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>(defaultAnswers);
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState<PlanSection[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once
  useEffect(() => {
    const stored = loadProfile();
    if (stored.answers) setAnswers(stored.answers);
    if (stored.email) setEmail(stored.email);
    if (stored.plan) setPlan(stored.plan);
    const cancelled = new URLSearchParams(window.location.search).get('checkout') === 'cancelled';
    if (cancelled) {
      setScreen('upsell');
      toast({
        title: 'Checkout cancelled',
        description: 'No payment was taken. The free plan is still here.',
      });
    } else if (stored.plan && stored.answers && stored.email) {
      setScreen('results');
    } else if (stored.screen === 'quiz' && typeof stored.step === 'number') {
      setScreen('quiz');
      setStep(stored.step);
    }
    setHydrated(true);
  }, []);

  // Persist key state
  useEffect(() => {
    if (!hydrated) return;
    saveProfile({ answers, email, plan, step, screen });
  }, [answers, email, plan, step, screen, hydrated]);

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
      const aiPlan = await generateAiPlan(answers);
      const finalPlan = aiPlan || generatePlan(answers);
      setPlan(finalPlan);
      saveProfile({ plan: finalPlan, completedAt: new Date().toISOString() });
      setScreen('emailGate');
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
    else setScreen('landing');
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast({ title: 'Enter a valid email', description: 'We need a real address to save the plan.', variant: 'destructive' });
      return;
    }
    const normalizedEmail = normalizeEmail(email);

    localStorage.setItem('frenchie_email', normalizedEmail);
    saveProfile({ email: normalizedEmail, leadCaptured: true });

    try {
      await submitLead({ email: normalizedEmail, answers, plan, source: 'frenchie-care-plan-app' });
      toast({
        title: 'Your free plan is saved',
        description: 'We saved your Frenchie profile and unlocked your personalized care plan.',
      });
    } catch {
      toast({
        title: 'Saved in this browser',
        description: 'The care plan is on this device. Lead sync will retry when the server accepts it.',
        variant: 'destructive',
      });
    }

    setScreen('results');
    trackRevenueEvent('free_result_viewed');
  };

  const handleStartOver = () => {
    clearProfile();
    setScreen('landing');
    setStep(0);
    setAnswers(defaultAnswers);
    setEmail('');
    setPlan([]);
  };

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

          {screen === 'emailGate' && (
            <EmailGate plan={plan} email={email} setEmail={setEmail} onSubmit={handleEmailSubmit} />
          )}

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
