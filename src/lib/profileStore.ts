import { QuizAnswers } from './quizData';
import { PlanSection } from './planGenerator';

const KEY = 'frenchie_profile_v1';

export type StoredProfile = {
  answers?: QuizAnswers;
  plan?: PlanSection[];
  email?: string;
  step?: number;
  screen?: string;
  leadCaptured?: boolean;
  completedAt?: string;
};

export function loadProfile(): StoredProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredProfile;
  } catch {
    return {};
  }
}

export function saveProfile(patch: Partial<StoredProfile>) {
  try {
    const current = loadProfile();
    const next = { ...current, ...patch };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota errors */
  }
}

export function clearProfile() {
  try { localStorage.removeItem(KEY); } catch { /* */ }
}
