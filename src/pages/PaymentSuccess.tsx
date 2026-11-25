import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Download, Loader2, Mail, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchVaultPack, openBillingPortal, requestPurchaseRecovery, verifyCheckout } from '@/lib/revenueBackend';
import { saveProfile, loadProfile } from '@/lib/profileStore';
import { canAccessPremium } from '@/lib/entitlement';
import { generatePDF } from '@/lib/pdfGenerator';
import { isValidEmail, normalizeEmail } from '@/lib/quizValidation';
import { generatePlan } from '@/lib/planGenerator';
import { toast } from '@/hooks/use-toast';

type Status = 'checking' | 'unlocked' | 'unconfirmed' | 'missing' | 'restore' | 'error';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('checking');
  const [hasProfile, setHasProfile] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionFromUrl = params.get('session_id') || '';
    setSessionId(sessionFromUrl);
    const viaEmail = params.get('via') === 'email';
    if (!sessionFromUrl) {
      setStatus(params.get('restore') === '1' ? 'restore' : 'missing');
      return;
    }
    let cancelled = false;
    verifyCheckout(sessionFromUrl, { fulfil: !viaEmail })
      .then((verified) => {
        if (cancelled) return;
        if (verified && canAccessPremium(verified.entitlement)) {
          const { entitlement, answers } = verified;
          const stored = loadProfile();
          // Opened on another device (or storage was cleared): rebuild the plan from the answers on the Stripe session.
          const useAnswers = stored.answers && stored.plan ? stored.answers : answers;
          const resolvedPlan = useAnswers ? (stored.plan && stored.answers ? stored.plan : generatePlan(useAnswers)) : undefined;
          saveProfile({
            entitlement,
            email: entitlement.email || stored.email,
            leadCaptured: true,
            ...(useAnswers && resolvedPlan ? { answers: useAnswers, plan: resolvedPlan } : {}),
          });
          setHasProfile(Boolean(useAnswers && resolvedPlan));
          setStatus('unlocked');
        } else {
          setStatus('unconfirmed');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const titles: Record<Status, string> = {
      checking: 'Checking payment | FrenchyFab Care Compass',
      unlocked: 'Vault unlocked | FrenchyFab Care Compass',
      unconfirmed: 'Payment not confirmed | FrenchyFab Care Compass',
      missing: 'Payment not confirmed | FrenchyFab Care Compass',
      restore: 'Restore purchase | FrenchyFab Care Compass',
      error: 'Payment check unavailable | FrenchyFab Care Compass',
    };
    document.title = titles[status];
  }, [status]);

  const downloadVault = async () => {
    const stored = loadProfile();
    if (!canAccessPremium(stored.entitlement)) {
      setStatus('unconfirmed');
      return;
    }
    if (!stored.plan || !stored.answers) {
      setRecoveryMessage('Payment confirmed, but this browser has no Frenchie profile yet. Take the 5-question quiz once and your unlocked vault opens immediately.');
      return;
    }
    setDownloading(true);
    try {
      let program = null;
      try {
        program = (await fetchVaultPack(stored.entitlement.sessionId, stored.answers)).program;
      } catch (error) {
        console.error('Vault program fetch failed:', error);
      }
      await generatePDF(stored.plan, stored.answers, {
        tier: 'premium',
        includeEmergencyCard: stored.entitlement.includeEmergencyCard,
        program,
      });
      toast({
        title: 'Vault PDF downloaded',
        description: program
          ? 'Check your downloads folder for your complete Frenchie Care Vault PDF.'
          : 'The PDF downloaded without the 4-week program page because the server did not return it.',
      });
    } catch (error) {
      console.error('Vault PDF download failed:', error);
      toast({
        title: 'Download failed',
        description: 'Please try again or open your vault on screen to print.',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const sendRecovery = async (event: React.FormEvent) => {
    event.preventDefault();
    setRecoveryMessage('');
    if (!isValidEmail(recoveryEmail)) {
      setRecoveryMessage('Enter the email you used at checkout.');
      return;
    }
    try {
      await requestPurchaseRecovery(normalizeEmail(recoveryEmail));
      setRecoveryMessage('If that email has a paid Care Vault purchase, we just emailed a link that reopens it. Check your inbox and spam folder.');
    } catch {
      setRecoveryMessage('We could not send a recovery email from this server. Keep your Stripe receipt and email info@frenchyfab.com.');
    }
  };

  return (
    <div className="min-h-screen px-5 py-12 max-w-lg mx-auto flex flex-col items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${status === 'unlocked' || status === 'checking' ? 'bg-success/20' : status === 'restore' ? 'bg-muted' : 'bg-destructive/10'}`}
      >
        {status === 'checking' ? (
          <Loader2 className="w-10 h-10 text-success animate-spin" />
        ) : status === 'unlocked' ? (
          <CheckCircle2 className="w-10 h-10 text-success" />
        ) : status === 'restore' ? (
          <Mail className="w-10 h-10 text-primary" />
        ) : (
          <AlertCircle className="w-10 h-10 text-destructive" />
        )}
      </motion.div>

      <div className="space-y-3">
        <h1 className="text-2xl md:text-3xl font-black text-foreground font-display">
          {status === 'unlocked' ? 'Vault unlocked' : status === 'checking' ? 'Checking payment' : status === 'error' ? 'Payment check unavailable' : status === 'restore' ? 'Restore purchase' : 'Payment not confirmed'}
        </h1>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          {status === 'unlocked' && (hasProfile
            ? 'Stripe confirmed this purchase. Download the vault PDF, or open your plan to see the premium modules.'
            : 'Stripe confirmed this purchase and saved your access on this browser. Take the 5-question quiz once to personalize your Vault PDF.')}
          {status === 'checking' && 'We are asking Stripe whether this checkout was paid. The vault stays locked until that check succeeds.'}
          {status === 'missing' && 'This page does not unlock anything by itself. Finish checkout, or restore a purchase with the email on your Stripe receipt.'}
          {status === 'restore' && 'Bought the Care Vault before, or on another device? Enter the email you used at Stripe checkout. If it has a paid Care Vault purchase, we email you a link that reopens your Vault here.'}
          {status === 'unconfirmed' && 'Stripe did not confirm a paid session for this link. You have not been charged by this page, and the vault stays locked.'}
          {status === 'error' && 'We could not reach the payment check just now. If you paid, your payment is safe: reload this page in a minute, or use the form below to get your access link by email.'}
        </p>
      </div>

      <div className="mt-8 space-y-3 w-full max-w-xs">
        {status === 'unlocked' && hasProfile && (
          <Button onClick={downloadVault} disabled={downloading} size="lg" className="w-full h-12 rounded-xl font-bold gap-2">
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {downloading ? 'Building Vault PDF...' : 'Download vault PDF'}
          </Button>
        )}
        <Button onClick={() => navigate('/')} variant={status === 'unlocked' && hasProfile ? 'outline' : 'default'} size="lg" className="w-full h-12 rounded-xl font-bold">
          {status === 'unlocked'
            ? (hasProfile ? 'Open my vault on screen' : 'Take 60-second quiz to personalize vault')
            : 'Back to care plan'}
        </Button>
        {status === 'unlocked' && recoveryMessage && <p className="text-xs text-muted-foreground">{recoveryMessage}</p>}
        {status === 'unlocked' && sessionId && (
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              try {
                window.location.href = await openBillingPortal(sessionId);
              } catch (error) {
                toast({
                  title: 'Receipts unavailable',
                  description: error instanceof Error ? error.message : 'Email info@frenchyfab.com for a receipt or refund.',
                  variant: 'destructive',
                });
              }
            }}
            className="w-full h-11 rounded-xl font-bold gap-2"
          >
            <Receipt className="w-4 h-4" />
            Receipt or refund
          </Button>
        )}
        {status === 'unlocked' && (
          <p className="text-xs text-muted-foreground">
            This is a one-time purchase, not a subscription. Bookmark this page: the link reopens your vault on any device. We also email it to you. Lost it? Use <a href="/payment-success?restore=1" className="underline">Restore purchase</a> with your checkout email.
          </p>
        )}
      </div>

      {status !== 'unlocked' && status !== 'checking' && (
        <form onSubmit={sendRecovery} className="mt-8 w-full max-w-xs space-y-2 text-left">
          {status !== 'restore' && <h2 className="text-sm font-black text-foreground">Restore purchase</h2>}
          <label htmlFor="recovery-email" className="text-xs font-bold text-foreground">Email used at checkout</label>
          <input
            id="recovery-email"
            type="email"
            required
            value={recoveryEmail}
            onChange={(event) => setRecoveryEmail(event.target.value)}
            placeholder="checkout email"
            className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <Button type="submit" variant="outline" className="w-full h-11 rounded-xl font-bold gap-2">
            <Mail className="w-4 h-4" />
            Restore my Vault
          </Button>
          {recoveryMessage && <p className="text-xs text-muted-foreground">{recoveryMessage}</p>}
        </form>
      )}
    </div>
  );
};

export default PaymentSuccess;
