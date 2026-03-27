import { useState, useCallback } from 'react';
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
import { supabase } from '@/integrations/supabase/client';

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

  const currentStep = quizSteps[step];

  const canProceed = useCallback(() => {
    const key = currentStep.id as keyof QuizAnswers;
    const val = answers[key];
    if (currentStep.type === 'multi') return Array.isArray(val) && val.length > 0;
    return !!val;
  }, [step, answers, currentStep]);

  const handleNext = async () => {
    if (step < quizSteps.length - 1) {
      setStep(s => s + 1);
    } else {
      // Quiz complete — generate AI plan
      setScreen('loading');
      try {
        const { data, error } = await supabase.functions.invoke('generate-plan', {
          body: { answers },
        });

        if (error || !data?.sections) {
          console.log('AI plan failed, using template fallback:', error);
          setPlan(generatePlan(answers));
        } else {
          setPlan(data.sections);
        }
      } catch (err) {
        console.log('AI plan error, using template fallback:', err);
        setPlan(generatePlan(answers));
      }
      setScreen('emailGate');
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
    else setScreen('landing');
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    localStorage.setItem('frenchie_email', email);
    setScreen('results');

    // Fire-and-forget: send welcome email (silently ignore failures)
    supabase.functions.invoke('send-welcome-email', {
      body: { email, answers },
    }).catch(() => {});
  };

  const handleStartOver = () => {
    setScreen('landing');
    setStep(0);
    setAnswers(defaultAnswers);
    setEmail('');
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
            <PremiumUpsell onSkip={() => setScreen('results')} />
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default Index;
