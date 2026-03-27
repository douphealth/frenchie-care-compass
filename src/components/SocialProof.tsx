import { motion } from 'framer-motion';
import { Star, Users, TrendingUp } from 'lucide-react';

const testimonials = [
  {
    name: 'Sarah M.',
    text: 'This plan completely changed how I care for my Frenchie. The feeding portions were spot on!',
    rating: 5,
  },
  {
    name: 'Jake R.',
    text: 'Finally, breed-specific advice that actually works. My vet was impressed with the supplement recommendations.',
    rating: 5,
  },
  {
    name: 'Lisa T.',
    text: 'The grooming schedule saved us so much time and our Frenchie\'s skin has never looked better.',
    rating: 5,
  },
];

const SocialProof = () => (
  <div className="space-y-4">
    {/* Stats bar */}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center gap-6 py-3"
    >
      <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
        <Users className="w-3.5 h-3.5 text-secondary" />
        <span>12,400+ plans created</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
        <span>4.9/5 avg rating</span>
      </div>
    </motion.div>

    {/* Testimonials */}
    <div className="grid gap-3">
      {testimonials.map((t, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + i * 0.1 }}
          className="glass-card rounded-xl p-4"
        >
          <div className="flex items-center gap-1 mb-1.5">
            {[...Array(t.rating)].map((_, j) => (
              <Star key={j} className="w-3 h-3 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed italic">"{t.text}"</p>
          <p className="text-xs font-bold text-muted-foreground mt-2">— {t.name}</p>
        </motion.div>
      ))}
    </div>
  </div>
);

export default SocialProof;
