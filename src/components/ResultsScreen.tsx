import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Share2, Download } from 'lucide-react';
import PlanResults from './PlanResults';
import { PlanSection } from '@/lib/planGenerator';
import { QuizAnswers } from '@/lib/quizData';
import { generatePDF } from '@/lib/pdfGenerator';

type Props = {
  plan: PlanSection[];
  answers: QuizAnswers;
  onStartOver: () => void;
  onUpgrade: () => void;
};

const ResultsScreen = ({ plan, answers, onStartOver, onUpgrade }: Props) => {
  const stageLabel = answers.lifeStage === 'puppy' ? 'puppy' : answers.lifeStage === 'senior' ? 'senior Frenchie' : 'French Bulldog';

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'My Frenchie Care Plan', text: 'Check out my personalized French Bulldog care plan!', url: window.location.href });
    }
  };

  const handleDownloadPDF = () => {
    generatePDF(plan, answers);
  };

  return (
    <div className="min-h-screen px-5 py-6 max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2 mb-6"
      >
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="text-4xl inline-block"
        >
          🎉
        </motion.span>
        <h2 className="text-xl md:text-2xl font-black text-foreground font-display">
          Your Frenchie's Care Plan
        </h2>
        <p className="text-sm text-muted-foreground">
          Personalized for your {stageLabel}.
        </p>
      </motion.div>

      <PlanResults sections={plan} />

      {/* Download Free PDF */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6"
      >
        <Button
          onClick={handleDownloadPDF}
          variant="outline"
          className="w-full h-12 rounded-xl font-bold gap-2"
        >
          <Download className="w-4 h-4" />
          Download Free Care Plan PDF
        </Button>
      </motion.div>

      {/* Upgrade CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-4 glass-card rounded-2xl p-5 text-center space-y-3"
      >
        <p className="text-sm font-bold text-foreground">🌟 Want a premium 12-page care guide?</p>
        <p className="text-xs text-muted-foreground">Custom feeding charts, grooming checklists, vet prep sheets & more</p>
        <Button
          onClick={onUpgrade}
          className="w-full h-12 rounded-xl font-bold gold-gradient text-premium-gold-foreground"
        >
          Get Premium PDF — $7.99
        </Button>
      </motion.div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <Button onClick={onStartOver} variant="outline" className="rounded-xl gap-2">
          <RefreshCcw className="w-4 h-4" />
          Start Over
        </Button>
        {navigator.share && (
          <Button onClick={handleShare} variant="outline" className="rounded-xl gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        For more French Bulldog care tips, visit{' '}
        <a href="https://frenchyfab.com" target="_blank" rel="noopener noreferrer" className="text-secondary font-bold hover:underline">
          FrenchyFab.com
        </a>
      </p>
    </div>
  );
};

export default ResultsScreen;
