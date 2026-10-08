import { BookOpen, ShieldCheck } from 'lucide-react';

/**
 * Trust information must describe verifiable practices.
 * Do not display fabricated testimonials, star ratings or usage counts.
 */
const SocialProof = () => (
  <div className="rounded-xl border border-border bg-card p-4 space-y-2">
    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
      <ShieldCheck className="w-4 h-4 text-primary" />
      What to expect from this guide
    </h3>
    <p className="text-xs leading-relaxed text-muted-foreground">
      Care suggestions are generated from your answers for general education.
      They are not a diagnosis, a veterinary prescription or proof that a particular product will help your dog.
      Review feeding and health changes with your veterinarian.
    </p>
    <a
      href="https://frenchyfab.com/editorial-policy/"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline"
    >
      <BookOpen className="w-3.5 h-3.5" />
      Read our editorial policy
    </a>
  </div>
);

export default SocialProof;
