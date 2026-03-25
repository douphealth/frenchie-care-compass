import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

type Option = { value: string; label: string; description: string };

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

  const bodyConditionLabels: Record<number, string> = {
    1: 'Emaciated', 2: 'Very Thin', 3: 'Thin', 4: 'Slightly Lean',
    5: 'Ideal', 6: 'Slightly Heavy', 7: 'Heavy', 8: 'Obese', 9: 'Severely Obese',
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">{question}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleClick(opt.value)}
            className={cn(
              'flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all',
              'hover:border-accent hover:shadow-md',
              isSelected(opt.value)
                ? 'border-primary bg-primary/10 shadow-md'
                : 'border-border bg-card'
            )}
          >
            <span className="text-2xl">{opt.label.split(' ')[0]}</span>
            <div>
              <div className="font-semibold text-foreground">{opt.label.split(' ').slice(1).join(' ')}</div>
              <div className="text-xs text-muted-foreground">{opt.description}</div>
            </div>
          </button>
        ))}
      </div>

      {hasSlider && (
        <div className="space-y-3 pt-2">
          <label className="text-sm font-semibold text-foreground">{sliderLabel}</label>
          <Slider
            min={sliderMin}
            max={sliderMax}
            step={1}
            value={[sliderValue]}
            onValueChange={([v]) => onSliderChange?.(v)}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Too Thin</span>
            <span className="font-semibold text-foreground">
              {sliderValue} — {bodyConditionLabels[sliderValue] || ''}
            </span>
            <span>Overweight</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizStep;
