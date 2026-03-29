import { motion } from 'framer-motion';
import { Lock, Calendar, Utensils, AlertTriangle, Stethoscope, ShoppingBag, Thermometer } from 'lucide-react';

type Props = {
  onUpgrade: () => void;
};

const lockedItems = [
  { icon: Utensils, label: 'Full Daily Routine & Meal Plan' },
  { icon: Calendar, label: 'Seasonal Care Calendar' },
  { icon: AlertTriangle, label: 'Emergency Red-Flag Checklist' },
  { icon: Stethoscope, label: '"When to Call the Vet" Guide' },
  { icon: ShoppingBag, label: 'Product Recommendations' },
  { icon: Thermometer, label: 'Heat/Cold Safety Protocol' },
];

const LockedModules = ({ onUpgrade }: Props) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.45 }}
    className="mt-6"
  >
    <div className="flex items-center gap-2 mb-3">
      <Lock className="w-4 h-4 text-amber-500" />
      <span className="text-xs font-black text-amber-700 uppercase tracking-wider">
        Premium Modules — Locked
      </span>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {lockedItems.map(({ icon: Icon, label }) => (
        <button
          key={label}
          onClick={onUpgrade}
          className="group flex items-center gap-2.5 p-3 rounded-xl border-2 border-dashed border-amber-200/60 bg-amber-50/30 hover:border-amber-300 hover:bg-amber-50/60 transition-all text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-xs font-bold text-foreground/60 group-hover:text-foreground/80 transition-colors leading-tight">
            {label}
          </span>
        </button>
      ))}
    </div>
  </motion.div>
);

export default LockedModules;
