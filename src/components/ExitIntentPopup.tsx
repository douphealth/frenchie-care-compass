import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Gift, ArrowRight } from 'lucide-react';

type Props = {
  onStartQuiz: () => void;
};

const ExitIntentPopup = ({ onStartQuiz }: Props) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('exit_intent_dismissed');
    if (dismissed) return;

    const handler = (e: MouseEvent) => {
      if (e.clientY < 10) {
        setShow(true);
        document.removeEventListener('mouseleave', handler);
      }
    };

    // Also trigger after 45 seconds of inactivity
    const timer = setTimeout(() => {
      if (!sessionStorage.getItem('exit_intent_dismissed')) {
        setShow(true);
      }
    }, 45000);

    document.addEventListener('mouseleave', handler);
    return () => {
      document.removeEventListener('mouseleave', handler);
      clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem('exit_intent_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl overflow-hidden bg-card border-2 border-border shadow-2xl"
          >
            {/* Header */}
            <div className="premium-gradient px-6 pt-8 pb-6 text-center">
              <button onClick={dismiss} className="absolute top-3 right-3 text-primary-foreground/70 hover:text-primary-foreground">
                <X className="w-5 h-5" />
              </button>
              <motion.div
                animate={{ rotate: [0, -10, 10, -5, 0] }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Gift className="w-12 h-12 text-primary-foreground mx-auto mb-3" />
              </motion.div>
              <h3 className="text-xl font-black text-primary-foreground font-display">
                Wait! Don't Miss Out
              </h3>
              <p className="text-sm text-primary-foreground/80 mt-1">
                Your Frenchie deserves the best care
              </p>
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-4">
              <p className="text-sm text-foreground/80 text-center leading-relaxed">
                Get your <span className="font-bold text-foreground">free personalized care plan</span> in just 60 seconds — 
                covering feeding, grooming, exercise & health tailored to your French Bulldog.
              </p>

              <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">✅ 100% Free</span>
                <span className="flex items-center gap-1">⚡ 60 Seconds</span>
                <span className="flex items-center gap-1">🐾 AI-Powered</span>
              </div>

              <Button
                onClick={() => { dismiss(); onStartQuiz(); }}
                className="w-full h-13 rounded-2xl font-black text-base gap-2 premium-gradient text-primary-foreground hover:opacity-90 transition-opacity shadow-lg"
              >
                Get My Free Plan
                <ArrowRight className="w-4 h-4" />
              </Button>

              <button onClick={dismiss} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
                No thanks, I'll figure it out myself
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExitIntentPopup;
