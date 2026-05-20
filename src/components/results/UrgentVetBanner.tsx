import { motion } from 'framer-motion';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { TELEHEALTH_URL } from '@/lib/affiliateCatalog';

const UrgentVetBanner = ({ reason }: { reason: string }) => (
  <motion.a
    href={TELEHEALTH_URL}
    target="_blank"
    rel="noopener noreferrer sponsored"
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    className="no-print mt-5 block rounded-2xl border-2 border-destructive bg-gradient-to-br from-destructive/10 via-warning/10 to-destructive/10 p-4 shadow-md hover:shadow-lg transition-shadow"
  >
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 shrink-0 rounded-xl bg-destructive flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-destructive-foreground" />
      </div>
      <div className="flex-1">
        <div className="text-[10px] font-black uppercase tracking-wider text-destructive mb-1">
          Urgent action recommended
        </div>
        <p className="text-sm font-bold text-foreground mb-1">{reason}</p>
        <p className="text-xs text-foreground/80">
          Talk to a licensed online vet now — typically connected in under 5 minutes.
        </p>
      </div>
      <ExternalLink className="w-4 h-4 text-destructive shrink-0 mt-1" />
    </div>
  </motion.a>
);

export default UrgentVetBanner;
