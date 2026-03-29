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
      { value: 'puppy', label: '🐶 Puppy', description: 'Under 1 year old', hint: 'Affects feeding frequency, vaccine schedule & joint support' },
      { value: 'adult', label: '🐕 Adult', description: '1 – 7 years old', hint: 'Affects calorie targets, exercise intensity & preventive care' },
      { value: 'senior', label: '🧓 Senior', description: '7+ years old', hint: 'Affects joint care, vet frequency & diet adjustments' },
    ],
  },
  {
    id: 'concern',
    question: "What's your biggest concern right now?",
    subtitle: "We'll prioritize this area in your care plan.",
    type: 'single' as const,
    options: [
      { value: 'skin', label: '🩹 Skin & Allergies', description: 'Itching, redness, rashes', hint: 'Changes grooming routine & ingredient watchlist' },
      { value: 'pulling', label: '🦮 Pulling on Walks', description: 'Leash reactivity', hint: 'Adds harness & training protocol' },
      { value: 'diet', label: '🥗 Diet & Weight', description: 'Food choices, portions', hint: 'Adjusts calorie targets & meal timing' },
      { value: 'breathing', label: '😮‍💨 Breathing', description: 'Snoring, exercise intolerance', hint: 'Flags BOAS risk & changes exercise limits' },
      { value: 'wellness', label: '💚 General Wellness', description: 'Preventive care', hint: 'Builds a balanced all-around routine' },
    ],
  },
  {
    id: 'weight',
    question: "What's your Frenchie's weight range?",
    subtitle: 'Helps determine portion sizes and exercise intensity.',
    type: 'single' as const,
    options: [
      { value: 'under20', label: '🪶 Under 20 lbs', description: 'Lighter build', hint: 'Adjusts feeding portions & supplement dosages' },
      { value: '20-28', label: '⚖️ 20–28 lbs', description: 'Average range', hint: 'Standard calorie & portion calculations' },
      { value: 'over28', label: '💪 Over 28 lbs', description: 'Heavier build', hint: 'May flag weight management recommendations' },
    ],
    hasSlider: true,
    sliderLabel: 'Body Condition Score',
    sliderMin: 1,
    sliderMax: 9,
    sliderDefault: 5,
  },
  {
    id: 'activityLevel',
    question: "How active is your Frenchie?",
    subtitle: "We'll match exercise recommendations accordingly.",
    type: 'single' as const,
    options: [
      { value: 'low', label: '🛋️ Couch Potato', description: 'Prefers lounging', hint: 'Lowers calorie targets & adds enrichment ideas' },
      { value: 'moderate', label: '🚶 Moderate', description: 'Daily walks, some play', hint: 'Standard exercise & heat precaution plan' },
      { value: 'active', label: '⚡ Active', description: 'Loves running and playing', hint: 'Increases calorie budget & adds recovery guidance' },
    ],
  },
  {
    id: 'environment',
    question: "Where does your Frenchie live?",
    subtitle: 'Select all that apply — affects seasonal and safety guidance.',
    type: 'multi' as const,
    options: [
      { value: 'apartment', label: '🏢 Apartment', description: 'Indoor living', hint: 'Adds indoor enrichment & noise management' },
      { value: 'house', label: '🏡 House with Yard', description: 'Outdoor access', hint: 'Adds yard safety & outdoor hazard checks' },
      { value: 'hot', label: '☀️ Hot Climate', description: 'Warm weather', hint: 'Flags overheating risk & adds cooling protocols' },
      { value: 'cold', label: '❄️ Cold Climate', description: 'Cold weather', hint: 'Adds cold-weather gear & exercise adjustments' },
    ],
  },
];
