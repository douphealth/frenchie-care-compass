import { supabase } from '@/integrations/supabase/client';
import { QuizAnswers } from './quizData';
import { PlanSection } from './planGenerator';
import { Entitlement, acceptServerVerification } from './entitlement';
import { PAYMENT_LINKS } from './stripeConfig';
import { isValidEmail, normalizeEmail } from './quizValidation';

const WP_ENDPOINT = 'https://care-plan.frenchyfab.com/api/ffab-care/v1';
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

async function postToWordPress(path: string, body: Record<string, unknown>) {
  const response = await withTimeout(fetch(`${WP_ENDPOINT}${path}`, {
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
    throw new Error(json?.message || `WordPress endpoint failed with ${response.status}`);
  }
  return json;
}

export async function generateAiPlan(answers: QuizAnswers): Promise<PlanSection[] | null> {
  trackRevenueEvent('quiz_completed', { answers });
  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke('generate-plan', { body: { answers } })
    );
    if (error || !Array.isArray(data?.sections) || data.sections.length === 0) {
      throw error || new Error('No AI plan sections returned');
    }
    trackRevenueEvent('ai_plan_generated');
    return data.sections;
  } catch (error) {
    trackRevenueEvent('ai_plan_fallback_used', { error: String(error) });
    return null;
  }
}

export async function submitLead(payload: LeadPayload) {
  if (!isValidEmail(payload.email)) throw new Error('Enter a valid email address.');
  trackRevenueEvent('email_submitted', { email_domain: payload.email.split('@')[1] || '' });

  // Primary durable lead capture lives on FrenchyFab WordPress so this funnel is not blocked
  // if the old Supabase project is paused/deleted.
  try {
    const data = await postToWordPress('/lead', payload as unknown as Record<string, unknown>);
    localStorage.setItem('ffab_care_lead_id', String(data.id || data.lead_id || 'wp'));
    trackRevenueEvent('lead_saved', { backend: 'wordpress', lead_id: data.id || data.lead_id });
  } catch (wpError) {
    // Never lose the lead locally; mark for later recovery and continue with the free result.
    localStorage.setItem('ffab_pending_lead', JSON.stringify({ ...payload, saved_at: new Date().toISOString() }));
    trackRevenueEvent('lead_save_failed', { backend: 'wordpress', error: String(wpError) });
    throw wpError;
  }

  // Secondary best-effort email automation. Kept as progressive enhancement only.
  supabase.functions.invoke('send-welcome-email', {
    body: { email: payload.email, answers: payload.answers },
  }).then(() => {
    trackRevenueEvent('welcome_email_requested', { backend: 'supabase' });
  }).catch((error) => {
    trackRevenueEvent('welcome_email_fallback_used', { error: String(error) });
  });
}

export function paymentLinkUrl(addBump: boolean, email: string): string {
  const base = addBump ? PAYMENT_LINKS.vaultPlusChecklist : PAYMENT_LINKS.vault;
  if (!isValidEmail(email)) return base;
  return `${base}?prefilled_email=${encodeURIComponent(normalizeEmail(email))}`;
}

export async function createCheckout(payload: CheckoutPayload): Promise<CheckoutResult> {
  trackRevenueEvent('premium_cta_clicked', { add_bump: payload.addBump });

  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke('create-payment', { body: payload })
    );
    if (error || !data?.url || typeof data.url !== 'string') throw error || new Error('Checkout URL missing');
    trackRevenueEvent('checkout_created', { backend: 'supabase', add_bump: payload.addBump });
    return { url: data.url, mode: 'verified-session' };
  } catch (error) {
    trackRevenueEvent('checkout_backend_failed', { backend: 'supabase', error: String(error) });
    try {
      await postToWordPress('/checkout-intent', payload as unknown as Record<string, unknown>);
      trackRevenueEvent('checkout_intent_saved', { backend: 'wordpress', add_bump: payload.addBump });
    } catch {
      /* The payment link below is still the way to reach Stripe. */
    }
    return { url: paymentLinkUrl(payload.addBump, payload.email), mode: 'payment-link' };
  }
}

export async function verifyCheckout(sessionId: string): Promise<Entitlement | null> {
  if (!sessionId.startsWith('cs_')) return null;
  const { data, error } = await withTimeout(
    supabase.functions.invoke('verify-payment', { body: { sessionId } })
  );
  if (error) throw error;
  return acceptServerVerification(sessionId, data);
}

/** Asks the server to email a recovery link. The response never includes entitlement. */
export async function requestPurchaseRecovery(email: string): Promise<void> {
  if (!isValidEmail(email)) throw new Error('Enter the email you used at checkout.');
  const { data, error } = await withTimeout(
    supabase.functions.invoke('restore-purchase', { body: { email: normalizeEmail(email) } })
  );
  if (error || data?.ok !== true) {
    throw error || new Error(data?.error || 'Purchase recovery is unavailable.');
  }
}
