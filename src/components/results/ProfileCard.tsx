import { motion } from 'framer-motion';
import { QuizAnswers } from '@/lib/quizData';
import { Dog, Target, Activity, MapPin } from 'lucide-react';

type Props = {
  answers: QuizAnswers;
};

const stageMap: Record<string, string> = { puppy: 'Puppy', adult: 'Adult', senior: 'Senior' };
const concernMap: Record<string, string> = {
  skin: 'Skin & Allergies', pulling: 'Leash Training', diet: 'Diet & Nutrition',
  breathing: 'Breathing Health', wellness: 'General Wellness',
};
const activityMap: Record<string, string> = { low: 'Low', moderate: 'Moderate', active: 'High' };
const envMap: Record<string, string> = {
  apartment: 'Apartment', house: 'House w/ Yard', hot: 'Hot Climate', cold: 'Cold Climate',
};

const ProfileCard = ({ answers }: Props) => {
  const items = [
    { icon: Dog, label: 'Life Stage', value: stageMap[answers.lifeStage] || '—' },
    { icon: Target, label: 'Primary Focus', value: concernMap[answers.concern] || '—' },
    { icon: Activity, label: 'Activity Level', value: activityMap[answers.activityLevel] || '—' },
    { icon: MapPin, label: 'Environment', value: answers.environment.map(e => envMap[e]).filter(Boolean).join(', ') || '—' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-card rounded-2xl p-5 border-2 border-secondary/20"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🐕</span>
        <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Your Frenchie Profile</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-muted/40 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Icon className="w-3.5 h-3.5 text-secondary" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
            </div>
            <span className="text-sm font-bold text-foreground">{value}</span>
          </div>
        ))}
      </div>
      {answers.bodyCondition !== 5 && (
        <div className="mt-2 bg-muted/40 rounded-xl px-3 py-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Body Condition Score</span>
          <span className="block text-sm font-bold text-foreground">{answers.bodyCondition}/9</span>
        </div>
      )}
    </motion.div>
  );
};

export default ProfileCard;
