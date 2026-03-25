import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { PawPrint, Clock, Shield, Sparkles } from 'lucide-react';
import frenchieHero from '@/assets/frenchie-hero.png';

type Props = {
  onStart: () => void;
};

const badges = [
  { icon: Clock, text: '60 seconds' },
  { icon: Shield, text: '100% free' },
  { icon: Sparkles, text: 'Personalized' },
];

const LandingHero = ({ onStart }: Props) => (
  <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 md:py-16">
    <div className="max-w-lg w-full text-center space-y-8">
      {/* Hero image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto w-44 h-44 md:w-56 md:h-56"
      >
        <div className="absolute inset-0 rounded-full bg-secondary/20 blur-2xl" />
        <motion.img
          src={frenchieHero}
          alt="Cute French Bulldog"
          className="relative w-full h-full object-contain drop-shadow-xl"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Copy */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="space-y-4"
      >
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-foreground leading-tight font-display">
          Your Frenchie's{' '}
          <span className="text-gradient">Personalized</span>{' '}
          Care Plan
        </h1>
        <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-md mx-auto">
          Answer 5 quick questions and get a tailored routine covering feeding, grooming, exercise, and health — built specifically for your French Bulldog.
        </p>
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

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Button
          onClick={onStart}
          size="lg"
          className="w-full max-w-sm mx-auto text-base font-black gap-2.5 h-14 rounded-2xl premium-gradient text-primary-foreground hover:opacity-90 transition-opacity shadow-xl shadow-primary/20"
        >
          <PawPrint className="w-5 h-5" />
          Start My Plan
        </Button>
      </motion.div>
    </div>
  </div>
);

export default LandingHero;
