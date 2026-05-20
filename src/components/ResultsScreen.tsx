import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Share2, Download, Star, Shield, Award, Printer, CalendarPlus, ChevronRight } from 'lucide-react';
import PlanResults from './PlanResults';
import { PlanSection } from '@/lib/planGenerator';
import { QuizAnswers } from '@/lib/quizData';
import { generatePDF } from '@/lib/pdfGenerator';
import ProfileCard from './results/ProfileCard';
import LockedModules from './results/LockedModules';
import CalorieCard from './results/CalorieCard';
import BoasScorecard from './results/BoasScorecard';
import HeatStressMeter from './results/HeatStressMeter';
import UrgentVetBanner from './results/UrgentVetBanner';
import AffiliateGrid from './results/AffiliateGrid';
import LeadGateModal from './LeadGateModal';
import { buildIcs, downloadIcs } from '@/lib/icsGenerator';
import { loadProfile } from '@/lib/profileStore';
import { toast } from '@/hooks/use-toast';

type Props = {
  plan: PlanSection[];
  answers: QuizAnswers;
  onStartOver: () => void;
  onUpgrade: () => void;
};

type GateAction = 'pdf' | 'ics' | null;

const ResultsScreen = ({ plan, answers, onStartOver, onUpgrade }: Props) => {
  const [boasLevel, setBoasLevel] = useState<'low' | 'moderate' | 'urgent'>('low');
  const [heatZone, setHeatZone] = useState<'safe' | 'caution' | 'danger' | 'emergency'>('safe');
  const [gate, setGate] = useState<GateAction>(null);

  const stored = useMemo(() => loadProfile(), []);
  const hasLead = !!stored.leadCaptured || !!stored.email;

  const urgentReason =
    boasLevel === 'urgent' ? 'Your Frenchie\'s breathing scorecard is in the urgent range.'
    : heatZone === 'emergency' ? 'Current temperature is in the emergency zone for flat-faced breeds.'
    : null;

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'My Frenchie Care Plan', text: 'Check out my personalized French Bulldog care plan!', url: window.location.href });
    }
  };

  const runDownloadPdf = async () => {
    await generatePDF(plan, answers);
  };

  const runDownloadIcs = () => {
    const ics = buildIcs(answers);
    downloadIcs('frenchie-care-plan.ics', ics);
    toast({ title: 'Calendar downloaded', description: 'Open the .ics file to sync with Google / Apple Calendar.' });
  };

  const requestAction = (action: GateAction) => {
    if (hasLead) {
      if (action === 'pdf') runDownloadPdf();
      if (action === 'ics') runDownloadIcs();
    } else {
      setGate(action);
    }
  };

  const handleUnlock = () => {
    if (gate === 'pdf') runDownloadPdf();
    if (gate === 'ics') runDownloadIcs();
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

          <h1 className="text-2xl md:text-3xl font-black text-foreground font-display leading-tight">
            Your Personalized
            <br />
            <span className="text-gradient">Frenchie Care Dashboard</span>
          </h1>

          <div className="flex items-center justify-center gap-3 mt-3 no-print">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Shield className="w-3.5 h-3.5 text-success" /> Vet-Informed
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Award className="w-3.5 h-3.5 text-warning" /> Breed-Specific
            </span>
          </div>
        </motion.div>

        {/* Urgent banner above the fold if triggered */}
        {urgentReason && <UrgentVetBanner reason={urgentReason} />}

        {/* Profile Summary Card */}
        <ProfileCard answers={answers} />

        {/* Clinical engine modules */}
        <div className="space-y-4 mt-5">
          <CalorieCard answers={answers} />
          <BoasScorecard onLevelChange={setBoasLevel} />
          <HeatStressMeter onZoneChange={setHeatZone} />
        </div>

        {/* Plan sections divider */}
        <div className="flex items-center gap-2 mb-4 mt-6">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            {plan.length} Personalized Sections
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Plan Content */}
        <PlanResults sections={plan} />

        {/* Affiliate grid */}
        <AffiliateGrid answers={answers} />

        {/* Locked Premium Modules Preview */}
        <div className="no-print"><LockedModules onUpgrade={onUpgrade} /></div>

        {/* Action buttons (lead-gated) */}
        <div className="no-print mt-6 grid grid-cols-1 gap-3">
          <Button
            onClick={() => requestAction('ics')}
            className="w-full h-14 rounded-2xl font-bold gap-2.5 text-base bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <CalendarPlus className="w-5 h-5" />
            Sync Daily Care Tasks to My Calendar
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => requestAction('pdf')}
              variant="outline"
              className="h-12 rounded-xl font-bold gap-2 border-2"
            >
              <Download className="w-4 h-4" />
              Free PDF
            </Button>
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="h-12 rounded-xl font-bold gap-2 border-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
          </div>
        </div>

        {/* Premium Upgrade CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="no-print mt-5 relative overflow-hidden rounded-2xl border-2 border-warning/60 bg-gradient-to-br from-warning/10 via-warning/5 to-card p-6"
        >
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-warning fill-warning" />
              <span className="text-xs font-black uppercase tracking-wider text-warning">Frenchie Care Vault</span>
            </div>
            <h3 className="text-lg font-black text-foreground font-display mb-1">
              Unlock the Complete Care Operating System
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Everything you need to avoid costly care mistakes — yours forever.
            </p>
            <Button
              onClick={onUpgrade}
              className="w-full h-12 rounded-xl font-black text-base gold-gradient text-premium-gold-foreground shadow-lg"
            >
              Unlock My Frenchie Care Vault — $7.99
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-2">
              One-time · Instant download · No subscription
            </p>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="no-print mt-6 flex items-center justify-center gap-3">
          <Button onClick={onStartOver} variant="outline" className="rounded-xl gap-2 h-11">
            <RefreshCcw className="w-4 h-4" />
            Start Over
          </Button>
          {typeof navigator !== 'undefined' && (navigator as any).share && (
            <Button onClick={handleShare} variant="outline" className="rounded-xl gap-2 h-11">
              <Share2 className="w-4 h-4" />
              Share Plan
            </Button>
          )}
        </div>

        {/* FrenchyFab link */}
        <div className="no-print text-center mt-6 space-y-3">
          <div className="glass-card rounded-xl p-4">
            <p className="text-xs font-bold text-foreground mb-1">Want more Frenchie care tips?</p>
            <a
              href="https://frenchyfab.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
            >
              Visit FrenchyFab.com <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
          <p className="text-[10px] text-muted-foreground/60 pb-4">
            This plan provides general guidance. Always consult your veterinarian for medical decisions.
          </p>
        </div>
      </div>

      <LeadGateModal
        open={!!gate}
        onClose={() => setGate(null)}
        onUnlock={handleUnlock}
        answers={answers}
        plan={plan}
        initialEmail={stored.email || ''}
        title={gate === 'ics' ? 'Sync care tasks to your calendar' : 'Download your free PDF'}
        cta={gate === 'ics' ? 'Email me & download .ics' : 'Email me & download PDF'}
      />
    </div>
  );
};

export default ResultsScreen;
