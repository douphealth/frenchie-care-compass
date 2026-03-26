import { motion } from 'framer-motion';
import { PlanSection } from '@/lib/planGenerator';
import { ChevronRight, BookOpen, Utensils, Droplets, Activity, AlertTriangle, Pill, Home, Dog, Heart } from 'lucide-react';

type Props = {
  sections: PlanSection[];
  blurred?: boolean;
};

const sectionThemes = [
  { bg: 'bg-orange-50/80', border: 'border-orange-200/50', iconBg: 'from-orange-500 to-amber-500', tagColor: 'text-orange-700 bg-orange-100', Icon: Utensils },
  { bg: 'bg-rose-50/80', border: 'border-rose-200/50', iconBg: 'from-rose-500 to-pink-500', tagColor: 'text-rose-700 bg-rose-100', Icon: Droplets },
  { bg: 'bg-emerald-50/80', border: 'border-emerald-200/50', iconBg: 'from-emerald-500 to-teal-500', tagColor: 'text-emerald-700 bg-emerald-100', Icon: Activity },
  { bg: 'bg-red-50/80', border: 'border-red-200/50', iconBg: 'from-red-500 to-orange-500', tagColor: 'text-red-700 bg-red-100', Icon: AlertTriangle },
  { bg: 'bg-violet-50/80', border: 'border-violet-200/50', iconBg: 'from-violet-500 to-purple-500', tagColor: 'text-violet-700 bg-violet-100', Icon: Pill },
  { bg: 'bg-sky-50/80', border: 'border-sky-200/50', iconBg: 'from-sky-500 to-blue-500', tagColor: 'text-sky-700 bg-sky-100', Icon: Home },
  { bg: 'bg-amber-50/80', border: 'border-amber-200/50', iconBg: 'from-amber-500 to-yellow-500', tagColor: 'text-amber-700 bg-amber-100', Icon: Dog },
  { bg: 'bg-teal-50/80', border: 'border-teal-200/50', iconBg: 'from-teal-500 to-cyan-500', tagColor: 'text-teal-700 bg-teal-100', Icon: Heart },
];

const sectionSubtitles: Record<string, string> = {
  'Personalized Feeding Plan': 'Calorie targets, portions & nutrition tailored to your Frenchie',
  'Grooming & Skin Care Routine': 'Daily, weekly & monthly care protocols',
  'Grooming Routine': 'Daily, weekly & monthly care protocols',
  'Exercise & Mental Enrichment Plan': 'Safe activity guidelines for brachycephalic breeds',
  'Exercise Plan': 'Safe activity guidelines for brachycephalic breeds',
  'Health Screening & Prevention': 'Breed-specific screenings & warning signs',
  'Health Watch-Outs': 'Breed-specific screenings & warning signs',
  'Evidence-Based Supplement Protocol': 'Clinically-backed supplements with dosages',
  'Supplement Recommendations': 'Clinically-backed supplements with dosages',
  'Home Environment & Safety': 'Climate, housing & hazard management',
  'Environment & Safety': 'Climate, housing & hazard management',
  'Leash Training & Harness Protocol': 'Step-by-step techniques to stop pulling',
  'Leash Training & Harness Tips': 'Step-by-step techniques to stop pulling',
  'Preventive Wellness Checklist': 'Proactive steps for long-term health',
};

const PlanResults = ({ sections, blurred = false }: Props) => (
  <div className="space-y-5">
    {sections.map((section, i) => {
      const theme = sectionThemes[i % sectionThemes.length];
      const IconComponent = theme.Icon;
      const subtitle = sectionSubtitles[section.title] || 'Expert recommendations for your Frenchie';
      const isBlurred = blurred && i > 1;

      return (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
          className={`relative rounded-2xl border ${theme.border} ${theme.bg} overflow-hidden transition-all ${
            isBlurred ? 'blur-sm select-none pointer-events-none' : ''
          }`}
        >
          <div className="p-5 md:p-6">
            {/* Header */}
            <div className="flex items-start gap-3.5 mb-1">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${theme.iconBg} flex items-center justify-center shadow-md shrink-0`}>
                <IconComponent className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base md:text-lg font-black text-foreground font-display leading-tight">
                    {section.title}
                  </h3>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${theme.tagColor}`}>
                    Section {i + 1}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-4" />

            {/* Items */}
            <div className="space-y-2.5">
              {section.items.map((item, j) => {
                const isWarning = item.toLowerCase().includes('warning') || item.includes('Red flag') || item.includes('IMPORTANT') || item.includes('emergency');
                return (
                  <motion.div
                    key={j}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.08 + j * 0.03 }}
                    className={`flex items-start gap-3 text-sm leading-relaxed rounded-xl px-3.5 py-3 ${
                      isWarning
                        ? 'bg-red-100/80 border border-red-200/60 text-red-900'
                        : 'bg-white/60 border border-white/80 text-foreground/90'
                    }`}
                  >
                    <span className={`mt-0.5 shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black ${
                      isWarning
                        ? 'bg-red-200 text-red-700'
                        : `bg-gradient-to-br ${theme.iconBg} text-white`
                    }`}>
                      {isWarning ? '!' : j + 1}
                    </span>
                    <span className="flex-1 [&>strong]:font-bold">{item}</span>
                  </motion.div>
                );
              })}
            </div>

            {/* Article link */}
            {section.articleLink && !isBlurred && (
              <motion.a
                href={section.articleLink.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 + 0.4 }}
                className="group inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl bg-white/90 border border-border/60 shadow-sm text-sm font-bold text-secondary hover:text-primary hover:shadow-md transition-all"
              >
                <BookOpen className="w-4 h-4" />
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
