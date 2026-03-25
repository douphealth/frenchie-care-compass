import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Mail, Lock, Users } from 'lucide-react';
import PlanResults from './PlanResults';
import { PlanSection } from '@/lib/planGenerator';

type Props = {
  plan: PlanSection[];
  email: string;
  setEmail: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

const EmailGate = ({ plan, email, setEmail, onSubmit }: Props) => (
  <div className="min-h-screen px-5 py-6 max-w-lg mx-auto">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="text-center space-y-2 mb-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.15 }}
      >
        <CheckCircle2 className="w-14 h-14 text-success mx-auto" />
      </motion.div>
      <h2 className="text-xl md:text-2xl font-black text-foreground font-display">
        Your Care Plan is Ready!
      </h2>
      <p className="text-sm text-muted-foreground">
        Here's a preview. Enter your email to unlock the full plan.
      </p>
    </motion.div>

    <PlanResults sections={plan} blurred />

    {/* Sticky email form */}
    <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-12 pb-6 -mx-5 px-5 mt-4">
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        onSubmit={onSubmit}
        className="glass-card rounded-2xl p-4 space-y-3"
      >
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 rounded-xl bg-background"
          />
          <Button type="submit" className="h-12 rounded-xl px-5 font-black gap-1.5 premium-gradient text-primary-foreground">
            <Mail className="w-4 h-4" />
            Unlock
          </Button>
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> No spam</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 10K+ owners</span>
        </div>
      </motion.form>
    </div>
  </div>
);

export default EmailGate;
