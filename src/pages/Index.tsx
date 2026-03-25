import { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, PawPrint, Mail, CheckCircle2 } from 'lucide-react';
import QuizStep from '@/components/QuizStep';
import PlanResults from '@/components/PlanResults';
import { quizSteps, QuizAnswers } from '@/lib/quizData';
import { generatePlan, PlanSection } from '@/lib/planGenerator';
import frenchieHero from '@/assets/frenchie-hero.png';

type Screen = 'landing' | 'quiz' | 'emailGate' | 'results';

const Index = () => {
  const [screen, setScreen] = useState<Screen>('landing');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({
    lifeStage: '', weight: '', bodyCondition: 5, concern: '', activityLevel: '', environment: [],
  });
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState<PlanSection[]>([]);

  const currentStep = quizSteps[step];
  const progress = ((step + 1) / quizSteps.length) * 100;

  const getStepValue = () => {
    const key = currentStep.id as keyof QuizAnswers;
    return answers[key] as string | string[];
  };

  const canProceed = () => {
    const val = getStepValue();
    if (currentStep.type === 'multi') return Array.isArray(val) && val.length > 0;
    return !!val;
  };

  const handleSelect = (value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [currentStep.id]: value }));
  };

  const handleNext = () => {
    if (step < quizSteps.length - 1) {
      setStep(s => s + 1);
    } else {
      const generated = generatePlan(answers);
      setPlan(generated);
      setScreen('emailGate');
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    localStorage.setItem('frenchie_email', email);
    setScreen('results');
  };

  // Landing
  if (screen === 'landing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10">
        <div className="max-w-md w-full text-center space-y-6">
          <img src={frenchieHero} alt="Cute French Bulldog" width={200} height={200} className="mx-auto" />
          <div className="space-y-3">
            <h1 className="text-2xl font-extrabold text-foreground leading-tight">
              Get Your French Bulldog's Personalized Care Plan in 60 Seconds
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Answer 5 quick questions and get a tailored routine covering feeding, grooming, exercise, and health — built specifically for your Frenchie.
            </p>
          </div>
          <Button
            onClick={() => setScreen('quiz')}
            size="lg"
            className="w-full text-base font-bold gap-2 h-14 rounded-xl"
          >
            <PawPrint className="w-5 h-5" />
            Start My Plan
          </Button>
          <p className="text-xs text-muted-foreground">
            Free · No signup required · Takes 60 seconds
          </p>
        </div>
      </div>
    );
  }

  // Quiz
  if (screen === 'quiz') {
    return (
      <div className="min-h-screen flex flex-col px-5 py-6 max-w-md mx-auto">
        {/* Progress */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {step + 1} of {quizSteps.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Back button */}
        <button
          onClick={() => step > 0 ? setStep(s => s - 1) : setScreen('landing')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Question */}
        <div className="flex-1">
          <QuizStep
            key={step}
            question={currentStep.question}
            subtitle={currentStep.subtitle}
            options={currentStep.options}
            type={currentStep.type}
            selected={getStepValue()}
            onSelect={handleSelect}
            hasSlider={currentStep.hasSlider}
            sliderLabel={currentStep.sliderLabel}
            sliderMin={currentStep.sliderMin}
            sliderMax={currentStep.sliderMax}
            sliderValue={answers.bodyCondition}
            onSliderChange={(v) => setAnswers(prev => ({ ...prev, bodyCondition: v }))}
          />
        </div>

        {/* Next button */}
        <Button
          onClick={handleNext}
          disabled={!canProceed()}
          className="w-full h-12 rounded-xl font-bold mt-6 gap-2"
        >
          {step === quizSteps.length - 1 ? 'See My Plan' : 'Next'}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Email Gate
  if (screen === 'emailGate') {
    return (
      <div className="min-h-screen px-5 py-6 max-w-md mx-auto">
        <div className="text-center space-y-2 mb-6">
          <CheckCircle2 className="w-12 h-12 text-secondary mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Your Care Plan is Ready!</h2>
          <p className="text-sm text-muted-foreground">
            Here's a preview. Enter your email to unlock the full plan.
          </p>
        </div>

        <PlanResults sections={plan} blurred />

        {/* Overlay email form */}
        <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-10 pb-6 -mx-5 px-5 mt-4">
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl"
              />
              <Button type="submit" className="h-12 rounded-xl px-5 font-bold gap-1.5">
                <Mail className="w-4 h-4" />
                Unlock
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              We'll send care tips for your Frenchie. Unsubscribe anytime.
            </p>
          </form>
        </div>
      </div>
    );
  }

  // Full Results
  return (
    <div className="min-h-screen px-5 py-6 max-w-md mx-auto">
      <div className="text-center space-y-2 mb-6">
        <h2 className="text-xl font-bold text-foreground">
          🎉 Your Frenchie's Care Plan
        </h2>
        <p className="text-sm text-muted-foreground">
          Personalized for your {answers.lifeStage === 'puppy' ? 'puppy' : answers.lifeStage === 'senior' ? 'senior Frenchie' : 'French Bulldog'}.
        </p>
      </div>

      <PlanResults sections={plan} />

      <div className="mt-8 text-center space-y-3">
        <Button
          onClick={() => {
            setScreen('landing');
            setStep(0);
            setAnswers({ lifeStage: '', weight: '', bodyCondition: 5, concern: '', activityLevel: '', environment: [] });
            setEmail('');
          }}
          variant="outline"
          className="rounded-xl"
        >
          Start Over
        </Button>
        <p className="text-xs text-muted-foreground">
          For more French Bulldog care tips, visit{' '}
          <a href="https://frenchyfab.com" target="_blank" rel="noopener noreferrer" className="text-secondary font-semibold hover:underline">
            FrenchyFab.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default Index;
