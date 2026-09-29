import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyCheckout, trackRevenueEvent, PaymentVerification } from '@/lib/revenueBackend';
import { generatePDF } from '@/lib/pdfGenerator';
import { generatePlan } from '@/lib/planGenerator';
import { loadProfile, saveProfile } from '@/lib/profileStore';
import { QuizAnswers } from '@/lib/quizData';

type VerifyState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'paid'; verification: PaymentVerification; answers: QuizAnswers };

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';
  const [state, setState] = useState<VerifyState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!sessionId) {
        setState({ status: 'error', message: 'No Stripe Checkout session was provided.' });
        return;
      }

      try {
        const verification = await verifyCheckout(sessionId);
        if (!verification.paid) {
          throw new Error(verification.refunded ? 'This purchase has been refunded.' : 'Stripe has not confirmed this payment.');
        }

        const stored = loadProfile();
        const answers = (verification.answers || stored.answers) as QuizAnswers | undefined;
        if (!answers) throw new Error('Payment is verified, but the saved Frenchie profile could not be restored.');

        if (cancelled) return;
        saveProfile({
          answers,
          email: verification.email || stored.email,
          premium: {
            status: 'paid',
            sessionId,
            verifiedAt: new Date().toISOString(),
            amountTotal: verification.amountTotal,
            currency: verification.currency,
            email: verification.email,
          },
        });
        trackRevenueEvent('purchase_verified', {
          amount_total: verification.amountTotal,
          currency: verification.currency,
        });
        setState({ status: 'paid', verification, answers });
      } catch (error) {
        if (!cancelled) setState({ status: 'error', message: error instanceof Error ? error.message : 'Unable to verify payment.' });
      }
    }

    run();
    return () => { cancelled = true; };
  }, [sessionId]);

  const premiumPlan = useMemo(() => {
    if (state.status !== 'paid') return null;
    const stored = loadProfile();
    return stored.plan?.length ? stored.plan : generatePlan(state.answers);
  }, [state]);

  const amount = state.status === 'paid' && state.verification.amountTotal != null
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: (state.verification.currency || 'usd').toUpperCase(),
      }).format(state.verification.amountTotal / 100)
    : null;

  const downloadPremium = async () => {
    if (state.status !== 'paid' || !premiumPlan) return;
    await generatePDF(premiumPlan, state.answers);
    trackRevenueEvent('premium_pdf_downloaded');
  };

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen px-5 py-12 flex flex-col items-center justify-center text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <h1 className="text-xl font-black">Verifying your Stripe payment…</h1>
        <p className="text-sm text-muted-foreground mt-2">Premium access unlocks only after Stripe confirms the completed payment.</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="min-h-screen px-5 py-12 max-w-lg mx-auto flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h1 className="text-2xl font-black">Premium access not verified</h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-sm">{state.message}</p>
        <Button onClick={() => navigate('/')} variant="outline" className="mt-7 gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Care Plan
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 py-12 max-w-lg mx-auto flex flex-col items-center justify-center text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10 text-success" />
      </motion.div>

      <h1 className="text-2xl md:text-3xl font-black text-foreground font-display">Payment verified</h1>
      <p className="text-muted-foreground text-sm max-w-sm mt-3">
        Stripe confirmed your Frenchie Care Vault purchase{amount ? ' for ' + amount : ''}. Your premium PDF is now unlocked.
      </p>

      <div className="mt-8 space-y-3 w-full max-w-xs">
        <Button onClick={downloadPremium} size="lg" className="w-full h-12 rounded-xl font-bold gap-2">
          <Download className="w-4 h-4" />
          Download Premium Care Vault
        </Button>
        <Button onClick={() => navigate('/')} variant="outline" className="w-full h-11 rounded-xl font-bold">
          Back to Care Dashboard
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-6 max-w-sm">
        A recovery link is also sent to the checkout email when the Stripe webhook is configured.
      </p>
    </div>
  );
};

export default PaymentSuccess;
