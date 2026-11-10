import { QuizAnswers } from './quizData';
import { buildMER } from './clinical';

/**
 * The paid vault's centrepiece: a 4-week, week-by-week program for the owner's main concern.
 * Plain care steps and tracking only. No diagnoses, no drug or supplement doses.
 */

export type FocusWeek = { week: number; title: string; actions: string[] };

export type FocusProgram = {
  id: string;
  title: string;
  goal: string;
  track: string;
  weeks: FocusWeek[];
  vetNow: string[];
};

function skin(a: QuizAnswers): FocusProgram {
  return {
    id: 'skin',
    title: '4-week skin & itch reset',
    goal: 'Find out what makes the itching better or worse, and arrive at the vet with evidence instead of guesses.',
    track: 'Each evening, score itching 0-10 and note anything new: food, treats, chews, shampoo, walks in long grass.',
    weeks: [
      {
        week: 1,
        title: 'Baseline',
        actions: [
          'Photograph belly, paws, armpits, face folds and ears in daylight. Repeat the same photos every Sunday.',
          'Wipe face folds daily and dry them completely; damp folds are where yeast grows.',
          'Write down every food, treat and chew your Frenchie gets. Change nothing yet.',
        ],
      },
      {
        week: 2,
        title: 'Remove the extras',
        actions: [
          'Pause new treats, table food and flavored chews. Keep the main food the same so changes are readable.',
          'Rinse and pat-dry paws after every walk to remove pollen and grass.',
          'Wash bedding and soft toys on a hot cycle, then weekly.',
        ],
      },
      {
        week: 3,
        title: 'Bathing and ears',
        actions: [
          'Bathe with a gentle dog shampoo no more than every 1-2 weeks, unless your vet prescribed a medicated one. Rinse twice as long as you lather.',
          'Check ears weekly: redness, a yeasty smell or brown discharge goes on the vet list.',
          a.environment.includes('hot')
            ? 'In hot weather, dry skin folds after every outing. Heat and humidity make fold infections more likely.'
            : 'Use a humidifier or a lighter bathing schedule if the skin looks flaky in dry indoor heat.',
        ],
      },
      {
        week: 4,
        title: 'Review',
        actions: [
          'Compare the week 1 and week 4 photos and the itch scores side by side.',
          'If the scores have not dropped, book a vet visit and bring this log and the photos.',
          'Ask whether a vet-guided elimination diet is worth it. A real food trial takes about 8 weeks on one prescribed diet, so it is not something to improvise with store treats.',
        ],
      },
    ],
    vetNow: [
      'Open sores, bleeding, or patches of hair loss',
      'Head shaking with a smelly ear',
      'Itching that wakes your dog at night',
      'Swelling of the face or hives after eating something new',
    ],
  };
}

function pulling(a: QuizAnswers): FocusProgram {
  const minutes = a.lifeStage === 'puppy' ? '2-3' : '5';
  return {
    id: 'pulling',
    title: '4-week loose-leash plan',
    goal: 'A slack leash on everyday walks, without any pressure on your Frenchie\'s neck or airway.',
    track: 'After each walk, note how many times the leash went tight and how many rewards you gave.',
    weeks: [
      {
        week: 1,
        title: 'Gear and a marker word',
        actions: [
          'Use a Y-front harness that leaves the throat free. Two fingers should slide under every strap.',
          'Pick a marker word ("yes") and pay it with a pea-sized treat. Practise 20 times a day indoors for eye contact.',
          'Take treats out of the day\'s food allowance so training does not add weight.',
        ],
      },
      {
        week: 2,
        title: 'Hallway and yard',
        actions: [
          `Train in ${minutes}-minute sessions in a hallway or yard. Reward every few steps while the leash is slack.`,
          'When the leash goes tight, stop and wait. Move again the moment it slackens.',
          'Reward at your hip, so your side becomes the place where good things happen.',
        ],
      },
      {
        week: 3,
        title: 'Quiet streets',
        actions: [
          'Walk a quiet route at a quiet time of day. Change direction when your dog surges ahead.',
          'Keep walks short and frequent. Flat-faced dogs tire and overheat before they are mentally done.',
          'End on a good rep, before panting gets loud.',
        ],
      },
      {
        week: 4,
        title: 'Distractions at a distance',
        actions: [
          'Reward your Frenchie for looking at another dog or person and then back at you. Add distance if it lunges.',
          'Practise one new location per week.',
          'If barking or lunging is not improving, a certified positive-reinforcement trainer or a veterinary behaviorist is the next step.',
        ],
      },
    ],
    vetNow: [
      'Coughing or honking after pulling on a collar',
      'Sudden reluctance to walk, or yelping when the harness goes on (possible back or neck pain)',
      'Noisy breathing that does not settle within a few minutes of rest',
    ],
  };
}

