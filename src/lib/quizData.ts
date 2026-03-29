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
      { value: 'puppy', label: 'Puppy', description: 'Under 1 year old', hint: 'Affects feeding frequency, vaccine schedule & joint support', icon: 'baby' },
      { value: 'adult', label: 'Adult', description: '1 – 7 years old', hint: 'Affects calorie targets, exercise intensity & preventive care', icon: 'dog' },
      { value: 'senior', label: 'Senior', description: '7+ years old', hint: 'Affects joint care, vet frequency & diet adjustments', icon: 'heart-pulse' },
    ],
  },
  {
    id: 'concern',
    question: "What's your biggest concern right now?",
    subtitle: "We'll prioritize this area in your care plan.",
    type: 'single' as const,
    options: [
      { value: 'skin', label: 'Skin & Allergies', description: 'Itching, redness, rashes', hint: 'Changes grooming routine & ingredient watchlist', icon: 'shield-alert' },
      { value: 'pulling', label: 'Leash Training', description: 'Pulling, reactivity on walks', hint: 'Adds harness & training protocol', icon: 'move' },
      { value: 'diet', label: 'Diet & Weight', description: 'Food choices, portions', hint: 'Adjusts calorie targets & meal timing', icon: 'utensils' },
      { value: 'breathing', label: 'Breathing', description: 'Snoring, exercise intolerance', hint: 'Flags BOAS risk & changes exercise limits', icon: 'wind' },
      { value: 'wellness', label: 'General Wellness', description: 'Preventive care', hint: 'Builds a balanced all-around routine', icon: 'heart' },
    ],
  },
  {
    id: 'weight',
    question: "What's your Frenchie's weight range?",
    subtitle: 'Helps determine portion sizes and exercise intensity.',
    type: 'single' as const,
    options: [
      { value: 'under20', label: 'Under 20 lbs', description: 'Lighter build', hint: 'Adjusts feeding portions & supplement dosages', icon: 'feather' },
      { value: '20-28', label: '20–28 lbs', description: 'Average range', hint: 'Standard calorie & portion calculations', icon: 'scale' },
      { value: 'over28', label: 'Over 28 lbs', description: 'Heavier build', hint: 'May flag weight management recommendations', icon: 'trending-up' },
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
      { value: 'low', label: 'Couch Potato', description: 'Prefers lounging', hint: 'Lowers calorie targets & adds enrichment ideas', icon: 'sofa' },
      { value: 'moderate', label: 'Moderate', description: 'Daily walks, some play', hint: 'Standard exercise & heat precaution plan', icon: 'footprints' },
      { value: 'active', label: 'Active', description: 'Loves running and playing', hint: 'Increases calorie budget & adds recovery guidance', icon: 'zap' },
    ],
  },
  {
    id: 'environment',
    question: "Where does your Frenchie live?",
    subtitle: 'Select all that apply — affects seasonal and safety guidance.',
    type: 'multi' as const,
    options: [
      { value: 'apartment', label: 'Apartment', description: 'Indoor living', hint: 'Adds indoor enrichment & noise management', icon: 'building' },
      { value: 'house', label: 'House with Yard', description: 'Outdoor access', hint: 'Adds yard safety & outdoor hazard checks', icon: 'home' },
      { value: 'hot', label: 'Hot Climate', description: 'Warm weather', hint: 'Flags overheating risk & adds cooling protocols', icon: 'sun' },
      { value: 'cold', label: 'Cold Climate', description: 'Cold weather', hint: 'Adds cold-weather gear & exercise adjustments', icon: 'snowflake' },
    ],
  },
];
