import { QuizAnswers } from './quizData';
import { PlanSection } from './planGenerator';
import { Entitlement } from './entitlement';

const KEY = 'frenchie_profile_v1';

export type StoredProfile = {
  answers?: QuizAnswers;
  plan?: PlanSection[];
  email?: string;
  step?: number;
  screen?: string;
  leadCaptured?: boolean;
  completedAt?: string;
  /** Written only after the server confirms a paid Stripe session. */
  entitlement?: Entitlement;
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
