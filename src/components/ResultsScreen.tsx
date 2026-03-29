import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Share2, Download, Star, Shield, Award, Lock, ChevronRight } from 'lucide-react';
import PlanResults from './PlanResults';
import { PlanSection } from '@/lib/planGenerator';
import { QuizAnswers } from '@/lib/quizData';
import { generatePDF } from '@/lib/pdfGenerator';
import ProfileCard from './results/ProfileCard';
import LockedModules from './results/LockedModules';

type Props = {
  plan: PlanSection[];
  answers: QuizAnswers;
  onStartOver: () => void;
  onUpgrade: () => void;
};

const ResultsScreen = ({ plan, answers, onStartOver, onUpgrade }: Props) => {
  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'My Frenchie Care Plan', text: 'Check out my personalized French Bulldog care plan!', url: window.location.href });
    }
  };

  const handleDownloadPDF = async () => {
    await generatePDF(plan, answers);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <div className="px-5 py-6 max-w-lg mx-auto">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl premium-gradient shadow-xl mb-3"
          >
            <span className="text-3xl">🐾</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl md:text-3xl font-black text-foreground font-display leading-tight"
          >
            Your Personalized
            <br />
            <span className="text-gradient">Frenchie Care Dashboard</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-3 mt-3"
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Shield className="w-3.5 h-3.5 text-emerald-500" /> Vet-Informed
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Award className="w-3.5 h-3.5 text-amber-500" /> Breed-Specific
            </span>
          </motion.div>
        </motion.div>

        {/* Profile Summary Card */}
        <ProfileCard answers={answers} />

        {/* Plan sections divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex items-center gap-2 mb-4 mt-6"
        >
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            {plan.length} Personalized Sections
          </span>
          <div className="h-px flex-1 bg-border" />
        </motion.div>

        {/* Plan Content */}
        <PlanResults sections={plan} />

        {/* Locked Premium Modules Preview */}
        <LockedModules onUpgrade={onUpgrade} />

        {/* Download Free PDF */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            className="w-full h-14 rounded-2xl font-bold gap-2.5 text-base border-2 hover:bg-muted/50 transition-all"
          >
            <Download className="w-5 h-5" />
            Download Free Care Plan PDF
          </Button>
        </motion.div>

        {/* Premium Upgrade CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-5 relative overflow-hidden rounded-2xl border-2 border-amber-300/60 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-6"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-200/30 to-transparent rounded-bl-full" />
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-700">Frenchie Care Vault</span>
            </div>
            
            <h3 className="text-lg font-black text-foreground font-display mb-1">
              Unlock the Complete Care Operating System
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Everything you need to avoid costly care mistakes — yours forever.
            </p>
            
            <ul className="space-y-1.5 mb-4">
              {[
                'Full daily routine & weekly schedule',
                'Custom feeding charts with exact portions',
                'Seasonal heat/cold care calendar',
                'Emergency red-flag symptom checklist',
                '"When to call the vet" decision guide',
                'Product recommendations & ingredient watchlist',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            
            <Button
              onClick={onUpgrade}
              className="w-full h-12 rounded-xl font-black text-base gold-gradient text-premium-gold-foreground shadow-lg hover:shadow-xl transition-all"
            >
              Unlock My Frenchie Care Vault — $7.99
            </Button>
            
            <p className="text-center text-xs text-muted-foreground mt-2">
              One-time purchase · Instant download · No subscription
            </p>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={onStartOver} variant="outline" className="rounded-xl gap-2 h-11">
            <RefreshCcw className="w-4 h-4" />
            Start Over
          </Button>
          {navigator.share && (
            <Button onClick={handleShare} variant="outline" className="rounded-xl gap-2 h-11">
              <Share2 className="w-4 h-4" />
              Share Plan
            </Button>
          )}
        </div>

        {/* FrenchyFab link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-6 space-y-3"
        >
          <div className="glass-card rounded-xl p-4">
            <p className="text-xs font-bold text-foreground mb-1">Want more Frenchie care tips?</p>
            <a
              href="https://frenchyfab.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-bold text-secondary hover:underline"
            >
              Visit FrenchyFab.com <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
          <p className="text-[10px] text-muted-foreground/60 pb-4">
            This plan provides general guidance. Always consult your veterinarian for medical decisions.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default ResultsScreen;
