import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, Loader2, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { requestPurchaseRecovery, verifyCheckout } from '@/lib/revenueBackend';
import { saveProfile, loadProfile } from '@/lib/profileStore';
import { canAccessPremium } from '@/lib/entitlement';
import { generatePDF } from '@/lib/pdfGenerator';
import { isValidEmail, normalizeEmail } from '@/lib/quizValidation';

type Status = 'checking' | 'unlocked' | 'unconfirmed' | 'missing';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('checking');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session_id') || '';
    if (!sessionId) {
      setStatus('missing');
      return;
    }
    let cancelled = false;
    verifyCheckout(sessionId)
      .then((entitlement) => {
        if (cancelled) return;
        if (entitlement && canAccessPremium(entitlement)) {
          saveProfile({ entitlement, email: entitlement.email || loadProfile().email });
          setStatus('unlocked');
        } else {
          setStatus('unconfirmed');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('unconfirmed');
      });
    return () => { cancelled = true; };
  }, []);

  const downloadVault = async () => {
    const stored = loadProfile();
    if (!canAccessPremium(stored.entitlement) || !stored.plan || !stored.answers) {
      setStatus('unconfirmed');
      return;
    }
    setDownloading(true);
    try {
      await generatePDF(stored.plan, stored.answers, {
        tier: 'premium',
        includeEmergencyCard: stored.entitlement.includeEmergencyCard,
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
      setRecoveryMessage('If that email has a confirmed purchase, we sent an access link. Check your inbox.');
    } catch {
      setRecoveryMessage('We could not send a recovery email from this server. Keep your Stripe receipt and contact hello@frenchyfab.com.');
    }
  };

  return (
    <div className="min-h-screen px-5 py-12 max-w-lg mx-auto flex flex-col items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-6"
      >
        {status === 'checking' ? (
          <Loader2 className="w-10 h-10 text-success animate-spin" />
        ) : (
          <CheckCircle2 className="w-10 h-10 text-success" />
        )}
      </motion.div>

      <div className="space-y-3">
        <h1 className="text-2xl md:text-3xl font-black text-foreground font-display">
          {status === 'unlocked' ? 'Vault unlocked' : status === 'checking' ? 'Checking payment' : 'Payment not confirmed'}
        </h1>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          {status === 'unlocked' && 'Stripe confirmed this purchase. Download the vault PDF, or open your plan to see the premium modules.'}
          {status === 'checking' && 'We are asking Stripe whether this checkout was paid. The vault stays locked until that check succeeds.'}
          {status === 'missing' && 'This page does not unlock anything by itself. Finish checkout, or use the recovery form with the email on your Stripe receipt.'}
          {status === 'unconfirmed' && 'Stripe did not confirm a paid session for this link. You have not been charged by this page, and the vault stays locked.'}
        </p>
      </div>

      <div className="mt-8 space-y-3 w-full max-w-xs">
        {status === 'unlocked' && (
          <Button onClick={downloadVault} disabled={downloading} size="lg" className="w-full h-12 rounded-xl font-bold gap-2">
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download vault PDF
          </Button>
        )}
        <Button onClick={() => navigate('/')} variant={status === 'unlocked' ? 'outline' : 'default'} size="lg" className="w-full h-12 rounded-xl font-bold">
          Back to care plan
        </Button>
      </div>

      {status !== 'unlocked' && status !== 'checking' && (
        <form onSubmit={sendRecovery} className="mt-8 w-full max-w-xs space-y-2 text-left">
          <label htmlFor="recovery-email" className="text-xs font-bold text-foreground">Already paid?</label>
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
            Email me an access link
          </Button>
          {recoveryMessage && <p className="text-xs text-muted-foreground">{recoveryMessage}</p>}
        </form>
      )}
    </div>
  );
};

export default PaymentSuccess;
