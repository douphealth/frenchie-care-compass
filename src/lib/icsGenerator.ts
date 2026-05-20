import { QuizAnswers } from './quizData';

/** Builds a valid VCALENDAR string with recurring care tasks. */

function pad(n: number) { return String(n).padStart(2, '0'); }

function fmtDate(d: Date): string {
  // YYYYMMDDTHHmmssZ
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    '00Z'
  );
}

type Task = {
  uid: string;
  summary: string;
  description: string;
  rrule: string;
  hourLocal: number; // 24h
};

export function buildTasks(answers: QuizAnswers): Task[] {
  const tasks: Task[] = [
    {
      uid: 'ffab-skinfold',
      summary: '🐾 Skin-fold + face wipe check',
      description: 'Wipe nose rope and facial folds with a dog-safe cloth. Dry thoroughly.',
      rrule: 'FREQ=DAILY',
      hourLocal: 8,
    },
    {
      uid: 'ffab-weight',
      summary: '⚖️ Weekly weight log',
      description: 'Weigh your Frenchie at the same time each week.',
      rrule: 'FREQ=WEEKLY;BYDAY=SU',
      hourLocal: 9,
    },
    {
      uid: 'ffab-ear',
      summary: '👂 Ear check',
      description: 'Inspect ears for redness, smell, or debris.',
      rrule: 'FREQ=WEEKLY;BYDAY=WE',
      hourLocal: 9,
    },
    {
      uid: 'ffab-nails',
      summary: '✂️ Nail trim',
      description: 'Trim or file nails. Reward with a treat.',
      rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=SA',
      hourLocal: 10,
    },
    {
      uid: 'ffab-vetcheck',
      summary: '🩺 Monthly home health check',
      description: 'Eyes, gums, weight, coat, breathing — log any changes.',
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=1',
      hourLocal: 9,
    },
  ];

  const isPuppy = answers.lifeStage === 'puppy';
  const hot = answers.environment?.includes('hot');
  if (isPuppy || hot) {
    tasks.push({
      uid: 'ffab-heat',
      summary: '☀️ Heat-stroke awareness alert',
      description: 'Above 80°F: indoor play only. Carry water, watch for excessive panting or blue gums.',
      rrule: 'FREQ=WEEKLY;BYDAY=MO,FR;UNTIL=' + buildSeasonalUntil(),
      hourLocal: 7,
    });
  }
  return tasks;
}

function buildSeasonalUntil(): string {
  const now = new Date();
  const year = now.getMonth() <= 7 ? now.getFullYear() : now.getFullYear() + 1;
  return `${year}0831T000000Z`;
}

export function buildIcs(answers: QuizAnswers): string {
  const now = new Date();
  const tasks = buildTasks(answers);
  const start = new Date();
  start.setDate(start.getDate() + 1);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FrenchyFab//Care Compass//EN',
    'CALSCALE:GREGORIAN',
  ];

  tasks.forEach((t) => {
    const dt = new Date(start);
    dt.setHours(t.hourLocal, 0, 0, 0);
    const dtEnd = new Date(dt.getTime() + 15 * 60 * 1000);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${t.uid}-${now.getTime()}@frenchyfab.com`,
      `DTSTAMP:${fmtDate(now)}`,
      `DTSTART:${fmtDate(dt)}`,
      `DTEND:${fmtDate(dtEnd)}`,
      `SUMMARY:${t.summary}`,
      `DESCRIPTION:${t.description}`,
      `RRULE:${t.rrule}`,
      'END:VEVENT',
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
