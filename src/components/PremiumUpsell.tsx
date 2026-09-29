import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Crown, FileText, CheckCircle2, Download, Sparkles, Loader2, ShieldCheck, Zap, CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createCheckout, getCheckoutPricing } from '@/lib/revenueBackend';
import { QuizAnswers } from '@/lib/quizData';
import FeatureComparison from './FeatureComparison';

type Props = {
  answers: QuizAnswers;
  onSkip: () => void;
};

const vaultFeatures = [
  'Extended personalized care plan PDF',
  'Custom feeding chart and portion planner',
  'Printable grooming checklist',
  'Seasonal care calendar',
  'Vet-visit preparation sheets',
  'Emergency red-flag quick reference',
  'When-to-call-the-vet decision guide',
];

const PremiumUpsell = ({ answers, onSkip }: Props) => {
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState('$7.99');

  useEffect(() => {
    getCheckoutPricing().then((pricing) => setPrice(pricing.formatted)).catch(() => {
      // Keep the last-known display price; Stripe remains authoritative at Checkout.
    });
  }, []);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const email = localStorage.getItem('frenchie_email') || '';
      const checkoutUrl = await createCheckout({ email, answers });
      window.location.assign(checkoutUrl);
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Secure checkout is temporarily unavailable. Your free care plan is still available, and no payment was taken.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-5 py-8 max-w-lg mx-auto flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-3 mb-6"
      >
        <div className="inline-flex w-16 h-16 rounded-2xl gold-gradient items-center justify-center shadow-lg">
          <Crown className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-foreground font-display">
          Unlock the Frenchie Care Vault
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          A separate premium toolkit with printable, personalized reference pages that are not included in the free PDF.
        </p>
      </motion.div>

      <div className="flex items-center justify-center gap-3 mb-6">
        {[
          { icon: ShieldCheck, text: 'Stripe-verified' },
          { icon: Zap, text: 'Instant access' },
          { icon: CreditCard, text: 'One-time payment' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
            <Icon className="w-3.5 h-3.5 text-secondary" />
            {text}
          </div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative mx-auto mb-6 w-full max-w-xs"
      >
        <div className="aspect-[3/4] rounded-2xl premium-gradient p-[2px] shadow-2xl shadow-primary/20">
          <div className="w-full h-full rounded-2xl bg-card flex flex-col items-center justify-center gap-3 p-6">
            <FileText className="w-12 h-12 text-secondary" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Frenchie Care Vault</span>
            <div className="space-y-2 w-full">
              {[78, 91, 66, 84, 72].map((width) => (
                <div key={width} className="h-2 rounded-full bg-muted" style={{ width: width + '%' }} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">Personalized · Printable · Yours to keep</span>
          </div>
        </div>
        <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full gold-gradient flex items-center justify-center shadow-lg">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
      </motion.div>

      <div className="glass-card rounded-2xl p-5 mb-6 space-y-3">
        <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success" />
          Included in the paid Vault
        </h3>
        <ul className="space-y-2">
          {vaultFeatures.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-foreground/90">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-6">
        <h3 className="font-bold text-foreground text-sm mb-3">Free vs Frenchie Care Vault</h3>
        <FeatureComparison />
      </div>

      <div className="mt-auto space-y-3">
        <Button
          onClick={handleCheckout}
          disabled={loading}
          size="lg"
          className="w-full h-14 rounded-2xl text-sm font-black gap-2 gold-gradient text-premium-gold-foreground hover:opacity-90 shadow-xl shadow-premium-gold/20"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {loading ? 'Opening secure checkout...' : 'Unlock Frenchie Care Vault — ' + price}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Final price is shown and charged by Stripe. No subscription.
        </p>
        <button
          onClick={onSkip}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          Continue with my free plan
        </button>
      </div>
    </div>
  );
};

export default PremiumUpsell;
