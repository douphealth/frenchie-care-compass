import { supabase } from '@/integrations/supabase/client';
import { QuizAnswers } from './quizData';
import { PlanSection } from './planGenerator';

const WP_ENDPOINT = 'https://frenchyfab.com/wp-json/ffab-care/v1';
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
};

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
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).dataLayer.push(payload);
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
    if (error || !data?.sections) throw error || new Error('No AI plan sections returned');
    trackRevenueEvent('ai_plan_generated');
    return data.sections;
  } catch (error) {
    trackRevenueEvent('ai_plan_fallback_used', { error: String(error) });
    return null;
  }
}

export async function submitLead(payload: LeadPayload) {
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

export async function createCheckout(payload: CheckoutPayload): Promise<string> {
  trackRevenueEvent('premium_cta_clicked', { add_bump: payload.addBump });

  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke('create-payment', { body: payload })
    );
    if (error || !data?.url) throw error || new Error('Checkout URL missing');
    trackRevenueEvent('checkout_created', { backend: 'supabase', add_bump: payload.addBump });
    return data.url;
  } catch (error) {
    trackRevenueEvent('checkout_backend_failed', { backend: 'supabase', error: String(error) });
    await postToWordPress('/checkout-intent', payload as unknown as Record<string, unknown>);
    trackRevenueEvent('checkout_intent_saved', { backend: 'wordpress', add_bump: payload.addBump });
    throw error;
  }
}
