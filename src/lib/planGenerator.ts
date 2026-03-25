import { QuizAnswers } from './quizData';

export type PlanSection = {
  icon: string;
  title: string;
  items: string[];
  articleLink?: { label: string; url: string };
};

export function generatePlan(answers: QuizAnswers): PlanSection[] {
  const sections: PlanSection[] = [];

  // Feeding Plan
  const feeding: PlanSection = {
    icon: '🍽️',
    title: 'Feeding Plan',
    items: [],
    articleLink: { label: 'Healthy Treats Guide', url: 'https://frenchyfab.com/french-bulldog-healthy-treats' },
  };
  if (answers.lifeStage === 'puppy') {
    feeding.items.push('Feed 3 times per day with high-quality puppy formula.');
    feeding.items.push('Choose a food with at least 22% protein for growth.');
    feeding.items.push('Avoid free-feeding — use measured portions.');
  } else if (answers.lifeStage === 'senior') {
    feeding.items.push('Feed 2 times per day with a senior-specific formula.');
    feeding.items.push('Look for joint-support ingredients like glucosamine.');
    feeding.items.push('Reduce calories slightly if activity has decreased.');
  } else {
    feeding.items.push('Feed 2 times per day with premium adult food.');
    feeding.items.push('Aim for 25–30 calories per pound of body weight.');
  }
  if (answers.weight === 'over28') {
    feeding.items.push('Monitor weight closely — consider a weight management formula.');
  }
  if (answers.bodyCondition > 6) {
    feeding.items.push('Your Frenchie may be overweight. Reduce treats and consider a vet check.');
  }
  if (answers.concern === 'diet') {
    feeding.items.push('Consider a limited-ingredient diet if sensitivities are suspected.');
    feeding.items.push('Keep a food diary to track reactions.');
  }
  sections.push(feeding);

  // Grooming Routine
  const grooming: PlanSection = {
    icon: '🧴',
    title: 'Grooming Routine',
    items: [],
    articleLink: { label: 'Complete Grooming Blueprint', url: 'https://frenchyfab.com/french-bulldog-grooming-blueprint/' },
  };
  grooming.items.push('Clean facial skin folds daily with a damp cloth or pet wipe.');
  grooming.items.push('Brush coat weekly to remove loose hair and distribute oils.');
  if (answers.concern === 'skin') {
    grooming.items.push('Use hypoallergenic, fragrance-free shampoo only.');
    grooming.items.push('Bathe every 2–3 weeks — over-bathing worsens skin issues.');
    grooming.items.push('Check for redness between toes and in ear canals weekly.');
  } else {
    grooming.items.push('Bathe once a month with a gentle dog shampoo.');
  }
  grooming.items.push('Trim nails every 2–3 weeks.');
  grooming.items.push('Brush teeth 3–4 times per week with enzymatic toothpaste.');
  sections.push(grooming);

  // Exercise Plan
  const exercise: PlanSection = {
    icon: '🏃',
    title: 'Exercise Plan',
    items: [],
  };
  if (answers.lifeStage === 'puppy') {
    exercise.items.push('5 minutes of exercise per month of age, twice daily.');
    exercise.items.push('Focus on play sessions rather than long walks.');
  } else if (answers.lifeStage === 'senior') {
    exercise.items.push('Two gentle 15-minute walks per day.');
    exercise.items.push('Add mental stimulation with puzzle toys and sniff walks.');
  } else {
    if (answers.activityLevel === 'low') {
      exercise.items.push('Two 15–20 minute walks per day at a relaxed pace.');
    } else if (answers.activityLevel === 'active') {
      exercise.items.push('Two 25–30 minute walks plus one active play session daily.');
    } else {
      exercise.items.push('Two 20–25 minute walks per day with moderate play.');
    }
  }
  if (answers.concern === 'breathing') {
    exercise.items.push('⚠️ Avoid intense exercise — watch for heavy panting and blue gums.');
    exercise.items.push('Walk during cooler parts of the day only.');
  }
  if (answers.environment.includes('hot')) {
    exercise.items.push('Walk early morning or after sunset to avoid overheating.');
    exercise.items.push('Always carry water and watch for heat stroke signs.');
  }
  if (answers.environment.includes('cold')) {
    exercise.items.push('Use a warm coat or sweater for walks below 45°F.');
    exercise.items.push('Wipe paws after walks to remove salt and ice chemicals.');
  }
  sections.push(exercise);

  // Health Watch-Outs
  const health: PlanSection = {
    icon: '⚠️',
    title: 'Health Watch-Outs',
    items: [],
  };
  health.items.push('Schedule vet checkups every 6 months for Frenchies.');
  if (answers.lifeStage === 'puppy') {
    health.items.push('Complete vaccination series and discuss spay/neuter timing.');
    health.items.push('Watch for signs of cherry eye or elongated soft palate.');
  } else if (answers.lifeStage === 'senior') {
    health.items.push('Get annual bloodwork and dental cleanings.');
    health.items.push('Monitor for arthritis — look for stiffness after rest.');
    health.items.push('Watch for cognitive changes (disorientation, schedule disruption).');
  }
  if (answers.concern === 'breathing') {
    health.items.push('Discuss BOAS assessment with your vet — surgery may help.');
    health.items.push('Use a harness instead of a collar to reduce airway pressure.');
  }
  if (answers.concern === 'skin') {
    health.items.push('Ask your vet about allergy testing if symptoms persist.');
    health.items.push('Consider Omega-3 fatty acid supplements for skin health.');
  }
  sections.push(health);

  // Supplements
  const supplements: PlanSection = {
    icon: '💊',
    title: 'Supplement Suggestions',
    items: [],
    articleLink: { label: 'Supplement Guide: Puppy to Senior', url: 'https://frenchyfab.com/essential-nutritional-supplements-french-bulldogs/' },
  };
  supplements.items.push('Probiotics to support digestion (common Frenchie weak spot).');
  if (answers.lifeStage === 'senior') {
    supplements.items.push('Glucosamine + Chondroitin for joint support.');
    supplements.items.push('Omega-3 fish oil for coat, skin, and cognitive health.');
  } else {
    supplements.items.push('Omega-3 fish oil for a healthy coat and skin.');
  }
  if (answers.concern === 'skin') {
    supplements.items.push('Quercetin (natural antihistamine) — ask your vet first.');
  }
  if (answers.concern === 'breathing') {
    supplements.items.push('Keep your Frenchie at a lean weight to reduce breathing stress.');
  }
  sections.push(supplements);

  // Walking & Harness (conditional)
  if (answers.concern === 'pulling') {
    const walking: PlanSection = {
      icon: '🦮',
      title: 'Walking & Harness Tips',
      items: [
        'Use a front-clip, no-pull harness — never a collar for pullers.',
        'Practice "stop and wait" — freeze when your Frenchie pulls, resume when slack.',
        'Reward heel position with treats during walks.',
        'Start with short 10-minute training walks before longer outings.',
        'Consistency is key — everyone in the household should follow the same rules.',
      ],
      articleLink: { label: 'Best Harness for Frenchies That Pull', url: 'https://frenchyfab.com/best-harness-for-french-bulldog-that-pulls/' },
    };
    sections.push(walking);
  }

  return sections;
}
