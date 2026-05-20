import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, BookOpen } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { heatRisk, HeatZone } from '@/lib/clinical';

const zoneColor: Record<HeatZone, string> = {
  safe: 'bg-success',
  caution: 'bg-warning',
  danger: 'bg-orange-500',
  emergency: 'bg-destructive',
};

const zoneLabel: Record<HeatZone, string> = {
  safe: 'Safe',
  caution: 'Caution',
  danger: 'Danger',
  emergency: 'Emergency',
};

type Props = { onZoneChange?: (z: HeatZone) => void };

const HeatStressMeter = ({ onZoneChange }: Props) => {
  const [tempF, setTempF] = useState(78);
  const risk = useMemo(() => heatRisk(tempF), [tempF]);
  useEffect(() => { onZoneChange?.(risk.zone); }, [risk.zone, onZoneChange]);

  // Map 50–100°F to 0–100% height
  const fillPct = Math.max(0, Math.min(100, ((tempF - 50) / 50) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border-2 border-primary/20 bg-card p-5 shadow-sm print-page"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Thermometer className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-black text-foreground font-display text-lg leading-tight">
            Heat-Stress Meter
          </h3>
          <p className="text-xs text-muted-foreground">Flat-faced breeds overheat fast</p>
        </div>
      </div>

      <div className="flex gap-4 items-stretch">
        {/* Thermometer */}
        <div className="relative w-12 shrink-0 flex flex-col items-center">
          <div className="relative flex-1 w-4 rounded-full bg-muted overflow-hidden border-2 border-border">
            {/* Zone bands */}
            <div className="absolute inset-x-0 bottom-0 h-[40%] bg-success/40" />
            <div className="absolute inset-x-0 bottom-[40%] h-[20%] bg-warning/40" />
            <div className="absolute inset-x-0 bottom-[60%] h-[10%] bg-orange-500/50" />
            <div className="absolute inset-x-0 bottom-[70%] h-[30%] bg-destructive/50" />
            {/* 80°F absolute limit marker */}
            <div className="absolute inset-x-0 bottom-[60%] h-0.5 bg-destructive" />
            {/* Mercury fill */}
            <motion.div
              className={`absolute inset-x-0 bottom-0 ${zoneColor[risk.zone]}`}
              animate={{ height: `${fillPct}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            />
          </div>
          <div className={`mt-2 w-8 h-8 rounded-full ${zoneColor[risk.zone]} border-2 border-card`} />
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold uppercase text-muted-foreground">Current temp</span>
            <span className="text-2xl font-black text-foreground">{tempF}°F</span>
          </div>
          <Slider value={[tempF]} onValueChange={(v) => setTempF(v[0])} min={50} max={100} step={1} />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>50°F</span><span>80°F limit</span><span>100°F</span>
          </div>

          <div className={`rounded-xl p-3 text-xs font-semibold border-2 ${
            risk.zone === 'safe' ? 'bg-success/15 text-success border-success/30'
            : risk.zone === 'caution' ? 'bg-warning/15 text-warning border-warning/40'
            : risk.zone === 'danger' ? 'bg-orange-500/15 text-orange-700 border-orange-400'
            : 'bg-destructive/15 text-destructive border-destructive/40'
          }`}>
            <div className="font-black uppercase tracking-wide text-[10px] mb-1">
              Zone: {zoneLabel[risk.zone]}
            </div>
            {risk.message}
          </div>
        </div>
      </div>

      <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-full">
        <BookOpen className="w-3 h-3" />
        {risk.citation}
      </div>
    </motion.div>
  );
};

export default HeatStressMeter;
