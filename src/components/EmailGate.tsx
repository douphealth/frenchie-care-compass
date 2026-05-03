import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Mail, Lock, Users, Sparkles } from 'lucide-react';
import PlanResults from './PlanResults';
import { PlanSection } from '@/lib/planGenerator';

type Props = {
  plan: PlanSection[];
  email: string;
  setEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

const EmailGate = ({ plan, email, setEmail, onSubmit }: Props) => (
  <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
    <div className="px-5 py-6 max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-3 mb-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.15 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200/60 shadow-lg"
        >
          <CheckCircle2 className="w-9 h-9 text-emerald-600" />
        </motion.div>
        <h2 className="text-2xl md:text-3xl font-black text-foreground font-display leading-tight">
          Your Care Plan is Ready!
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          We've generated a personalized plan just for your Frenchie. Enter your email to save it and reveal the full free plan.
        </p>
        <div className="flex items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
            <Sparkles className="w-3 h-3 text-amber-500" /> AI-Personalized
          </span>
        </div>
      </motion.div>

      <PlanResults sections={plan} blurred />

      {/* Sticky email form */}
      <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-12 pb-6 -mx-5 px-5 mt-4">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          onSubmit={onSubmit}
          className="glass-card rounded-2xl p-5 space-y-3 shadow-xl border-2 border-border/60"
        >
          <p className="text-center text-sm font-bold text-foreground">
            Save & reveal your free personalized care plan
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-xl bg-background text-base"
            />
            <Button type="submit" className="h-12 rounded-xl px-6 font-black gap-1.5 premium-gradient text-primary-foreground shadow-md">
              <Mail className="w-4 h-4" />
              Reveal
            </Button>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> No spam ever</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 10K+ Frenchie owners</span>
          </div>
        </motion.form>
      </div>
    </div>
  </div>
);

export default EmailGate;
