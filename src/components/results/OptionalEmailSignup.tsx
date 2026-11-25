import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail } from 'lucide-react';
import { submitLead } from '@/lib/revenueBackend';
import { saveProfile } from '@/lib/profileStore';
import { isValidEmail, normalizeEmail } from '@/lib/quizValidation';
import { QuizAnswers } from '@/lib/quizData';
import { PlanSection } from '@/lib/planGenerator';

type Props = {
  answers: QuizAnswers;
  plan: PlanSection[];
};

const PRIVACY_URL = 'https://frenchyfab.com/privacy-policy/';

/**
 * Optional mailing-list sign-up. Nothing on this site needs an email: the plan, the free PDF
 * and the calendar file work without one, and Stripe collects the receipt email at checkout.
 * The worker adds the address to the Brevo list "Frenchie Care Plan Leads", so we ask for
 * explicit, unticked-by-default consent and say what the email is for.
 */
const OptionalEmailSignup = ({ answers, plan }: Props) => {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setMessage('Enter a valid email address.');
      return;
    }
    if (!consent) {
      setMessage('Tick the box to agree to FrenchyFab emails, or skip this. Your plan works without it.');
      return;
    }
    const normalized = normalizeEmail(email);
    setState('sending');
    setMessage('');
    try {
      await submitLead({ email: normalized, answers, plan, source: 'frenchie-care-plan-app' });
      saveProfile({ email: normalized, leadCaptured: true });
      setState('done');
      setMessage('You are signed up. Every email has an unsubscribe link.');
    } catch {
      setState('failed');
      setMessage('We could not save your email just now. Nothing else is affected; your plan stays on this device.');
    }
  };

  return (
    <section aria-labelledby="optional-email-title" className="no-print mt-6 rounded-2xl border border-border bg-card p-5">
      <h2 id="optional-email-title" className="text-sm font-black text-foreground flex items-center gap-2">
        <Mail className="w-4 h-4 text-primary" />
        Frenchie care emails <span className="font-semibold text-muted-foreground">(optional)</span>
      </h2>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
        You do not need an email for anything on this page. If you sign up, FrenchyFab saves this email with your
        quiz answers and adds it to our Frenchie care mailing list (sent through Brevo) to send you French Bulldog
        care emails. You can unsubscribe from any email.{' '}
        <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="underline">Privacy policy</a>
      </p>
      {state === 'done' ? (
        <p role="status" className="mt-3 text-xs font-bold text-emerald-700">{message}</p>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-2" noValidate>
          <Input
            type="email"
            aria-label="Email address (optional)"
            autoComplete="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl bg-background text-base"
          />
          <label className="flex items-start gap-2 text-xs text-foreground/80 leading-snug">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            I agree to receive French Bulldog care emails from FrenchyFab. I can unsubscribe at any time.
          </label>
          <Button type="submit" variant="outline" disabled={state === 'sending'} className="w-full h-11 rounded-xl font-bold">
            {state === 'sending' ? 'Saving…' : 'Sign me up'}
          </Button>
          {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
        </form>
      )}
    </section>
  );
};

export default OptionalEmailSignup;
