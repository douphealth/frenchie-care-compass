import { Check, X, Crown } from 'lucide-react';

const features = [
  { name: 'Personalized care dashboard', free: true, premium: true },
  { name: 'Core feeding guidance', free: true, premium: true },
  { name: 'Core grooming guidance', free: true, premium: true },
  { name: 'Core exercise guidance', free: true, premium: true },
  { name: 'Concise free PDF summary', free: true, premium: true },
  { name: 'Custom feeding chart & portions', free: false, premium: true },
  { name: 'Printable grooming checklist', free: false, premium: true },
  { name: 'Seasonal care calendar', free: false, premium: true },
  { name: 'Vet-visit prep sheets', free: false, premium: true },
  { name: 'Emergency red-flag reference', free: false, premium: true },
  { name: 'Extended premium PDF', free: false, premium: true },
];

const FeatureComparison = () => (
  <div className="glass-card rounded-2xl overflow-hidden">
    <div className="grid grid-cols-3 text-center">
      <div className="p-3" />
      <div className="p-3 bg-muted/30">
        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Free</p>
      </div>
      <div className="p-3 gold-gradient">
        <div className="flex items-center justify-center gap-1">
          <Crown className="w-3.5 h-3.5 text-premium-gold-foreground" />
          <p className="text-xs font-black uppercase tracking-wider text-premium-gold-foreground">Vault</p>
        </div>
      </div>
    </div>
    <div className="divide-y divide-border/50">
      {features.map((feature) => (
        <div key={feature.name} className="grid grid-cols-3 items-center">
          <div className="px-4 py-2.5">
            <span className="text-xs font-semibold text-foreground/80">{feature.name}</span>
          </div>
          <div className="flex justify-center py-2.5 bg-muted/10">
            {feature.free ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-muted-foreground/30" />}
          </div>
          <div className="flex justify-center py-2.5 bg-amber-50/30">
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default FeatureComparison;
