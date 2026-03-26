import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, PartyPopper } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PaymentSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen px-5 py-12 max-w-lg mx-auto flex flex-col items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-6"
      >
        <CheckCircle2 className="w-10 h-10 text-success" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h1 className="text-2xl md:text-3xl font-black text-foreground font-display flex items-center justify-center gap-2">
          <PartyPopper className="w-7 h-7 text-premium-gold" />
          Payment Successful!
        </h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          Thank you for your purchase! Your premium Frenchie Care Guide PDF will be sent to your email shortly.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8 space-y-3 w-full max-w-xs"
      >
        <Button
          onClick={() => navigate('/')}
          size="lg"
          className="w-full h-12 rounded-xl font-bold gap-2"
        >
          <Download className="w-4 h-4" />
          Back to Care Plan
        </Button>
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
