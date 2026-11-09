import { QuizAnswers } from './quizData';
import { buildMER } from './clinical';

export type PremiumModule = {
  id: string;
  title: string;
  urgent?: boolean;
  items: string[];
};

const ASPCA_POISON = '(888) 426-4435';

export function buildPremiumModules(answers: QuizAnswers): PremiumModule[] {
  const mer = buildMER(answers);
  const meals = answers.lifeStage === 'puppy' ? 3 : 2;
  const perMeal = Math.round((mer.cupsPerDay / meals) * 4) / 4;
  const hot = answers.environment.includes('hot');
  const cold = answers.environment.includes('cold');

  return [
    {
      id: 'routine',
      title: 'Daily routine & meal timing',
      items: [
        `Estimated energy need: about ${mer.kcalPerDay} kcal/day, split into ${meals} meals (about ${perMeal} cups per meal if the food is 350 kcal/cup).`,
        'Check the calorie number on your bag and adjust with your veterinarian if your dog is gaining or losing weight.',
        'Morning: fresh water, meal, face-fold wipe, and a short walk while the pavement and air are cooler.',
        'Evening: second meal, ear and wrinkle check, and a calm wind-down. Puppies need a midday meal too.',
        mer.kReason,
      ],
    },
    {
      id: 'seasonal',
      title: 'Seasonal care calendar',
      items: [
        'Spring: book the wellness visit, restart parasite prevention if your vet recommends it, and watch for itching.',
        hot
          ? 'Summer: this profile includes a hot climate. Keep outings short, carry water, and skip strenuous play in the heat.'
          : 'Summer: French Bulldogs overheat easily. Walk early or late, carry water, and test pavement with your hand.',
        'Fall: recheck weight if activity drops, and keep a dental note for your next vet visit.',
        cold
          ? 'Winter: this profile includes a cold climate. Use a coat below about 45°F and wipe salt off the paws.'
          : 'Winter: use a coat in a hard chill, wipe paws after walks, and keep a draft-free bed.',
      ],
    },
    {
      id: 'emergency',
      title: 'Emergency red-flag checklist',
      urgent: true,
      items: [
        'Struggling to breathe, blue or purple gums, or collapse: go to an emergency clinic now.',
        'Heat distress (nonstop panting, vomiting, weakness): move to a cool room, wet the belly and paws with room-temperature water, and call a vet. Do not use ice water.',
        `Possible poisoning: note what was eaten and call ASPCA Animal Poison Control ${ASPCA_POISON} or a vet. Do not induce vomiting unless they tell you to.`,
        'Sudden inability to walk, or crying when picked up: limit movement and see an emergency vet. Do not give human pain medicine.',
        'Do not give human medications, including diphenhydramine, unless a veterinarian tells you the product and the dose for this dog.',
      ],
    },
    {
      id: 'vet-guide',
      title: 'When to call the vet',
      items: [
        answers.lifeStage === 'puppy'
          ? 'Puppies: call for vomiting that lasts more than a few hours, refusing food, or a red lump at the eye (possible cherry eye).'
          : answers.lifeStage === 'senior'
            ? 'Seniors: call sooner for coughing, new lumps, confusion, or a change in thirst or weight.'
            : 'Adults: call for appetite loss beyond a day, repeated vomiting, or a new limp.',
        answers.concern === 'breathing'
          ? 'Breathing was your main concern. Noisy breathing that is getting worse, fainting, or exercise collapse needs a vet, not a home score.'
          : 'Noisy breathing, fainting, or exercise collapse needs a veterinarian. This app cannot grade airway disease.',
        'Bring a food label photo, a weight trend, and a list of supplements to the visit.',
        'Use this guide to prepare questions. It does not replace an exam.',
      ],
    },
    {
      id: 'climate',
      title: 'Heat and cold protocol',
      items: [
        'There is no single outdoor temperature that is safe for every French Bulldog. Watch the dog, humidity, sun, and pavement.',
        'Around 70°F and up: shorter outings, water breaks, and stop if panting becomes loud or the dog lags.',
        'Around 80°F and up: avoid hard exercise. Cooling mats and shade help at home; they do not make a hot walk safe.',
        'Seek care the same day for heavy panting that does not settle indoors, wobbliness, vomiting, or gum color changes.',
      ],
    },
  ];
}
