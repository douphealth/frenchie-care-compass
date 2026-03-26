import { motion } from 'framer-motion';
import { PlanSection } from '@/lib/planGenerator';
import { ExternalLink, ChevronRight } from 'lucide-react';

type Props = {
  sections: PlanSection[];
  blurred?: boolean;
};

const sectionColors = [
  { bg: 'bg-orange-50', border: 'border-orange-200/60', iconBg: 'bg-gradient-to-br from-orange-100 to-amber-100', accent: 'text-orange-700' },
  { bg: 'bg-rose-50', border: 'border-rose-200/60', iconBg: 'bg-gradient-to-br from-rose-100 to-pink-100', accent: 'text-rose-700' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200/60', iconBg: 'bg-gradient-to-br from-emerald-100 to-teal-100', accent: 'text-emerald-700' },
  { bg: 'bg-amber-50', border: 'border-amber-200/60', iconBg: 'bg-gradient-to-br from-amber-100 to-yellow-100', accent: 'text-amber-700' },
  { bg: 'bg-violet-50', border: 'border-violet-200/60', iconBg: 'bg-gradient-to-br from-violet-100 to-purple-100', accent: 'text-violet-700' },
  { bg: 'bg-sky-50', border: 'border-sky-200/60', iconBg: 'bg-gradient-to-br from-sky-100 to-blue-100', accent: 'text-sky-700' },
  { bg: 'bg-teal-50', border: 'border-teal-200/60', iconBg: 'bg-gradient-to-br from-teal-100 to-cyan-100', accent: 'text-teal-700' },
];

const PlanResults = ({ sections, blurred = false }: Props) => (
  <div className="space-y-5">
    {sections.map((section, i) => {
      const color = sectionColors[i % sectionColors.length];
      return (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
          className={`relative rounded-2xl border ${color.border} ${color.bg} overflow-hidden transition-all ${
            blurred && i > 1 ? 'blur-sm select-none pointer-events-none' : ''
          }`}
        >
          {/* Top accent bar */}
          <div className={`h-1 w-full premium-gradient opacity-60`} />
          
          <div className="p-5 md:p-6">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl ${color.iconBg} flex items-center justify-center text-2xl shadow-sm border border-white/60`}>
                {section.icon}
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground font-display leading-tight">
                  {section.title}
                </h3>
                <p className={`text-xs font-semibold ${color.accent} uppercase tracking-wider mt-0.5`}>
                  {i === 0 ? 'Nutrition' : i === 1 ? 'Care Routine' : i === 2 ? 'Activity' : i === 3 ? 'Prevention' : i === 4 ? 'Wellness' : i === 5 ? 'Home Safety' : 'Expert Tips'}
                </p>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              {section.items.map((item, j) => {
                const isWarning = item.includes('WARNING') || item.includes('⚠️');
                return (
                  <motion.div
                    key={j}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.1 + j * 0.04 }}
                    className={`flex items-start gap-3 text-sm leading-relaxed rounded-xl p-3 ${
                      isWarning
                        ? 'bg-red-50 border border-red-200/50 text-red-800'
                        : 'bg-white/70 border border-white/80 text-foreground/85'
                    }`}
                  >
                    <span className={`mt-1 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      isWarning ? 'bg-red-200 text-red-700' : `${color.iconBg} ${color.accent}`
                    }`}>
                      {isWarning ? '!' : j + 1}
                    </span>
                    <span className="flex-1">{item.replace(/⚠️\s*/g, '')}</span>
                  </motion.div>
                );
              })}
            </div>

            {/* Article link */}
            {section.articleLink && !blurred && (
              <motion.a
                href={section.articleLink.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 + 0.3 }}
                className={`group inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl bg-white/80 border border-white shadow-sm text-sm font-bold ${color.accent} hover:shadow-md transition-all`}
              >
                <span>📖</span>
                {section.articleLink.label}
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </motion.a>
            )}
          </div>
        </motion.div>
      );
    })}
  </div>
);

export default PlanResults;
