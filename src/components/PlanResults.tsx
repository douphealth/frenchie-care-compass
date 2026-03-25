import { PlanSection } from '@/lib/planGenerator';
import { ExternalLink } from 'lucide-react';

type Props = {
  sections: PlanSection[];
  blurred?: boolean;
};

const PlanResults = ({ sections, blurred = false }: Props) => (
  <div className="space-y-5">
    {sections.map((section, i) => (
      <div
        key={section.title}
        className={`rounded-xl border border-border bg-card p-5 shadow-sm transition-all ${
          blurred && i > 1 ? 'blur-sm select-none pointer-events-none' : ''
        }`}
      >
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-3">
          <span className="text-xl">{section.icon}</span>
          {section.title}
        </h3>
        <ul className="space-y-2">
          {section.items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-sm text-foreground/90">
              <span className="text-accent mt-0.5 shrink-0">•</span>
              {item}
            </li>
          ))}
        </ul>
        {section.articleLink && !blurred && (
          <a
            href={section.articleLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-secondary hover:underline"
          >
            📖 {section.articleLink.label}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    ))}
  </div>
);

export default PlanResults;
