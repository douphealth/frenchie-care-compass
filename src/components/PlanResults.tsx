import { motion } from 'framer-motion';
import { PlanSection } from '@/lib/planGenerator';
import { ExternalLink } from 'lucide-react';

type Props = {
  sections: PlanSection[];
  blurred?: boolean;
};

const PlanResults = ({ sections, blurred = false }: Props) => (
  <div className="space-y-4">
    {sections.map((section, i) => (
      <motion.div
        key={section.title}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
        className={`glass-card rounded-2xl p-5 md:p-6 transition-all ${
          blurred && i > 1 ? 'blur-sm select-none pointer-events-none' : ''
        }`}
      >
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2.5 mb-3 font-display">
          <span className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10">
            {section.icon}
          </span>
          {section.title}
        </h3>
        <ul className="space-y-2.5">
          {section.items.map((item, j) => (
            <li key={j} className="flex items-start gap-2.5 text-sm text-foreground/90 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        {section.articleLink && !blurred && (
          <a
            href={section.articleLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-secondary hover:text-primary transition-colors"
          >
            📖 {section.articleLink.label}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </motion.div>
    ))}
  </div>
);

export default PlanResults;
