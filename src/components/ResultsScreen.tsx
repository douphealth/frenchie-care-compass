import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Share2, Download, Loader2, Star, Shield, Award, Printer, CalendarPlus, ChevronRight } from 'lucide-react';
import PlanResults from './PlanResults';
import { PlanSection } from '@/lib/planGenerator';
import { QuizAnswers } from '@/lib/quizData';
import ProfileCard from './results/ProfileCard';
import LockedModules from './results/LockedModules';
import CalorieCard from './results/CalorieCard';
import BoasScorecard from './results/BoasScorecard';
import HeatStressMeter from './results/HeatStressMeter';
import UrgentVetBanner from './results/UrgentVetBanner';
import AffiliateGrid from './results/AffiliateGrid';
import LeadGateModal from './LeadGateModal';
import { buildIcs, downloadIcs } from '@/lib/icsGenerator';
import { loadProfile, saveProfile } from '@/lib/profileStore';
import { canAccessPremium, Entitlement } from '@/lib/entitlement';
import { fetchVaultPack, verifyCheckout } from '@/lib/revenueBackend';
import { publicFocusTitle } from '@/lib/publicFocus';
import type { VaultPack } from '@/lib/vaultPack';
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
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [vault, setVault] = useState<VaultPack | null>(null);
  const [vaultState, setVaultState] = useState<'idle' | 'loading' | 'error'>('idle');

  const stored = useMemo(() => loadProfile(), []);
  const hasLead = !!stored.leadCaptured || !!stored.email;
  const premium = canAccessPremium(entitlement);
  const [recheck, setRecheck] = useState<'idle' | 'checking' | 'failed'>(stored.entitlement ? 'checking' : 'idle');
  const purchaseOnRecord = Boolean(stored.entitlement) && !premium;

  useEffect(() => {
    const sessionId = stored.entitlement?.sessionId;
    if (!sessionId) return;
    let cancelled = false;
    verifyCheckout(sessionId)
      .then((verified) => {
        if (cancelled) return;
        const next = verified?.entitlement;
        if (next && canAccessPremium(next)) {
          setEntitlement(next);
          saveProfile({ entitlement: next });
          setRecheck('idle');
        } else {
          saveProfile({ entitlement: undefined });
          setRecheck('idle');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEntitlement(null);
          setRecheck('failed');
        }
      });
    return () => { cancelled = true; };
  }, [stored.entitlement?.sessionId]);

  useEffect(() => {
    if (!premium || !entitlement?.sessionId) {
      setVault(null);
      setVaultState('idle');
      return;
    }
    let cancelled = false;
    setVaultState('loading');
    fetchVaultPack(entitlement.sessionId, answers)
      .then((pack) => {
        if (cancelled) return;
        setVault(pack);
        setVaultState('idle');
      })
      .catch(() => {
        if (!cancelled) setVaultState('error');
      });
    return () => { cancelled = true; };
  }, [premium, entitlement?.sessionId, answers]);

  const urgentReason =
    boasLevel === 'urgent' ? 'Your Frenchie\'s breathing scorecard is in the urgent range.'
    : heatZone === 'emergency' ? 'Current temperature is in the emergency zone for flat-faced breeds.'
    : null;

  const handleShare = async () => {
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: 'My Frenchie Care Plan',
          text: 'Check out my personalized French Bulldog care plan!',
          url: window.location.href,
        });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: 'Link copied', description: 'Care plan URL copied to your clipboard.' });
      }
    } catch (error) {
      if ((error as { name?: string })?.name !== 'AbortError') {
        toast({ title: 'Unable to share', description: 'Copy the URL from your browser address bar.', variant: 'destructive' });
      }
    }
  };

  const runDownloadPdf = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const { generatePDF } = await import('@/lib/pdfGenerator');
      await generatePDF(plan, answers, {
        tier: premium ? 'premium' : 'free',
        includeEmergencyCard: Boolean(entitlement?.includeEmergencyCard),
        program: vault?.program ?? null,
      });
      toast({
        title: premium ? 'Vault PDF downloaded' : 'Free Care Plan PDF downloaded',
        description: premium && !vault?.program
          ? 'The 4-week program page was left out because the server did not return it. The rest of the PDF is in your downloads.'
          : 'Check your downloads folder for your printable PDF.',
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast({
        title: 'PDF export failed',
        description: 'Please try again or use the Print button to save as PDF.',
        variant: 'destructive',
      });
    } finally {
      setPdfLoading(false);
    }
  };

  const runDownloadIcs = () => {
    const ics = buildIcs(answers);
    downloadIcs('frenchie-care-plan.ics', ics);
    toast({ title: 'Calendar downloaded', description: 'Open the .ics file to sync with Google / Apple Calendar.' });
  };

  const handlePrint = () => {
    toast({ title: 'Opening print view', description: 'Select "Save as PDF" or your printer in the dialog.' });
    window.print();
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
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-6"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl premium-gradient shadow-xl mb-3"
          >
            <span className="text-3xl">🐾</span>
          </motion.div>

          <div className="flex justify-end mb-2">
            <a href="/account" className="text-xs font-bold text-muted-foreground hover:text-foreground">Account</a>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground font-display leading-tight">
            Your Personalized
            <br />
            <span className="text-gradient">Frenchie Care Dashboard</span>
          </h1>

          <div className="flex items-center justify-center gap-3 mt-3 no-print">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Shield className="w-3.5 h-3.5 text-success" /> Educational
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
        <div className="no-print">
          <LockedModules
            onUpgrade={onUpgrade}
            unlocked={premium}
            teaserTitle={publicFocusTitle(answers.concern)}
            program={vault?.program}
            modules={vault?.modules}
            vaultState={vaultState}
          />
        </div>

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
              disabled={pdfLoading}
              variant="outline"
              className="h-12 rounded-xl font-bold gap-2 border-2"
            >
              {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {pdfLoading ? 'Building PDF...' : premium ? 'Vault PDF' : 'Free PDF'}
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="h-12 rounded-xl font-bold gap-2 border-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
          </div>
        </div>

        {/* Premium Upgrade CTA: never shown to someone who already bought */}
        {purchaseOnRecord && recheck !== 'idle' && (
          <div className="no-print mt-5 rounded-2xl border border-border bg-card p-5 text-center">
            <p className="text-sm font-bold text-foreground">
              {recheck === 'checking' ? 'Re-checking your Care Vault purchase with Stripe...' : 'We could not re-confirm your purchase just now.'}
            </p>
            {recheck === 'failed' && (
              <p className="text-xs text-muted-foreground mt-1">
                You do not need to pay again. Reload in a minute, or open the access link we emailed you.
              </p>
            )}
          </div>
        )}
        {!premium && !(purchaseOnRecord && recheck !== 'idle') && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
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
              A 4-week plan for your main concern, plus the routine, checklists and a longer printable PDF. Yours to keep.
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
        )}

        {/* Actions */}
        <div className="no-print mt-6 flex items-center justify-center gap-3">
          <Button onClick={onStartOver} variant="outline" className="rounded-xl gap-2 h-11">
            <RefreshCcw className="w-4 h-4" />
            Start Over
          </Button>
          <Button onClick={handleShare} variant="outline" className="rounded-xl gap-2 h-11">
            <Share2 className="w-4 h-4" />
            Share Plan
          </Button>
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
