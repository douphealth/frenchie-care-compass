import { motion } from 'framer-motion';
import { ExternalLink, ShoppingBag, AlertTriangle } from 'lucide-react';
import { QuizAnswers } from '@/lib/quizData';
import { pickProducts } from '@/lib/affiliateCatalog';

const AffiliateGrid = ({ answers }: { answers: QuizAnswers }) => {
  const products = pickProducts(answers);

  return (
    <div className="mt-6 no-print">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingBag className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
          Picked for Your Frenchie
        </h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Curated based on your quiz answers. Affiliate links — we may earn a small commission at no cost to you.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {products.map((p, i) => (
          <motion.a
            key={p.id}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`group rounded-xl border-2 p-4 bg-card hover:shadow-md transition-all ${
              p.warning ? 'border-destructive/50 bg-destructive/5' : 'border-border hover:border-primary/40'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                p.warning ? 'bg-destructive/15' : 'bg-muted'
              }`}>
                {p.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 ${
                  p.warning ? 'bg-destructive text-destructive-foreground' : 'bg-primary/10 text-primary'
                }`}>
                  {p.warning && <AlertTriangle className="w-2.5 h-2.5" />}
                  {p.badge}
                </div>
                <div className="font-bold text-sm text-foreground leading-tight mb-1 flex items-center gap-1">
                  {p.title}
                  <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{p.why}</p>
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
};

export default AffiliateGrid;
