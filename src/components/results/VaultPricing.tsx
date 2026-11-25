import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Crown, Loader2 } from 'lucide-react';
import { createCheckout } from '@/lib/revenueBackend';
import { loadProfile } from '@/lib/profileStore';
import { QuizAnswers } from '@/lib/quizData';
import { VAULT_PRICE_USD, VAULT_PRODUCT_NAME } from '@/lib/stripeConfig';

type Props = {
  answers: QuizAnswers;
  /** Title of the 4-week program for the buyer's main concern. */
  programTitle: string;
  /** Opens the longer "what's inside" page with the optional add-on. */
  onDetails: () => void;
};

const FREE_ITEMS = [
  'This personalized care plan, on screen',
  'Calorie estimate and feeding basics',
  'Grooming, exercise and safety notes',
  'Free PDF and calendar file',
];

/** Everything listed here is built by premiumContent.ts, focusProgram.ts and the Vault pages in pdfGenerator.ts. */
const VAULT_ITEMS = [
  'Daily routine and meal timing',
  'Feeding chart and printable grooming and weekly checklists',
  'Seasonal care calendar and heat and cold protocol',
  'Vet visit prep sheet and a "when to call the vet" guide',
  'Emergency red-flag checklist (no medication doses)',
  'A longer Vault PDF to keep',
];

export const VAULT_CTA_LABEL = `Get the full Care Vault — $${VAULT_PRICE_USD}`;

const VaultPricing = ({ answers, programTitle, onDetails }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checkout = async () => {
    setLoading(true);
    setError('');
    try {
      // Only an email the visitor chose to give us is prefilled. Stripe asks for one at checkout anyway.
      const email = loadProfile().email || '';
      const { url } = await createCheckout({ email, addBump: false, answers });
      window.location.assign(url);
    } catch {
      setError('Checkout could not be opened. Nothing was charged. Please try again.');
      setLoading(false);
    }
  };

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="no-print mt-6 rounded-2xl border-2 border-warning/60 bg-gradient-to-br from-warning/10 via-warning/5 to-card p-5"
    >
      <h2 id="pricing-title" className="text-lg font-black text-foreground font-display text-center">
        Free plan or the full {VAULT_PRODUCT_NAME}
      </h2>
      <p className="text-xs text-muted-foreground text-center mt-1 mb-4">
        The free plan above is yours either way. The Vault adds the parts below.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Free</p>
          <p className="text-2xl font-black text-foreground mt-1">$0</p>
          <ul className="mt-3 space-y-1.5">
            {FREE_ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-foreground/80">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border-2 border-warning/70 bg-card p-4">
          <p className="text-xs font-black uppercase tracking-wider text-warning flex items-center gap-1">
            <Crown className="w-3.5 h-3.5" /> {VAULT_PRODUCT_NAME}
          </p>
          <p className="text-2xl font-black text-foreground mt-1">
            ${VAULT_PRICE_USD} <span className="text-xs font-bold text-muted-foreground">USD, one-time</span>
          </p>
          <ul className="mt-3 space-y-1.5">
            <li className="flex items-start gap-2 text-xs text-foreground/90 font-bold">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              Your {programTitle}, week by week
            </li>
            {VAULT_ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-foreground/80">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Button
        onClick={checkout}
        disabled={loading}
        className="mt-4 w-full h-12 rounded-xl font-black text-base gold-gradient text-premium-gold-foreground shadow-lg"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Opening Stripe checkout…' : VAULT_CTA_LABEL}
      </Button>
      {error && <p role="alert" className="text-center text-xs text-destructive mt-2">{error}</p>}
      <p className="text-center text-xs text-muted-foreground mt-2">
        Secure checkout on Stripe. One-time payment, no subscription. The Vault unlocks on this site after Stripe confirms the payment.
      </p>
      <p className="text-center text-[11px] text-muted-foreground mt-1">
        General education for French Bulldog owners, not veterinary advice.
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-bold">
        <button type="button" onClick={onDetails} className="text-primary underline">
          See everything inside
        </button>
        <a href="/payment-success?restore=1" className="text-muted-foreground underline">
          Already bought? Restore purchase
        </a>
      </div>
    </section>
  );
};

export default VaultPricing;
