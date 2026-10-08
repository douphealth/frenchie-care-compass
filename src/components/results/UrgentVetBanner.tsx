import { motion } from 'framer-motion';
import { AlertTriangle, ExternalLink } from 'lucide-react';

/** Emergency notices must never route first to a commercial or affiliate checkout. */
const UrgentVetBanner = ({ reason }: { reason: string }) => (
  <motion.div
    role="alert"
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    className="no-print mt-5 block rounded-2xl border-2 border-destructive bg-destructive/10 p-4 shadow-md"
  >
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 shrink-0 rounded-xl bg-destructive flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-destructive-foreground" />
      </div>
      <div className="flex-1">
        <h2 className="text-sm font-black text-destructive mb-1">Seek emergency veterinary care now</h2>
        <p className="text-sm font-bold text-foreground mb-2">{reason}</p>
        <p className="text-xs text-foreground/80 mb-2">
          Trouble breathing, collapse, or blue or gray gums can be emergencies.
          Contact your nearest emergency veterinary hospital immediately. Do not delay care for an online consultation.
        </p>
        <a
          href="https://avma.org/resources/pet-owners/petcare/warm-weather-pet-safety"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-primary underline inline-flex items-center gap-1"
        >
          AVMA warm-weather safety guidance <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  </motion.div>
);

export default UrgentVetBanner;
