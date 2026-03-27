import { motion } from 'framer-motion';
import { Check, X, Crown } from 'lucide-react';

const features = [
  { name: 'Personalized care plan', free: true, premium: true },
  { name: 'Feeding recommendations', free: true, premium: true },
  { name: 'Grooming routine', free: true, premium: true },
  { name: 'Exercise guidelines', free: true, premium: true },
  { name: 'Custom feeding charts with portions', free: false, premium: true },
  { name: 'Printable grooming checklist', free: false, premium: true },
  { name: 'Seasonal care calendar', free: false, premium: true },
  { name: 'Vet visit prep sheets', free: false, premium: true },
  { name: 'Emergency first-aid guide', free: false, premium: true },
  { name: 'Beautifully designed 12-page PDF', free: false, premium: true },
  { name: 'Lifetime updates', free: false, premium: true },
];

const FeatureComparison = () => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="glass-card rounded-2xl overflow-hidden"
  >
    {/* Header */}
    <div className="grid grid-cols-3 text-center">
      <div className="p-3" />
      <div className="p-3 bg-muted/30">
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Free</p>
      </div>
      <div className="p-3 gold-gradient">
        <div className="flex items-center justify-center gap-1">
          <Crown className="w-3.5 h-3.5 text-premium-gold-foreground" />
          <p className="text-xs font-black uppercase tracking-wider text-premium-gold-foreground">Premium</p>
        </div>
      </div>
    </div>

    {/* Rows */}
    <div className="divide-y divide-border/50">
      {features.map((f, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.03 }}
          className="grid grid-cols-3 items-center"
        >
          <div className="px-4 py-2.5">
            <span className="text-xs font-semibold text-foreground/80">{f.name}</span>
          </div>
          <div className="flex justify-center py-2.5 bg-muted/10">
            {f.free ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <X className="w-4 h-4 text-muted-foreground/30" />
            )}
          </div>
          <div className="flex justify-center py-2.5 bg-amber-50/30">
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

export default FeatureComparison;
