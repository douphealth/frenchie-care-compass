import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Wind, BookOpen } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { boasScore, BreathingSound } from '@/lib/clinical';

const sounds: { value: BreathingSound; label: string }[] = [
  { value: 'quiet', label: 'Quiet' },
  { value: 'snoring', label: 'Snoring' },
  { value: 'raspy', label: 'Raspy' },
  { value: 'struggling', label: 'Struggling' },
];

const levelStyles = {
  low: 'bg-success/15 text-success border-success/30',
  moderate: 'bg-warning/15 text-warning border-warning/40',
  urgent: 'bg-destructive/15 text-destructive border-destructive/40',
};

type Props = {
  onLevelChange?: (level: 'low' | 'moderate' | 'urgent') => void;
};

const BoasScorecard = ({ onLevelChange }: Props) => {
  const [sound, setSound] = useState<BreathingSound>('snoring');
  const [tolerance, setTolerance] = useState(6);
  const [heatIntolerance, setHeatIntolerance] = useState(false);

  const result = useMemo(
    () => boasScore({ sound, exerciseTolerance: tolerance, heatIntolerance }),
    [sound, tolerance, heatIntolerance]
  );

  // bubble level up
  useEffect(() => { onLevelChange?.(result.level); }, [result.level, onLevelChange]);

  const levelLabel =
    result.level === 'urgent' ? 'Urgent Action Required'
    : result.level === 'moderate' ? 'Moderate Risk'
    : 'Low Risk';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm print-page"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Wind className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-black text-foreground font-display text-lg leading-tight">
            BOAS Breathing Scorecard
          </h3>
          <p className="text-xs text-muted-foreground">Interactive — map your dog's symptoms</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-foreground mb-2 block">Breathing sound at rest</label>
          <div className="grid grid-cols-4 gap-1.5">
            {sounds.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSound(s.value)}
                className={`px-2 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                  sound === s.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:border-primary/40'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-xs font-bold text-foreground">Exercise tolerance</label>
            <span className="text-xs font-bold text-primary">{tolerance}/10</span>
          </div>
          <Slider value={[tolerance]} onValueChange={(v) => setTolerance(v[0])} min={0} max={10} step={1} />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>Tires fast</span><span>Athletic</span>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={heatIntolerance}
            onChange={(e) => setHeatIntolerance(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-xs font-semibold text-foreground">Struggles in warm weather</span>
        </label>

        <div className={`rounded-xl border-2 p-3 ${levelStyles[result.level]}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-black text-sm uppercase tracking-wide">{levelLabel}</span>
            <span className="font-black text-xl">{result.score}</span>
          </div>
          {result.reasons.length > 0 && (
            <ul className="text-xs space-y-0.5 opacity-90">
              {result.reasons.map((r) => <li key={r}>• {r}</li>)}
            </ul>
          )}
        </div>

        <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-full">
          <BookOpen className="w-3 h-3" />
          {result.citation}
        </div>
      </div>
    </motion.div>
  );
};

export default BoasScorecard;
