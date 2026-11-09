import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

const UrgentVetBanner = ({ reason }: { reason: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    role="status"
    className="no-print mt-5 rounded-2xl border-2 border-destructive bg-destructive/10 p-4"
  >
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 shrink-0 rounded-xl bg-destructive flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-destructive-foreground" />
      </div>
      <div className="flex-1">
        <div className="text-[10px] font-black uppercase tracking-wider text-destructive mb-1">
          Contact a veterinarian
        </div>
        <p className="text-sm font-bold text-foreground mb-1">{reason}</p>
        <p className="text-xs text-foreground/80">
          This screen cannot examine your dog. If breathing is difficult, your dog collapses, or gum color changes, go to an emergency clinic. Do not wait on an app or give human medication.
        </p>
      </div>
    </div>
  </motion.div>
);

export default UrgentVetBanner;
