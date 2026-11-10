import { motion } from 'framer-motion';
import { Lock, Calendar, Utensils, AlertTriangle, Stethoscope, Thermometer, CheckCircle2, Target } from 'lucide-react';
import { QuizAnswers } from '@/lib/quizData';
import { buildPremiumModules } from '@/lib/premiumContent';
import { buildFocusProgram } from '@/lib/focusProgram';

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
  const program = buildFocusProgram(answers);

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
          <section className="rounded-xl border border-amber-300 bg-amber-50/60 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-1">Your main focus</p>
            <h3 className="text-base font-black text-foreground">{program.title}</h3>
            <p className="text-xs text-foreground/80 mt-1 leading-relaxed">{program.goal}</p>
            <p className="text-xs text-foreground/80 mt-2 leading-relaxed"><strong>Track:</strong> {program.track}</p>
            <ol className="mt-3 space-y-3">
              {program.weeks.map((week) => (
                <li key={week.week} className="rounded-lg bg-white/70 border border-amber-200/70 p-3">
                  <p className="text-xs font-black text-foreground">Week {week.week}: {week.title}</p>
                  <ul className="mt-1.5 space-y-1 list-disc pl-4">
                    {week.actions.map((action) => (
                      <li key={action} className="text-xs text-foreground/80 leading-relaxed">{action}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50/70 p-3">
              <p className="text-xs font-black text-red-700">See a vet now if you notice</p>
              <ul className="mt-1 space-y-1 list-disc pl-4">
                {program.vetNow.map((sign) => (
                  <li key={sign} className="text-xs text-red-900/80">{sign}</li>
                ))}
              </ul>
            </div>
          </section>
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
          <button
            type="button"
            onClick={onUpgrade}
            className="w-full mb-2 flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 transition-all text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4 text-amber-700" />
            </div>
            <span className="text-xs leading-snug">
              <span className="block font-black text-foreground/80">{program.title}</span>
              <span className="block text-foreground/60">Week-by-week steps for your main concern: {program.weeks.map((w) => w.title.toLowerCase()).join(' → ')}</span>
            </span>
          </button>
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
