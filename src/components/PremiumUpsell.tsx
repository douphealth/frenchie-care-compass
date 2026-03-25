import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Crown, FileText, CheckCircle2, Star, Download, Sparkles } from 'lucide-react';

type Props = {
  onSkip: () => void;
};

const features = [
  'Beautifully designed 12-page PDF care guide',
  'Custom feeding charts with exact portions',
  'Printable weekly grooming checklist',
  'Seasonal care calendar for your Frenchie',
  'Vet visit prep sheet with breed-specific questions',
  'Lifetime updates as your Frenchie grows',
];

const PremiumUpsell = ({ onSkip }: Props) => {
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
          Upgrade to Premium
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
          Get a stunning, printable PDF care guide personalized for your Frenchie — yours forever.
        </p>
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
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">PDF Preview</span>
            <div className="space-y-2 w-full">
              {[75, 90, 60, 85, 70].map((w, i) => (
                <div key={i} className="h-2 rounded-full bg-muted" style={{ width: `${w}%` }} />
              ))}
            </div>
            <div className="flex gap-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-premium-gold text-premium-gold" />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">12 Pages · Personalized</span>
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
          What's included
        </h3>
        <ul className="space-y-2.5">
          {features.map((f, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.35 + i * 0.06 }}
              className="flex items-start gap-2.5 text-sm text-foreground/90"
            >
              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
              {f}
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* CTA */}
      <div className="mt-auto space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Button
            onClick={() => {
              // Placeholder — Stripe integration will be added with Lovable Cloud
              alert('Stripe payment coming soon! Enable Lovable Cloud to activate $7.99 checkout.');
            }}
            size="lg"
            className="w-full h-14 rounded-2xl text-base font-black gap-2 gold-gradient text-premium-gold-foreground hover:opacity-90 transition-opacity shadow-xl shadow-premium-gold/20"
          >
            <Download className="w-5 h-5" />
            Get Premium PDF — $7.99
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            One-time payment · Instant download · No subscription
          </p>
        </motion.div>

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
