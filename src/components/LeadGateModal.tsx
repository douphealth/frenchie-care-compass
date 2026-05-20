import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { Mail, Lock, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { submitLead } from '@/lib/revenueBackend';
import { saveProfile } from '@/lib/profileStore';
import { QuizAnswers } from '@/lib/quizData';
import { PlanSection } from '@/lib/planGenerator';

const schema = z.object({
  name: z.string().trim().min(1, 'Name required').max(80),
  email: z.string().trim().email('Valid email required').max(255),
  dogAge: z.string().trim().min(1, 'Dog age required').max(40),
});

type Props = {
  open: boolean;
  onClose: () => void;
  onUnlock: () => void;
  answers: QuizAnswers;
  plan: PlanSection[];
  initialEmail?: string;
  title?: string;
  cta?: string;
};

const LeadGateModal = ({ open, onClose, onUnlock, answers, plan, initialEmail = '', title, cta }: Props) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [dogAge, setDogAge] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ name, email, dogAge });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    setLoading(true);
    try {
      const normEmail = parsed.data.email.toLowerCase();
      localStorage.setItem('frenchie_email', normEmail);
      saveProfile({ email: normEmail, leadCaptured: true });
      try {
        await submitLead({
          email: normEmail,
          answers,
          plan,
          source: 'frenchie-care-compass-leadgate',
        });
      } catch { /* lead saved locally; backend will retry later */ }
      onUnlock();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={onClose}
          role="dialog"
        >
          <motion.div
            initial={{ y: 30, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 30, scale: 0.97 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-card border-2 border-border shadow-2xl p-6"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-4">
              <div className="inline-flex w-12 h-12 rounded-2xl premium-gradient items-center justify-center mb-2">
                <Mail className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-black font-display text-foreground">
                {title ?? 'Unlock Your Personalized Tools'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                One quick step — we'll save your plan and send your guide.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl"
                maxLength={80}
                required
              />
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl"
                maxLength={255}
                required
              />
              <Input
                placeholder="Dog's age (e.g. 3 years, 6 months)"
                value={dogAge}
                onChange={(e) => setDogAge(e.target.value)}
                className="h-11 rounded-xl"
                maxLength={40}
                required
              />

              {error && (
                <p className="text-xs text-destructive font-semibold">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl font-black premium-gradient text-primary-foreground"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : cta ?? 'Unlock & Continue'}
              </Button>

              <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <Lock className="w-3 h-3" /> No spam. Unsubscribe anytime.
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LeadGateModal;
