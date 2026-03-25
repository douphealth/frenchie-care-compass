export type QuizAnswers = {
  lifeStage: string;
  weight: string;
  bodyCondition: number;
  concern: string;
  activityLevel: string;
  environment: string[];
};

export const quizSteps = [
  {
    id: 'lifeStage',
    question: "What's your Frenchie's life stage?",
    subtitle: 'This helps us tailor feeding and health recommendations.',
    type: 'single' as const,
    options: [
      { value: 'puppy', label: '🐶 Puppy', description: 'Under 1 year old' },
      { value: 'adult', label: '🐕 Adult', description: '1 – 7 years old' },
      { value: 'senior', label: '🧓 Senior', description: '7+ years old' },
    ],
  },
  {
    id: 'weight',
    question: "What's your Frenchie's weight range?",
    subtitle: 'Helps determine portion sizes and exercise intensity.',
    type: 'single' as const,
    options: [
      { value: 'under20', label: '🪶 Under 20 lbs', description: 'Lighter build' },
      { value: '20-28', label: '⚖️ 20–28 lbs', description: 'Average range' },
      { value: 'over28', label: '💪 Over 28 lbs', description: 'Heavier build' },
    ],
    hasSlider: true,
    sliderLabel: 'Body Condition Score',
    sliderMin: 1,
    sliderMax: 9,
    sliderDefault: 5,
  },
  {
    id: 'concern',
    question: "What's your biggest concern right now?",
    subtitle: "We'll prioritize this area in your care plan.",
    type: 'single' as const,
    options: [
      { value: 'skin', label: '🩹 Skin & Allergies', description: 'Itching, redness, rashes' },
      { value: 'pulling', label: '🦮 Pulling on Walks', description: 'Leash reactivity' },
      { value: 'diet', label: '🥗 Diet & Weight', description: 'Food choices, portions' },
      { value: 'breathing', label: '😮‍💨 Breathing', description: 'Snoring, exercise intolerance' },
      { value: 'wellness', label: '💚 General Wellness', description: 'Preventive care' },
    ],
  },
  {
    id: 'activityLevel',
    question: "How active is your Frenchie?",
    subtitle: "We'll match exercise recommendations accordingly.",
    type: 'single' as const,
    options: [
      { value: 'low', label: '🛋️ Couch Potato', description: 'Prefers lounging' },
      { value: 'moderate', label: '🚶 Moderate', description: 'Daily walks, some play' },
      { value: 'active', label: '⚡ Active', description: 'Loves running and playing' },
    ],
  },
  {
    id: 'environment',
    question: "Where does your Frenchie live?",
    subtitle: 'Select all that apply.',
    type: 'multi' as const,
    options: [
      { value: 'apartment', label: '🏢 Apartment', description: 'Indoor living' },
      { value: 'house', label: '🏡 House with Yard', description: 'Outdoor access' },
      { value: 'hot', label: '☀️ Hot Climate', description: 'Warm weather' },
      { value: 'cold', label: '❄️ Cold Climate', description: 'Cold weather' },
    ],
  },
];
