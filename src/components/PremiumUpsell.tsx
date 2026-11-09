import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Crown, FileText, CheckCircle2, Download, Loader2, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { useState } from 'react';
import { createCheckout, requestPurchaseRecovery } from '@/lib/revenueBackend';
import { QuizAnswers } from '@/lib/quizData';
import { isValidEmail, normalizeEmail } from '@/lib/quizValidation';
import FeatureComparison from './FeatureComparison';
import SocialProof from './SocialProof';

type Props = {
  onSkip: () => void;
  answers: QuizAnswers;
};

const vaultFeatures = [
  'Personalized daily routine and weekly care schedule',
  'Feeding chart using the same calorie estimate as your free plan',
  'Breed-specific activity precautions and warning signs',
  'Skin, wrinkle, and ear care cadence',
  'Seasonal heat and cold calendar',
  'Vet visit prep sheet for this life stage',
  'Emergency red-flag checklist (no medication doses)',
  'When to call the vet',
  'Printable grooming and feeding checklists',
  'A longer PDF you can keep',
];

const PremiumUpsell = ({ onSkip, answers }: Props) => {
  const [loading, setLoading] = useState(false);
  const [addBump, setAddBump] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const email = localStorage.getItem('frenchie_email') || '';
      const checkout = await createCheckout({ email, addBump, answers });
      if (checkout.mode === 'payment-link') {
        trackNotice();
      }
      window.location.href = checkout.url;
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Checkout could not be opened. No purchase has been confirmed.');
    } finally {
      setLoading(false);
    }
  };

  const trackNotice = () => {
    setRecoveryMessage('Opening Stripe. The vault unlocks only after a verified session returns to this site.');
  };

  const sendRecovery = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidEmail(recoveryEmail)) {
      setRecoveryMessage('Enter the email you used at checkout.');
      return;
    }
    try {
      await requestPurchaseRecovery(normalizeEmail(recoveryEmail));
      setRecoveryMessage('If that email has a confirmed purchase, we sent an access link.');
    } catch {
      setRecoveryMessage('Recovery email is unavailable until the payment server is configured. Keep your Stripe receipt.');
    }
  };

  return (
    <div className="min-h-screen px-5 py-8 max-w-lg mx-auto flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-3 mb-6"
      >
        <motion.div
          animate={{ rotate: [0, -8, 8, -4, 0] }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="inline-flex"
        >
          <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center shadow-lg">
            <Crown className="w-8 h-8 text-primary-foreground" />
          </div>
        </motion.div>
        <h2 className="text-2xl md:text-3xl font-black text-foreground font-display">
          Unlock the Frenchie Care Vault
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
          The free plan stays on screen. The vault adds the routine, charts, checklists, and a longer PDF after Stripe confirms payment.
        </p>
      </motion.div>

      {/* Value props */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex items-center justify-center gap-3 mb-6"
      >
        {[
          { icon: ShieldCheck, text: 'Educational' },
          { icon: Zap, text: 'After payment' },
          { icon: CheckCircle2, text: 'From your answers' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
            <Icon className="w-3.5 h-3.5 text-secondary" />
            {text}
          </div>
        ))}
      </motion.div>

      {/* Preview mockup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="relative mx-auto mb-6 w-full max-w-xs"
      >
        <div className="aspect-[3/4] rounded-2xl premium-gradient p-[2px] shadow-2xl shadow-primary/20">
          <div className="w-full h-full rounded-2xl bg-card flex flex-col items-center justify-center gap-3 p-6">
            <FileText className="w-12 h-12 text-secondary" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Frenchie Care Vault</span>
            <div className="space-y-2 w-full">
              {[75, 90, 60, 85, 70].map((w, i) => (
                <div key={i} className="h-2 rounded-full bg-muted" style={{ width: `${w}%` }} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">Charts, checklists, and a printable PDF</span>
          </div>
        </div>
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-3 -right-3 w-10 h-10 rounded-full gold-gradient flex items-center justify-center shadow-lg"
        >
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </motion.div>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="glass-card rounded-2xl p-5 mb-6 space-y-3"
      >
        <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success" />
          Everything inside the Vault
        </h3>
        <ul className="space-y-2">
          {vaultFeatures.map((f, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.35 + i * 0.04 }}
              className="flex items-start gap-2.5 text-sm text-foreground/90"
            >
              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
              {f}
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Feature Comparison Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-6"
      >
        <h3 className="font-bold text-foreground text-sm flex items-center gap-2 mb-3">
          Free vs Frenchie Care Vault
        </h3>
        <FeatureComparison />
      </motion.div>

      {/* Order Bump */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mb-6"
      >
        <button
          onClick={() => setAddBump(!addBump)}
          className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
            addBump
              ? 'border-red-400 bg-red-50/80 shadow-md'
              : 'border-dashed border-red-200/60 bg-red-50/30 hover:border-red-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
              addBump ? 'border-red-500 bg-red-500' : 'border-red-300'
            }`}>
              {addBump && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </div>
            <div>
              <p className="text-sm font-black text-foreground">
                ADD: One-page emergency fridge card — <span className="text-red-600">+$4.99</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                The vault already includes the emergency checklist. This add-on is a separate large-type page meant for the fridge. It does not include medication doses.
              </p>
            </div>
          </div>
        </button>
      </motion.div>

      {/* Social Proof */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mb-6"
      >
        <SocialProof />
      </motion.div>

      {/* CTA */}
      <div className="mt-auto space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Button
            onClick={handleCheckout}
            disabled={loading}
            size="lg"
            className="w-full h-14 rounded-2xl text-sm font-black gap-1.5 gold-gradient text-premium-gold-foreground hover:opacity-90 transition-opacity shadow-xl shadow-premium-gold/20 px-4"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <Download className="w-4 h-4 shrink-0" />
            )}
            <span className="truncate">{loading ? 'Opening checkout...' : `Unlock My Frenchie Care Vault — $${addBump ? '12.98' : '7.99'}`}</span>
          </Button>
          <div className="flex items-center justify-center gap-2 mt-3 py-2 px-4 rounded-lg bg-emerald-50 border border-emerald-200/50">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <p className="text-xs font-bold text-emerald-700">
              Questions about a charge: hello@frenchyfab.com
            </p>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            One-time payment. The vault opens after Stripe confirms it. No subscription.
          </p>
          {recoveryMessage && (
            <p className="text-center text-xs text-muted-foreground mt-2">{recoveryMessage}</p>
          )}
        </motion.div>

        <form onSubmit={sendRecovery} className="flex gap-2">
          <input
            type="email"
            aria-label="Email used at checkout"
            value={recoveryEmail}
            onChange={(event) => setRecoveryEmail(event.target.value)}
            placeholder="Already paid? Checkout email"
            className="flex-1 h-11 rounded-xl border border-border bg-background px-3 text-sm"
          />
          <button type="submit" className="text-sm font-bold text-primary px-2">
            Resend link
          </button>
        </form>
        <button
          onClick={onSkip}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          No thanks, continue with free plan →
        </button>
      </div>
    </div>
  );
};

export default PremiumUpsell;
