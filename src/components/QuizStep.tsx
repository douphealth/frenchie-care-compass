import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import {
  Check, Info, Baby, Dog, HeartPulse, ShieldAlert, Move, Utensils, Wind, Heart,
  Feather, Scale, TrendingUp, Sofa, Footprints, Zap, Building, Home, Sun, Snowflake,
} from 'lucide-react';

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  baby: Baby, dog: Dog, 'heart-pulse': HeartPulse, 'shield-alert': ShieldAlert,
  move: Move, utensils: Utensils, wind: Wind, heart: Heart, feather: Feather,
  scale: Scale, 'trending-up': TrendingUp, sofa: Sofa, footprints: Footprints,
  zap: Zap, building: Building, home: Home, sun: Sun, snowflake: Snowflake,
};

type Option = { value: string; label: string; description: string; hint?: string; icon?: string };

type Props = {
  question: string;
  subtitle: string;
  options: Option[];
  type: 'single' | 'multi';
  selected: string | string[];
  onSelect: (value: string | string[]) => void;
  hasSlider?: boolean;
  sliderLabel?: string;
  sliderMin?: number;
  sliderMax?: number;
  sliderValue?: number;
  onSliderChange?: (v: number) => void;
};

const bodyConditionLabels: Record<number, string> = {
  1: 'Emaciated', 2: 'Very Thin', 3: 'Thin', 4: 'Slightly Lean',
  5: 'Ideal', 6: 'Slightly Heavy', 7: 'Heavy', 8: 'Obese', 9: 'Severely Obese',
};

const QuizStep = ({
  question, subtitle, options, type, selected, onSelect,
  hasSlider, sliderLabel, sliderMin = 1, sliderMax = 9, sliderValue = 5, onSliderChange,
}: Props) => {
  const handleClick = (value: string) => {
    if (type === 'single') {
      onSelect(value);
    } else {
      const arr = Array.isArray(selected) ? selected : [];
      onSelect(arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]);
    }
  };

  const isSelected = (value: string) =>
    type === 'single' ? selected === value : (Array.isArray(selected) && selected.includes(value));

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="text-center space-y-2"
      >
        <h2 className="text-xl md:text-2xl font-bold text-foreground font-display">{question}</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">{subtitle}</p>
      </motion.div>

      <div className="grid gap-3">
        {options.map((opt, i) => {
          const active = isSelected(opt.value);
          const IconComp = opt.icon ? iconMap[opt.icon] : null;
          return (
            <motion.button
              key={opt.value}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleClick(opt.value)}
              className={cn(
                'relative flex items-center gap-4 p-4 md:p-5 rounded-2xl border-2 text-left transition-all duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                active
                  ? 'border-primary bg-primary/10 shadow-lg shadow-primary/15 ring-1 ring-primary/20'
                  : 'border-border bg-card hover:border-secondary/40 hover:shadow-md'
              )}
            >
              <div className={cn(
                'shrink-0 w-11 h-11 flex items-center justify-center rounded-xl transition-colors',
                active ? 'bg-primary/15 text-primary' : 'bg-muted/60 text-muted-foreground'
              )}>
                {IconComp ? <IconComp className="w-5 h-5" /> : <Dog className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-foreground text-sm md:text-base">{opt.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{opt.description}</div>
                {opt.hint && (
                  <div className="flex items-center gap-1 mt-1.5 text-[11px] text-secondary/80 font-semibold">
                    <Info className="w-3 h-3 shrink-0" />
                    <span>{opt.hint}</span>
                  </div>
                )}
              </div>
              <motion.div
                initial={false}
                animate={{ scale: active ? 1 : 0, opacity: active ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
              >
                <Check className="w-3.5 h-3.5 text-primary-foreground" />
              </motion.div>
            </motion.button>
          );
        })}
      </div>

      {hasSlider && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="glass-card rounded-2xl p-5 space-y-4"
        >
          <label className="text-sm font-bold text-foreground">{sliderLabel}</label>
          <Slider
            min={sliderMin}
            max={sliderMax}
            step={1}
            value={[sliderValue]}
            onValueChange={([v]) => onSliderChange?.(v)}
            className="py-2"
          />
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Too Thin</span>
            <span className="font-bold text-foreground text-sm px-3 py-1 rounded-full bg-primary/10">
              {sliderValue} — {bodyConditionLabels[sliderValue] || ''}
            </span>
            <span>Overweight</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default QuizStep;
