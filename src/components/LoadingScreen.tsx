import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const tips = [
  'Analyzing your Frenchie\'s profile...',
  'Generating personalized recommendations...',
  'Consulting veterinary guidelines...',
  'Building your custom care plan...',
];

const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center px-5">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-8 max-w-sm"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        className="mx-auto w-16 h-16 rounded-2xl premium-gradient flex items-center justify-center shadow-xl"
      >
        <Sparkles className="w-8 h-8 text-primary-foreground" />
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-xl font-black text-foreground font-display">
          Creating Your AI Care Plan
        </h2>
        <p className="text-sm text-muted-foreground">
          Powered by veterinary science & AI personalization
        </p>
      </div>

      <div className="space-y-3">
        {tips.map((tip, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.8, duration: 0.4 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ delay: i * 0.8 + 0.2, duration: 0.6 }}
              className="w-2 h-2 rounded-full bg-secondary shrink-0"
            />
            {tip}
          </motion.div>
        ))}
      </div>
    </motion.div>
  </div>
);

export default LoadingScreen;
