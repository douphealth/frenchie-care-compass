import { motion } from 'framer-motion';
import { Flame, BookOpen } from 'lucide-react';
import { QuizAnswers } from '@/lib/quizData';
import { buildMER } from '@/lib/clinical';

const CalorieCard = ({ answers }: { answers: QuizAnswers }) => {
  const mer = buildMER(answers);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm print-page"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Flame className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-black text-foreground font-display text-lg leading-tight">
            Daily Calorie Target
          </h3>
          <p className="text-xs text-muted-foreground">Personalized MER calculation</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-xl bg-muted/40 p-3">
          <div className="text-2xl font-black text-primary">{mer.kcalPerDay}</div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold">kcal / day</div>
        </div>
        <div className="rounded-xl bg-muted/40 p-3">
          <div className="text-2xl font-black text-primary">{mer.cupsPerDay}</div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold">cups / day*</div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-1 mb-3">
        <p><span className="font-bold text-foreground">K-factor used:</span> {mer.k} ({mer.kLabel})</p>
        <p>{mer.kReason}</p>
        <p className="opacity-70">*Assumes 350 kcal/cup average kibble. Always cross-check your food's label.</p>
      </div>

      <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-full">
        <BookOpen className="w-3 h-3" />
        {mer.citation}
      </div>
    </motion.div>
  );
};

export default CalorieCard;