function diet(a: QuizAnswers): FocusProgram {
  const mer = buildMER(a);
  const treatKcal = Math.round((mer.kcalPerDay * 0.1) / 5) * 5;
  const underweight = a.bodyCondition <= 3;
  const overweight = a.bodyCondition >= 6;
  return {
    id: 'diet',
    title: '4-week feeding & weight plan',
    goal: underweight
      ? 'Rule out a medical cause for low weight, then rebuild condition with measured meals.'
      : overweight
        ? 'Slow, steady weight loss that you can measure, without hunger fights.'
        : 'Hold an ideal weight with measured meals, so changes are caught early.',
    track: 'Weigh weekly on the same scale at the same time of day. Write the number and a 1-9 body score.',
    weeks: [
      {
        week: 1,
        title: 'Measure everything',
        actions: [
          'Weigh your dog: step on a bathroom scale holding your Frenchie, then subtract your own weight.',
          'Measure meals with a kitchen scale or a real measuring cup, not a scoop.',
          `Start from about ${mer.kcalPerDay} kcal a day and the kcal/cup printed on your bag.`,
        ],
      },
      {
        week: 2,
        title: 'Treat budget',
        actions: [
          `Keep treats under about ${treatKcal} kcal a day (10% of the total).`,
          'Use pieces of the day\'s kibble, or plain green beans, as training rewards.',
          'One person feeds, or everyone ticks a shared list, so meals are not doubled.',
        ],
      },
      {
        week: 3,
        title: 'First adjustment',
        actions: underweight
          ? [
            'Book a vet check before increasing food. Weight loss you did not plan for needs a cause.',
            'Do not add high-fat extras to push weight up; ask the vet for a target and a food.',
            'Keep weighing weekly.',
          ]
          : overweight
            ? [
              'If the weight has not moved, reduce each meal by about 10% and keep everything else the same.',
              'Aim for roughly 1-2% of body weight per week. Faster is not safer.',
              'Add one extra 5-minute sniff walk in cool hours instead of longer, harder exercise.',
            ]
            : [
              'If the weight is stable, keep portions as they are.',
              'If it drifted up or down, change each meal by about 10% and re-check next week.',
              'Feel the ribs: with flat fingers you should feel them easily without seeing them.',
            ],
      },
      {
        week: 4,
        title: 'Review',
        actions: [
          'Compare the four weekly weights. Two adjustments with no change is a reason to see the vet.',
          'Ask your vet to confirm the target weight and the right food for this life stage.',
          'Keep the weekly weigh-in as a habit. It is the earliest warning sign you have.',
        ],
      },
    ],
    vetNow: [
      'Weight loss you did not plan for',
      'Drinking or urinating much more than usual',
      'Vomiting more than once, or refusing food for more than a day',
    ],
  };
}

