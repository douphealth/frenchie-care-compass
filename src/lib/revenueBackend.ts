import { QuizAnswers } from './quizData';
import { PlanSection } from './planGenerator';
import { Entitlement, acceptServerVerification } from './entitlement';
import { PAYMENT_LINKS } from './stripeConfig';
import { isValidEmail, normalizeEmail, parseQuizAnswers } from './quizValidation';

/**
 * The app's backend is the Cloudflare Worker in /worker, on the same origin as the app.
 * For local dev against production, set VITE_API_BASE=https://care-plan.frenchyfab.com.
 */
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? '';
const LEAD_ENDPOINT = `${API_BASE}/api/ffab-care/v1`;
const BACKEND_TIMEOUT_MS = 9000;

export type LeadPayload = {
  email: string;
  answers: QuizAnswers;
  plan?: PlanSection[];
  source?: string;
};

export type CheckoutPayload = {
  email: string;
  addBump: boolean;
  answers?: QuizAnswers;
};

export type CheckoutResult = {
  url: string;
  mode: 'verified-session' | 'payment-link';
};

type DataLayerWindow = Window & { dataLayer?: Array<Record<string, unknown>> };

function withTimeout<T>(promise: Promise<T>, ms = BACKEND_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((key) => {
    const value = params.get(key);
    if (value) out[key] = value;
  });
  return out;
}

export function trackRevenueEvent(event: string, properties: Record<string, unknown> = {}) {
  const payload = {
    event,
    properties,
    path: window.location.pathname,
    utm: getUtmParams(),
    ts: new Date().toISOString(),
  };

  const existing = JSON.parse(localStorage.getItem('ffab_care_events') || '[]');
  existing.push(payload);
  localStorage.setItem('ffab_care_events', JSON.stringify(existing.slice(-100)));

  window.dispatchEvent(new CustomEvent('ffab-care-event', { detail: payload }));
  const win = window as DataLayerWindow;
  win.dataLayer = win.dataLayer || [];
  win.dataLayer.push(payload);
}

async function postLead(path: string, body: Record<string, unknown>) {
  const response = await withTimeout(fetch(`${LEAD_ENDPOINT}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...body,
      page_url: window.location.href,
      referrer: document.referrer,
      utm: getUtmParams(),
      user_agent: navigator.userAgent,
    }),
  }));

  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.success === false) {
    throw new Error(json?.message || `Lead endpoint failed with ${response.status}`);
  }
  return json;
}

/** Calls a Worker route under /functions/v1 and throws with the server's message on failure. */
async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const response = await withTimeout(fetch(`${API_BASE}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw new Error((data && typeof data.error === 'string' && data.error) || `${name} failed with ${response.status}`);
  }
  return data as T;
}

const PENDING_LEAD_KEY = 'ffab_pending_lead';

export async function submitLead(payload: LeadPayload) {
  if (!isValidEmail(payload.email)) throw new Error('Enter a valid email address.');
  trackRevenueEvent('email_submitted', { email_domain: payload.email.split('@')[1] || '' });
  const body = { email: normalizeEmail(payload.email), answers: payload.answers, source: payload.source };

  try {
    const data = await postLead('/lead', body);
    localStorage.setItem('ffab_care_lead_id', String(data.id || data.lead_id || 'saved'));
    localStorage.removeItem(PENDING_LEAD_KEY);
    trackRevenueEvent('lead_saved', { backend: 'worker', lead_id: data.id || data.lead_id });
  } catch (error) {
    // Keep the lead on this device and retry on the next visit (see retryPendingLead).
    localStorage.setItem(PENDING_LEAD_KEY, JSON.stringify({ ...body, saved_at: new Date().toISOString() }));
    trackRevenueEvent('lead_save_failed', { backend: 'worker', error: String(error) });
    throw error;
  }
}

/** Re-sends a lead that failed to save on an earlier visit. Silent on failure. */
export async function retryPendingLead(): Promise<void> {
  let pending: { email?: string; answers?: QuizAnswers; source?: string } | null = null;
  try {
    pending = JSON.parse(localStorage.getItem(PENDING_LEAD_KEY) || 'null');
  } catch {
    localStorage.removeItem(PENDING_LEAD_KEY);
    return;
  }
  if (!pending?.email || !pending.answers) return;
  try {
    await submitLead({ email: pending.email, answers: pending.answers, source: pending.source || 'frenchie-care-plan-app-retry' });
  } catch {
    /* stays pending */
  }
}

export function paymentLinkUrl(addBump: boolean, email: string): string {
  const base = addBump ? PAYMENT_LINKS.vaultPlusChecklist : PAYMENT_LINKS.vault;
  if (!isValidEmail(email)) return base;
  return `${base}?prefilled_email=${encodeURIComponent(normalizeEmail(email))}`;
}

export async function createCheckout(payload: CheckoutPayload): Promise<CheckoutResult> {
  trackRevenueEvent('premium_cta_clicked', { add_bump: payload.addBump });

  try {
    const data = await callFunction<{ url?: unknown }>('create-payment', payload as unknown as Record<string, unknown>);
    if (typeof data.url !== 'string' || !data.url.startsWith('https://checkout.stripe.com/')) {
      throw new Error('Checkout URL missing');
    }
    trackRevenueEvent('checkout_created', { backend: 'worker', add_bump: payload.addBump });
    return { url: data.url, mode: 'verified-session' };
  } catch (error) {
    trackRevenueEvent('checkout_backend_failed', { backend: 'worker', error: String(error) });
    return { url: paymentLinkUrl(payload.addBump, payload.email), mode: 'payment-link' };
  }
}

export type VerifiedCheckout = {
  entitlement: Entitlement;
  /** Quiz answers stored on the Stripe session, so the vault can be rebuilt on another device. */
  answers: QuizAnswers | null;
};

/** `fulfil` asks the server to email the access link (first successful check only). */
export async function verifyCheckout(sessionId: string, opts: { fulfil?: boolean } = {}): Promise<VerifiedCheckout | null> {
  if (!sessionId.startsWith('cs_')) return null;
  const data = await callFunction<Record<string, unknown>>('verify-payment', { sessionId, fulfil: opts.fulfil === true });
  const entitlement = acceptServerVerification(sessionId, data);
  if (!entitlement) return null;
  trackRevenueEvent('payment_verified', { include_emergency_card: entitlement.includeEmergencyCard });
  return { entitlement, answers: parseQuizAnswers(data.answers) };
}

/** Asks the server to email a recovery link. The response never includes entitlement. */
export async function requestPurchaseRecovery(email: string): Promise<void> {
  if (!isValidEmail(email)) throw new Error('Enter the email you used at checkout.');
  const data = await callFunction<{ ok?: unknown }>('restore-purchase', { email: normalizeEmail(email) });
  if (data.ok !== true) throw new Error('Purchase recovery is unavailable.');
}
