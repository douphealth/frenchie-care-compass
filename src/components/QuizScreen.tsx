import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import QuizStep from './QuizStep';
import { quizSteps, QuizAnswers } from '@/lib/quizData';

type Props = {
  step: number;
  answers: QuizAnswers;
  onAnswer: (key: string, value: string | string[]) => void;
  onSliderChange: (v: number) => void;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
};

const QuizScreen = ({ step, answers, onAnswer, onSliderChange, onNext, onBack, canProceed }: Props) => {
  const currentStep = quizSteps[step];
  const progress = ((step + 1) / quizSteps.length) * 100;

  const getStepValue = () => {
    const key = currentStep.id as keyof QuizAnswers;
    return answers[key] as string | string[];
  };

  return (
    <div className="min-h-screen flex flex-col px-5 py-6 max-w-lg mx-auto">
      {/* Progress */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2 mb-6"
      >
        <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
          <span>Question {step + 1} of {quizSteps.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2.5 rounded-full" />
      </motion.div>

      {/* Back */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors font-semibold"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </motion.button>

      {/* Question */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <QuizStep
              question={currentStep.question}
              subtitle={currentStep.subtitle}
              options={currentStep.options}
              type={currentStep.type}
              selected={getStepValue()}
              onSelect={(v) => onAnswer(currentStep.id, v)}
              hasSlider={currentStep.hasSlider}
              sliderLabel={currentStep.sliderLabel}
              sliderMin={currentStep.sliderMin}
              sliderMax={currentStep.sliderMax}
              sliderValue={answers.bodyCondition}
              onSliderChange={onSliderChange}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Next — sticky bottom */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-background via-background to-transparent -mx-5 px-5"
      >
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="w-full h-13 rounded-2xl font-black text-base gap-2 premium-gradient text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {step === quizSteps.length - 1 ? 'See My Plan' : 'Next'}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
};

export default QuizScreen;
