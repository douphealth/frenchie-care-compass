import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { PawPrint, Clock, Shield, Sparkles, Utensils, Activity, Droplets, Heart, AlertTriangle } from 'lucide-react';
import frenchieHero from '@/assets/frenchie-hero.png';

type Props = {
  onStart: () => void;
};

const badges = [
  { icon: Clock, text: 'Under 2 min' },
  { icon: Shield, text: 'Breed-specific' },
  { icon: Sparkles, text: 'Tailored to your dog' },
];

const coverageItems = [
  { icon: Utensils, text: 'Feeding routine' },
  { icon: Activity, text: 'Exercise limits' },
  { icon: Droplets, text: 'Grooming cadence' },
  { icon: Heart, text: 'Skin & breathing care' },
  { icon: AlertTriangle, text: 'Risk watchouts' },
];

const audienceTags = ['Puppies', 'Adults', 'Seniors', 'First-time owners', 'Hot climates'];

const LandingHero = ({ onStart }: Props) => (
  <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 md:py-16">
    <div className="max-w-lg w-full text-center space-y-6">
      {/* Hero image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto w-36 h-36 md:w-48 md:h-48"
      >
        <div className="absolute inset-0 rounded-full bg-secondary/20 blur-2xl" />
        <motion.img
          src={frenchieHero}
          alt="French Bulldog illustration"
          className="relative w-full h-full object-contain drop-shadow-xl"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Authority badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-secondary bg-secondary/10 px-3 py-1.5 rounded-full border border-secondary/20">
          From the team behind FrenchyFab
        </span>
      </motion.div>

      {/* Copy */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="space-y-3"
      >
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-foreground leading-tight font-display">
          Get Your Frenchie's{' '}
          <span className="text-gradient">Personalized Care Plan</span>{' '}
          in Under 2 Minutes
        </h1>
        <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-md mx-auto">
          Build a breed-specific routine for feeding, exercise, skin care, heat safety, and health watchouts — based on your French Bulldog's age, lifestyle, and needs.
        </p>
      </motion.div>

      {/* What it covers */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="flex flex-wrap items-center justify-center gap-2"
      >
        {coverageItems.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-1.5 text-xs font-bold text-foreground/70 bg-muted/60 px-2.5 py-1.5 rounded-lg border border-border/50">
            <Icon className="w-3.5 h-3.5 text-secondary" />
            {text}
          </div>
        ))}
      </motion.div>

      {/* Badges */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="flex items-center justify-center gap-3 md:gap-4"
      >
        {badges.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground">
            <Icon className="w-3.5 h-3.5 text-secondary" />
            <span className="font-semibold">{text}</span>
          </div>
        ))}
      </motion.div>

      {/* Trust signals */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-center gap-2"
      >
        <p className="text-xs text-muted-foreground">
          <span className="font-bold text-foreground">Free to start</span> · Email saves your plan · Not a substitute for vet care
        </p>
      </motion.div>

      {/* Who it's for */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="flex flex-wrap items-center justify-center gap-1.5"
      >
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1">Built for:</span>
        {audienceTags.map(tag => (
          <span key={tag} className="text-[10px] font-bold text-muted-foreground/80 bg-muted/40 px-2 py-0.5 rounded-full">
            {tag}
          </span>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="space-y-2"
      >
        <Button
          onClick={onStart}
          size="lg"
          className="w-full max-w-sm mx-auto text-base font-black gap-2.5 h-14 rounded-2xl premium-gradient text-primary-foreground hover:opacity-90 transition-opacity shadow-xl shadow-primary/20"
        >
          <PawPrint className="w-5 h-5" />
          Get My Free Plan
        </Button>
        <p className="text-[10px] text-muted-foreground/60">
          One-time result · Personalized to your answers
        </p>
      </motion.div>

      {/* FrenchyFab link */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="text-[11px] text-muted-foreground"
      >
        More breed-specific guides & product picks at{' '}
        <a href="https://frenchyfab.com" target="_blank" rel="noopener noreferrer" className="font-bold text-secondary hover:underline">
          FrenchyFab.com
        </a>
      </motion.p>
    </div>
  </div>
);

export default LandingHero;
