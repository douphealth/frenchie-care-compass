import { motion } from 'framer-motion';
import { Lock, Calendar, Utensils, AlertTriangle, Stethoscope, Thermometer, CheckCircle2 } from 'lucide-react';
import { QuizAnswers } from '@/lib/quizData';
import { buildPremiumModules } from '@/lib/premiumContent';

type Props = {
  onUpgrade: () => void;
  unlocked: boolean;
  answers: QuizAnswers;
};

const lockedItems = [
  { icon: Utensils, label: 'Daily routine & meal timing' },
  { icon: Calendar, label: 'Seasonal care calendar' },
  { icon: AlertTriangle, label: 'Emergency red-flag checklist' },
  { icon: Stethoscope, label: 'When to call the vet' },
  { icon: Thermometer, label: 'Heat and cold protocol' },
];

const LockedModules = ({ onUpgrade, unlocked, answers }: Props) => {
  const modules = unlocked ? buildPremiumModules(answers) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="mt-6"
    >
      {unlocked ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">
              Premium modules — unlocked
            </span>
          </div>
          {modules.map((module) => (
            <section
              key={module.id}
              className={`rounded-xl border p-4 ${module.urgent ? 'border-red-200 bg-red-50/50' : 'border-emerald-200/70 bg-emerald-50/40'}`}
            >
              <h3 className="text-sm font-black text-foreground mb-2">{module.title}</h3>
              <ul className="space-y-1.5">
                {module.items.map((item) => (
                  <li key={item} className="text-xs font-medium text-foreground/80 leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-black text-amber-700 uppercase tracking-wider">
              Premium modules — locked
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {lockedItems.map(({ icon: Icon, label }) => (
              <button
                key={label}
                type="button"
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
        </>
      )}
    </motion.div>
  );
};

export default LockedModules;