function breathing(a: QuizAnswers): FocusProgram {
  const hot = a.environment.includes('hot');
  return {
    id: 'breathing',
    title: '4-week breathing & heat log',
    goal: 'Turn "he snores a lot" into a clear record your vet can use to judge whether an airway assessment or surgery makes sense.',
    track: 'Three nights a week, count breaths per minute while your dog is asleep and calm. Write the number down.',
    weeks: [
      {
        week: 1,
        title: 'Record a baseline',
        actions: [
          'Film 30 seconds of breathing while asleep, and 30 seconds right after a short walk. Keep the videos.',
          'Count sleeping breaths for one full minute (one rise and fall is one breath). Most healthy dogs at rest stay under about 30; bring your numbers to the vet either way.',
          'Note how often your Frenchie snores, gags, or wakes up from sleep.',
        ],
      },
      {
        week: 2,
        title: 'Remove airway pressure',
        actions: [
          'Harness only. No collar on walks.',
          hot
            ? 'You live somewhere hot: walk before the day heats up and after sunset, and keep walks short.'
            : 'Walk in the cooler parts of the day and keep the pace easy.',
          'Time how long breathing takes to calm down after a walk. Write it down.',
        ],
      },
      {
        week: 3,
        title: 'Weight and nostrils',
        actions: [
          'Weigh your dog. Extra fat around the neck and chest makes breathing harder.',
          'Photograph the nostrils from the front. Narrow, slit-like nostrils are worth showing the vet.',
          'Keep the bedroom cool at night and note whether snoring changes.',
        ],
      },
      {
        week: 4,
        title: 'Vet visit with evidence',
        actions: [
          'Book a vet visit and bring the videos, breath counts and recovery times.',
          'Ask for a functional BOAS assessment and whether nostril or soft-palate surgery is appropriate.',
          'Ask what sleeping breath rate should make you call them.',
        ],
      },
    ],
    vetNow: [
      'Blue, grey or very pale gums or tongue',
      'Collapse, fainting, or breathing that does not settle in a cool room',
      'Noisy breathing that suddenly gets worse, or choking on food or water',
    ],
  };
}

function wellness(a: QuizAnswers): FocusProgram {
  const senior = a.lifeStage === 'senior';
  const puppy = a.lifeStage === 'puppy';
  return {
    id: 'wellness',
    title: '4-week preventive-care baseline',
    goal: 'Get the records, habits and checks in place that catch French Bulldog problems early.',
    track: 'Tick each week\'s three actions. At the end you have a one-page health record.',
    weeks: [
      {
        week: 1,
        title: 'Records',
        actions: [
          'Collect vaccine dates, parasite-prevention product and schedule, and any past diagnoses on one page.',
          'Check the microchip is registered to your current phone number.',
          'Weigh your dog and write down the number and a 1-9 body score.',
        ],
      },
      {
        week: 2,
        title: 'Teeth',
        actions: [
          'Start brushing with a dog toothpaste (never human toothpaste). Build up from 10 seconds to daily.',
          'Lift the lips and look for red gum lines, broken teeth or bad breath.',
          'Add dental findings to the vet list.',
        ],
      },
      {
        week: 3,
        title: 'Nose-to-tail check',
        actions: [
          'Folds, ears, eyes (a red lump in the corner can be cherry eye), paws, nails and the tail pocket.',
          'Watch your Frenchie walk and climb a step. Any hesitation or wobble goes on the vet list.',
          'Do this check once a month from now on.',
        ],
      },
      {
        week: 4,
        title: 'Plan the year',
        actions: [
          senior
            ? 'Seniors: book wellness visits twice a year and ask about blood work.'
            : puppy
              ? 'Puppies: confirm the remaining vaccine dates and when to discuss neutering.'
              : 'Adults: book a yearly wellness visit and put the date in your calendar.',
          'Bring the one-page record and the list you built over the last three weeks.',
          'Ask whether pet insurance with hereditary cover makes sense before any condition is diagnosed.',
        ],
      },
    ],
    vetNow: [
      'Any breathing emergency, collapse or blue gums',
      'Sudden weakness or dragging the back legs (possible spinal emergency)',
      'Repeated vomiting, or not eating for more than a day',
    ],
  };
}

export function buildFocusProgram(answers: QuizAnswers): FocusProgram {
  switch (answers.concern) {
    case 'skin': return skin(answers);
    case 'pulling': return pulling(answers);
    case 'diet': return diet(answers);
    case 'breathing': return breathing(answers);
    default: return wellness(answers);
  }
}
