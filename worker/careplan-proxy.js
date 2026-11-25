/**
 * care-plan.frenchyfab.com edge worker.
 *
 * Serves the static app from Cloudflare Pages (STATIC_ORIGIN) and is the app's only backend:
 *   POST /functions/v1/create-payment    -> Stripe Checkout Session (signed, server-side, stores quiz metadata)
 *   POST /functions/v1/verify-payment    -> asks Stripe whether a session is paid and not refunded
 *   POST /functions/v1/restore-purchase  -> emails the buyer a fresh access link (no email oracle)
 *   POST /functions/v1/stripe-webhook    -> verified Stripe webhook (paid, refunded, disputed)
 *   POST /functions/v1/vault-content     -> paid vault copy, only after Stripe says the session is paid
 *   POST /functions/v1/billing-portal    -> Stripe Customer Portal for receipts and refunds
 *   POST /functions/v1/auth/*            -> email/password account (requires CAREPLAN_KV)
 *   GET  /api/ffab-care/v1/health        -> boolean readiness check (no secret values exposed)
 *   POST /api/ffab-care/v1/lead          -> lead capture (Brevo list + central lead store)
 *   *    /api/ffab-care/v1/*             -> proxied to the FrenchyFab WordPress REST namespace
 *
 * Secrets / vars / bindings (Cloudflare dashboard -> Workers -> this worker -> Settings):
 *   STRIPE_SECRET_KEY     secret. Restricted key with Checkout Sessions read+write.
 *   STRIPE_WEBHOOK_SECRET secret. Signing secret (whsec_...) for /functions/v1/stripe-webhook.
 *   CAREPLAN_KV           KV namespace for accounts, entitlements, email dedupe, and rate limits.
 *                         Without it, fulfilment email is skipped and accounts return 503.
 *                         Recovery cooldowns fall back to the edge cache.
 *   CHECKOUT_VIA_LINKS    "0" (default) = dynamic Checkout Sessions; "1" = force static Payment Links.
 *   INVOICE_CREATION      unset or any value other than "0" creates a Stripe invoice on the
 *                         Checkout Session so it shows in the Customer Portal. "0" disables it.
 *   BREVO_API_KEY         secret. Used for the list sync and the access-link emails.
 *   BREVO_LIST_ID         optional, defaults to 8.
 *   MAIL_FROM             optional, defaults to info@frenchyfab.com (must be a Brevo-verified sender).
 */

import { buildVaultPack } from '../src/lib/vaultPack.ts';
import { readAuthSession, routeAuth } from './auth.js';

export const PUBLIC_ORIGIN = 'https://care-plan.frenchyfab.com';
export const PREMIUM_PRICE_ID = 'price_1TFD07GCqwm95OGXc26k5JkI';
export const EMERGENCY_CARD_PRICE_ID = 'price_1THjRhGCqwm95OGXJZf9x553';

const WP_ENDPOINT = 'https://frenchyfab.com/wp-json/ffab-care/v1';
/**
 * Static origin for this repo.
 * Pages project `frenchie-care-compass` in account 284f1a03e12aa7416ab177db3f692c17
 * publishes main to https://frenchie-care-compass.pages.dev.
 * DNS for care-plan.frenchyfab.com is a CNAME to frenchie-care-compass.gearup-flow-master.pages.dev,
 * a branch alias of the different Pages project `gearup-flow-master` in account 5dc0401c38d9de0c6947fee40a210937.
 * The worker route intercepts the hostname and fetches STATIC_ORIGIN, so the CNAME is not the HTML origin.
 * Do not point STATIC_ORIGIN at the gearup-flow-master alias.
 */
const STATIC_ORIGIN = 'https://frenchie-care-compass.pages.dev';
const LEAD_STORE = 'https://app-lead-capture.papalexios.workers.dev/app/frenchyfab';
const DEV_ORIGINS = ['http://localhost:8080', 'http://127.0.0.1:8080'];
const RECOVERY_COOLDOWN_S = 10 * 60;
const WEBHOOK_TOLERANCE_S = 5 * 60;
const SUPPORT_EMAIL = 'info@frenchyfab.com';
const WORKER_VERSION = 'worker-2026-11-25';

const SECURITY_CSP = [
  "default-src 'self'",
  "script-src 'self' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://care-plan.frenchyfab.com",
  "connect-src 'self' https://care-plan.frenchyfab.com https://cloudflareinsights.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com https://buy.stripe.com",
  'upgrade-insecure-requests',
].join('; ');

/* ------------------------------------------------------------------ helpers */

function allowedOrigin(request) {
  const origin = request.headers.get('origin') || '';
  return origin === PUBLIC_ORIGIN || DEV_ORIGINS.includes(origin) ? origin : PUBLIC_ORIGIN;
}

function corsHeaders(request) {
  return {
    'access-control-allow-origin': allowedOrigin(request),
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type, authorization, x-requested-with, stripe-signature',
    'access-control-allow-credentials': 'true',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

function json(request, body, status = 200, extra) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...corsHeaders(request), ...(extra || {}) },
  });
}

async function rateLimit(request, env, bucket, limit) {
  const kv = env.CAREPLAN_KV;
  if (!kv) return null;
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  const key = `rl:${bucket}:${ip}`;
  const current = Number(await kv.get(key) || '0');
  if (current >= limit) return json(request, { error: 'Too many requests. Wait a minute and try again.' }, 429);
  await kv.put(key, String(current + 1), { expirationTtl: 60 });
  return null;
}

async function readJson(request) {
  try {
    const text = await request.text();
    if (text.length > 20000) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
export function isValidEmail(value) {
  const email = normalizeEmail(value);
  return email.length <= 254 && EMAIL_RE.test(email);
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const QUIZ_ENUMS = {
  lifeStage: ['puppy', 'adult', 'senior'],
  weight: ['under20', '20-28', 'over28'],
  concern: ['skin', 'pulling', 'diet', 'breathing', 'wellness'],
  activityLevel: ['low', 'moderate', 'active'],
  environment: ['apartment', 'house', 'hot', 'cold'],
};

/** Mirrors src/lib/quizValidation.ts so the worker never stores junk in Stripe metadata. */
export function parseAnswers(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { lifeStage, weight, bodyCondition, concern, activityLevel, environment } = raw;
  if (!QUIZ_ENUMS.lifeStage.includes(lifeStage)) return null;
  if (!QUIZ_ENUMS.weight.includes(weight)) return null;
  if (!QUIZ_ENUMS.concern.includes(concern)) return null;
  if (!QUIZ_ENUMS.activityLevel.includes(activityLevel)) return null;
  const bcs = Number(bodyCondition);
  if (!Number.isInteger(bcs) || bcs < 1 || bcs > 9) return null;
  if (!Array.isArray(environment) || environment.length === 0) return null;
  const env = [...new Set(environment)].filter((e) => QUIZ_ENUMS.environment.includes(e));
  if (env.length === 0) return null;
  return { lifeStage, weight, bodyCondition: bcs, concern, activityLevel, environment: env };
}

/* ------------------------------------------------------------------- Stripe */

function formBody(fields) {
  const params = new URLSearchParams();
  Object.entries(fields).forEach(([k, v]) => params.append(k, v));
  return params.toString();
}

async function stripe(env, path, init = {}) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'stripe-version': '2024-06-20',
      ...(init.body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error?.message || `Stripe ${path} failed with ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

export function sessionPriceIds(session) {
  return (session?.line_items?.data || []).map((item) => item?.price?.id || '').filter(Boolean);
}

export function chargeRefunded(session) {
  const charge = session?.payment_intent?.latest_charge;
  if (!charge || typeof charge !== 'object') return false;
  return charge.refunded === true || Number(charge.amount_refunded || 0) > 0 || charge.disputed === true;
}

/** The single rule for "this person paid for the vault". */
export function isPaidVaultSession(session) {
  return Boolean(
    session
    && session.status === 'complete'
    && session.payment_status === 'paid'
    && sessionPriceIds(session).includes(PREMIUM_PRICE_ID)
    && !chargeRefunded(session),
  );
}

async function retrieveSession(env, sessionId) {
  const q = 'expand[]=line_items&expand[]=payment_intent.latest_charge';
  return stripe(env, `/checkout/sessions/${encodeURIComponent(sessionId)}?${q}`);
}

function sessionEmail(session) {
  return normalizeEmail(session?.customer_details?.email || session?.customer_email || '') || null;
}

function sessionAnswers(session) {
  try {
    return parseAnswers(JSON.parse(session?.metadata?.answers || 'null'));
  } catch {
    return null;
  }
}

function constantTimeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verifies a Stripe-Signature header (t=...,v1=...) using Web Crypto HMAC-SHA256.
 * Rejects tampered payloads and timestamps outside `toleranceSec` (default 5 minutes).
 */
export async function verifyStripeSignature(payload, sigHeader, secret, nowSec = Math.floor(Date.now() / 1000), toleranceSec = WEBHOOK_TOLERANCE_S) {
  if (!payload || !sigHeader || !secret) return false;
  const parts = sigHeader.split(',').map((p) => p.trim());
  let timestamp = '';
  const signatures = [];
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq);
    const val = part.slice(eq + 1);
    if (key === 't') timestamp = val;
    if (key === 'v1' && val) signatures.push(val);
  }
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || signatures.length === 0) return false;
  if (Math.abs(nowSec - ts) > toleranceSec) return false;

  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(`${timestamp}.${payload}`));
  const expectedHex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return signatures.some((sig) => constantTimeEqualHex(sig, expectedHex));
}

/**
 * Returns true the first time it is called for `key` (and records it), false afterwards.
 * Without a KV binding it falls back to per-PoP edge cache, or `fallback` when no cache exists.
 */
async function firstTime(env, key, ttlSeconds, fallback) {
  const kv = env.CAREPLAN_KV;
  if (kv) {
    if (await kv.get(key)) return false;
    await kv.put(key, new Date().toISOString(), ttlSeconds ? { expirationTtl: ttlSeconds } : undefined);
    return true;
  }
  const cache = typeof caches !== 'undefined' ? caches.default : undefined;
  if (cache) {
    const marker = new Request(`${PUBLIC_ORIGIN}/__marker/${encodeURIComponent(key)}`);
    if (await cache.match(marker)) return false;
    await cache.put(marker, new Response('1', { headers: { 'cache-control': `public, max-age=${ttlSeconds || 31536000}` } }));
    return true;
  }
  return fallback;
}

/* -------------------------------------------------------------------- email */

function accessLink(sessionId) {
  // via=email tells the page not to ask for another fulfilment email.
  return `${PUBLIC_ORIGIN}/payment-success?session_id=${encodeURIComponent(sessionId)}&via=email`;
}

export function vaultEmailHtml(link, heading) {
  const safe = escapeHtml(link);
  return '<!doctype html><html><body style="margin:0;background:#f7f4ee;padding:24px 12px;'
    + 'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;color:#1f2430">'
    + '<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px">'
    + '<tr><td style="padding:28px">'
    + `<h1 style="margin:0 0 12px;font-size:22px">${escapeHtml(heading)}</h1>`
    + '<p style="margin:0 0 16px;line-height:1.6">Your Frenchie Care Vault is linked to your Stripe payment. '
    + 'Open it on any device with the button below. The page re-checks the payment with Stripe each time.</p>'
    + `<p style="margin:0 0 20px"><a href="${safe}" style="display:inline-block;background:#2f5d3a;color:#fff;`
    + 'text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px">Open my Care Vault</a></p>'
    + `<p style="margin:0 0 8px;font-size:13px;color:#555">If the button does not work, paste this link into your browser:<br>${safe}</p>`
    + '<p style="margin:16px 0 0;font-size:12px;color:#777">The vault is educational and does not replace a veterinarian. '
    + `Questions or a refund request: reply to this email or write to ${SUPPORT_EMAIL}.</p>`
    + '</td></tr></table></body></html>';
}

async function sendVaultEmail(env, to, sessionId, heading) {
  if (!env.BREVO_API_KEY) throw new Error('Email is not configured');
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'api-key': env.BREVO_API_KEY },
    body: JSON.stringify({
      sender: { email: env.MAIL_FROM || SUPPORT_EMAIL, name: 'FrenchyFab' },
      replyTo: { email: SUPPORT_EMAIL },
      to: [{ email: to }],
      subject: 'Your Frenchie Care Vault access link',
      htmlContent: vaultEmailHtml(accessLink(sessionId), heading),
    }),
  });
  if (!res.ok) throw new Error(`Brevo send failed with ${res.status}`);
}

/* ------------------------------------------------------------ entitlements */

async function rememberEntitlement(env, session) {
  const kv = env.CAREPLAN_KV;
  if (!kv || !session?.id) return;
  const email = sessionEmail(session);
  const paid = isPaidVaultSession(session);
  const paymentIntent = session.payment_intent;
  const paymentIntentId = typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id || null;
  const record = {
    sessionId: session.id,
    email,
    paid,
    refunded: chargeRefunded(session),
    includeEmergencyCard: paid && sessionPriceIds(session).includes(EMERGENCY_CARD_PRICE_ID),
    customerId: typeof session.customer === 'string' ? session.customer : null,
    paymentIntentId,
    updatedAt: new Date().toISOString(),
  };
  const encoded = JSON.stringify(record);
  await kv.put(`entitlement:session:${session.id}`, encoded);
  if (email) await kv.put(`entitlement:email:${email}`, encoded);
  if (paymentIntentId) await kv.put(`entitlement:pi:${paymentIntentId}`, encoded);
}

async function revokeByPaymentIntent(env, paymentIntentId) {
  const kv = env.CAREPLAN_KV;
  if (!kv || !paymentIntentId) return false;
  const raw = await kv.get(`entitlement:pi:${paymentIntentId}`);
  if (!raw) return false;
  let record;
  try { record = JSON.parse(raw); } catch { return false; }
  record.paid = false;
  record.refunded = true;
  record.includeEmergencyCard = false;
  record.updatedAt = new Date().toISOString();
  const encoded = JSON.stringify(record);
  await kv.put(`entitlement:pi:${paymentIntentId}`, encoded);
  if (record.sessionId) await kv.put(`entitlement:session:${record.sessionId}`, encoded);
  if (record.email) await kv.put(`entitlement:email:${record.email}`, encoded);
  return true;
}

/** Sends the access email at most once, and only when KV can remember that it was sent. */
async function fulfilOnce(env, session) {
  const email = sessionEmail(session);
  if (!isPaidVaultSession(session) || !email || !env.BREVO_API_KEY || !env.CAREPLAN_KV) return false;
  const key = `sent:${session.id}`;
  if (await env.CAREPLAN_KV.get(key)) return false;
  await sendVaultEmail(env, email, session.id, 'Your Care Vault is ready');
  await env.CAREPLAN_KV.put(key, new Date().toISOString());
  return true;
}

/* ------------------------------------------------------------ payment routes */

async function createPayment(request, env) {
  const limited = await rateLimit(request, env, 'create-payment', 20);
  if (limited) return limited;
  if (!env.STRIPE_SECRET_KEY || env.CHECKOUT_VIA_LINKS === '1') {
    return json(request, { error: 'Checkout sessions are not enabled; use the payment link' }, 503);
  }
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  const answers = parseAnswers(body?.answers);
  const addBump = body?.addBump === true;
  const origin = allowedOrigin(request);

  const fields = {
    mode: 'payment',
    customer_creation: 'always',
    'line_items[0][price]': PREMIUM_PRICE_ID,
    'line_items[0][quantity]': '1',
    success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=cancelled`,
    'metadata[product]': 'frenchie-care-vault',
    'payment_intent_data[metadata][product]': 'frenchie-care-vault',
    'payment_intent_data[description]': 'Frenchie Care Vault by FrenchyFab',
  };
  if (env.INVOICE_CREATION !== '0') fields['invoice_creation[enabled]'] = 'true';
  if (isValidEmail(email)) fields.customer_email = email;
  if (answers) fields['metadata[answers]'] = JSON.stringify(answers);
  if (addBump) {
    fields['line_items[1][price]'] = EMERGENCY_CARD_PRICE_ID;
    fields['line_items[1][quantity]'] = '1';
  }

  try {
    const session = await stripe(env, '/checkout/sessions', { method: 'POST', body: formBody(fields) });
    if (!session.url) return json(request, { error: 'Stripe did not return a checkout URL' }, 502);
    return json(request, { url: session.url });
  } catch (error) {
    console.error('create-payment', error.message);
    return json(request, { error: 'Unable to open secure checkout' }, 502);
  }
}

async function verifyPayment(request, env) {
  const limited = await rateLimit(request, env, 'verify-payment', 30);
  if (limited) return limited;
  if (!env.STRIPE_SECRET_KEY) return json(request, { error: 'Payment service is not configured' }, 503);
  const body = await readJson(request);
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  if (!/^cs_(live|test)_[A-Za-z0-9]{10,250}$/.test(sessionId)) {
    return json(request, { error: 'Invalid checkout session' }, 400);
  }

  let session;
  try {
    session = await retrieveSession(env, sessionId);
  } catch (error) {
    if (error.status === 404) return json(request, { paid: false, refunded: false, sessionId, error: 'Unknown session' });
    console.error('verify-payment', error.message);
    return json(request, { error: 'Unable to reach Stripe' }, 502);
  }

  const priceIds = sessionPriceIds(session);
  const paid = isPaidVaultSession(session);
  const email = sessionEmail(session);
  await rememberEntitlement(env, session);

  if (paid && email && body?.fulfil === true) {
    try {
      await fulfilOnce(env, session);
    } catch (error) {
      console.error('fulfilment email', error.message);
    }
  }

  return json(request, {
    paid,
    refunded: chargeRefunded(session),
    sessionId: session.id,
    email,
    includeEmergencyCard: paid && priceIds.includes(EMERGENCY_CARD_PRICE_ID),
    answers: paid ? sessionAnswers(session) : null,
  });
}

async function handleStripeWebhook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY) {
    return json(request, { error: 'Webhook is not configured' }, 503);
  }
  const rawBody = await request.text();
  if (rawBody.length > 100000) return json(request, { error: 'Payload too large' }, 413);
  const sigHeader = request.headers.get('stripe-signature') || '';
  const valid = await verifyStripeSignature(rawBody, sigHeader, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    return json(request, { error: 'Invalid Stripe signature' }, 400);
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json(request, { error: 'Malformed webhook payload' }, 400);
  }

  if (event?.type === 'charge.refunded' || event?.type === 'charge.dispute.created') {
    const pi = event?.data?.object?.payment_intent;
    const piId = typeof pi === 'string' ? pi : pi?.id;
    const revoked = await revokeByPaymentIntent(env, piId);
    return json(request, { received: true, revoked });
  }

  // This product is a one-time purchase. Subscription events are acknowledged and ignored.
  if (event?.type === 'customer.subscription.deleted' || event?.type === 'customer.subscription.updated') {
    return json(request, { received: true, ignored: true, reason: 'one-time-purchase' });
  }

  if (event?.type !== 'checkout.session.completed') {
    return json(request, { received: true, ignored: true });
  }

  const sessionId = typeof event?.data?.object?.id === 'string' ? event.data.object.id : '';
  if (!/^cs_(live|test)_[A-Za-z0-9]{10,250}$/.test(sessionId)) {
    return json(request, { received: true, ignored: true });
  }

  try {
    const session = await retrieveSession(env, sessionId);
    await rememberEntitlement(env, session);
    if (isPaidVaultSession(session)) {
      try {
        await fulfilOnce(env, session);
      } catch (error) {
        console.error('webhook fulfilment email', error.message);
        return json(request, { error: 'Fulfilment email failed' }, 502);
      }
    }
    return json(request, { received: true, fulfilled: isPaidVaultSession(session) });
  } catch (error) {
    console.error('stripe-webhook', error.message);
    return json(request, { error: 'Unable to process webhook' }, 502);
  }
}

async function vaultContent(request, env) {
  const limited = await rateLimit(request, env, 'vault-content', 30);
  if (limited) return limited;
  if (!env.STRIPE_SECRET_KEY) return json(request, { error: 'Payment service is not configured' }, 503);
  const body = await readJson(request);
  let sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  if (!sessionId) {
    const auth = await readAuthSession(request, env);
    if (auth?.email && env.CAREPLAN_KV) {
      const raw = await env.CAREPLAN_KV.get(`entitlement:email:${auth.email}`);
      try {
        const record = raw ? JSON.parse(raw) : null;
        if (record?.paid && !record.refunded && typeof record.sessionId === 'string') sessionId = record.sessionId;
      } catch { /* ignore */ }
    }
  }
  if (!/^cs_(live|test)_[A-Za-z0-9]{10,250}$/.test(sessionId)) {
    return json(request, { error: 'Vault is locked' }, 403);
  }
  let session;
  try {
    session = await retrieveSession(env, sessionId);
  } catch (error) {
    if (error.status === 404) return json(request, { error: 'Vault is locked' }, 403);
    return json(request, { error: 'Unable to reach Stripe' }, 502);
  }
  if (!isPaidVaultSession(session)) return json(request, { error: 'Vault is locked' }, 403);
  await rememberEntitlement(env, session);
  const answers = sessionAnswers(session) || parseAnswers(body?.answers);
  if (!answers) return json(request, { error: 'Quiz answers are missing. Retake the quiz on this device.' }, 409);
  return json(request, { pack: buildVaultPack(answers) });
}

async function billingPortal(request, env) {
  const limited = await rateLimit(request, env, 'billing-portal', 10);
  if (limited) return limited;
  if (!env.STRIPE_SECRET_KEY) return json(request, { error: 'Payment service is not configured' }, 503);
  const body = await readJson(request);
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  if (!/^cs_(live|test)_[A-Za-z0-9]{10,250}$/.test(sessionId)) {
    return json(request, { error: 'Invalid checkout session' }, 400);
  }
  let session;
  try {
    session = await retrieveSession(env, sessionId);
  } catch (error) {
    if (error.status === 404) return json(request, { error: 'Unknown session' }, 404);
    return json(request, { error: 'Unable to reach Stripe' }, 502);
  }
  const customer = typeof session.customer === 'string' ? session.customer : null;
  if (!customer) {
    return json(request, {
      error: 'We could not find a receipt for this checkout yet. Email info@frenchyfab.com and we will send it or help with a refund.',
    }, 409);
  }
  try {
    const portal = await stripe(env, '/billing_portal/sessions', {
      method: 'POST',
      body: formBody({ customer, return_url: `${allowedOrigin(request)}/` }),
    });
    if (!portal.url) {
      console.error('billing-portal missing url');
      return json(request, {
        error: 'Receipts are not available right now. Email info@frenchyfab.com and we will send your receipt or help with a refund.',
      }, 502);
    }
    return json(request, { url: portal.url });
  } catch (error) {
    console.error('billing-portal', error.message);
    return json(request, {
      error: 'Receipts are not available right now. Email info@frenchyfab.com and we will send your receipt or help with a refund.',
    }, 502);
  }
}

async function restorePurchase(request, env) {
  const limited = await rateLimit(request, env, 'restore-purchase', 8);
  if (limited) return limited;
  if (!env.STRIPE_SECRET_KEY || !env.BREVO_API_KEY) {
    return json(request, { error: 'Purchase recovery is not configured' }, 503);
  }
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  if (!isValidEmail(email)) return json(request, { error: 'A valid email is required' }, 400);

  try {
    const list = await stripe(env, `/checkout/sessions?limit=20&status=complete&customer_details[email]=${encodeURIComponent(email)}`);
    for (const candidate of list.data || []) {
      if (candidate.payment_status !== 'paid') continue;
      const session = await retrieveSession(env, candidate.id);
      if (!isPaidVaultSession(session)) continue;
      if (await firstTime(env, `recovery:${session.id}`, RECOVERY_COOLDOWN_S, true)) {
        await sendVaultEmail(env, email, session.id, 'Here is your Care Vault link');
      }
      break;
    }
    // Same answer whether or not a purchase exists, so this route cannot be used to test emails.
    return json(request, { ok: true });
  } catch (error) {
    console.error('restore-purchase', error.message);
    return json(request, { error: 'Purchase recovery is unavailable' }, 502);
  }
}

/* --------------------------------------------------------------- lead routes */

function handleHealth(request, env) {
  return json(request, {
    ok: true,
    worker: WORKER_VERSION,
    stripeConfigured: Boolean(env.STRIPE_SECRET_KEY),
    webhookConfigured: Boolean(env.STRIPE_WEBHOOK_SECRET),
    brevoConfigured: Boolean(env.BREVO_API_KEY),
    kvBound: Boolean(env.CAREPLAN_KV),
    checkoutMode: env.CHECKOUT_VIA_LINKS === '1' ? 'payment-links' : 'checkout-sessions',
  });
}

/** Positive integer from BREVO_LIST_ID. Unset means list 8, the current dashboard value. */
export function brevoListId(env) {
  const raw = env.BREVO_LIST_ID == null || String(env.BREVO_LIST_ID).trim() === '' ? '8' : String(env.BREVO_LIST_ID).trim();
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function brevoErrorText(res) {
  const detail = await res.text().catch(() => '');
  return detail.slice(0, 300);
}

async function brevoUpsertContact(env, email, answers, listId) {
  const baseAttrs = { SOURCE: 'frenchie-care-app', LAST_CARE_OPTIN_AT: new Date().toISOString() };
  const attributes = { ...baseAttrs };
  if (answers) {
    attributes.FRENCHIE_STAGE = answers.lifeStage;
    attributes.FRENCHIE_CONCERN = answers.concern;
  }
  const send = (attrs) => fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'api-key': env.BREVO_API_KEY },
    body: JSON.stringify({ email, attributes: attrs, listIds: [listId], updateEnabled: true }),
  });

  let res = await send(attributes);
  if (!(res.ok || res.status === 204) && answers) {
    console.error('brevo contact rejected', res.status, 'list', listId, await brevoErrorText(res));
    res = await send(baseAttrs);
  }
  if (!(res.ok || res.status === 204)) {
    console.error('brevo contact failed', res.status, 'list', listId, await brevoErrorText(res));
    return false;
  }
  return true;
}

async function handleLeadCapture(request, env) {
  const limited = await rateLimit(request, env, 'lead', 12);
  if (limited) return limited;
  const payload = (await readJson(request)) || {};
  const email = normalizeEmail(payload.email);
  if (!isValidEmail(email)) return json(request, { success: false, message: 'A valid email is required.' }, 400);
  const answers = parseAnswers(payload.answers);

  let stored = false;
  try {
    const mirror = await fetch(`${LEAD_STORE}/rest/v1/email_subscribers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, name: '', source: payload.source || 'frenchie-care-compass', quiz: answers }),
    });
    stored = mirror.ok;
    if (!mirror.ok) console.error('lead store failed', mirror.status);
  } catch (error) {
    console.error('lead store', error.message);
  }

  if (!env.BREVO_API_KEY) {
    console.error('brevo contact skipped: BREVO_API_KEY is not set');
    return json(request, { success: false, message: 'Email capture is not configured. Your plan stays on this device.', stored }, 503);
  }
  const listId = brevoListId(env);
  if (!listId) {
    console.error('brevo contact skipped: BREVO_LIST_ID is not a positive integer');
    return json(request, { success: false, message: 'Email capture is not configured. Your plan stays on this device.', stored }, 503);
  }

  let brevo = false;
  try {
    brevo = await brevoUpsertContact(env, email, answers, listId);
  } catch (error) {
    console.error('brevo contact', error.message);
  }
  if (!brevo) {
    return json(request, { success: false, message: 'We could not save your email. Your plan stays on this device.', brevo: false, stored }, 502);
  }
  return json(request, { success: true, id: `cf_${Date.now().toString(36)}`, brevo: true, stored });
}

async function proxyWp(request, url) {
  if (!['GET', 'POST', 'HEAD'].includes(request.method)) return json(request, { error: 'Method not allowed' }, 405);
  const suffix = url.pathname.replace('/api/ffab-care/v1', '');
  const headers = new Headers(request.headers);
  headers.delete('origin');
  headers.delete('referer');
  headers.delete('cookie');
  headers.delete('authorization');
  const res = await fetch(WP_ENDPOINT + suffix + url.search, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'follow',
  });
  const out = new Headers(res.headers);
  Object.entries(corsHeaders(request)).forEach(([k, v]) => out.set(k, v));
  return new Response(request.method === 'HEAD' ? null : res.body, { status: res.status, headers: out });
}

/* ------------------------------------------------------------ static site */

/** Rewrites leftovers from older Lovable/Supabase bundles. Harmless on the current build. */
function rewriteLegacy(body) {
  return body
    .replaceAll(WP_ENDPOINT, `${PUBLIC_ORIGIN}/api/ffab-care/v1`)
    .replaceAll('https://frenchie-care-compass.lovable.app', PUBLIC_ORIGIN)
    .replaceAll('frenchie-care-compass.lovable.app', 'care-plan.frenchyfab.com')
    .replaceAll('https://zyxsijqazzhuudhmfitw.supabase.co', PUBLIC_ORIGIN)
    .replace(/<script[^>]+src=["']\/~flock\.js["'][^>]*><\/script>/gi, '');
}

async function serveStatic(request, url) {
  const method = request.method === 'HEAD' ? 'GET' : request.method;
  const headers0 = new Headers(request.headers);
  headers0.delete('host');
  headers0.delete('cookie');
  let res = await fetch(`${STATIC_ORIGIN}${url.pathname}${url.search}`, { method, headers: headers0, redirect: 'follow' });

  // SPA routes such as /payment-success: serve the app shell instead of the host's 404.
  if (res.status === 404 && method === 'GET' && !/\.[a-z0-9]{2,5}$/i.test(url.pathname)) {
    const shell = await fetch(`${STATIC_ORIGIN}/index.html`);
    if (shell.ok) res = new Response(shell.body, { status: 200, headers: shell.headers });
  }

  const headers = new Headers(res.headers);
  headers.set('x-careplan-edge', WORKER_VERSION);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-frame-options', 'DENY');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains; preload');
  headers.delete('x-robots-tag');
  if (url.pathname.startsWith('/payment-success')) headers.set('x-robots-tag', 'noindex');

  const ct = headers.get('content-type') || '';
  if (ct.includes('text/html') || ct.includes('javascript')) {
    const text = rewriteLegacy(await res.text());
    headers.delete('content-length');
    if (ct.includes('text/html')) {
      headers.set('content-security-policy', SECURITY_CSP);
      headers.set('cache-control', 'public, max-age=300, must-revalidate');
    }
    return new Response(request.method === 'HEAD' ? null : text, { status: res.status, headers });
  }
  return new Response(request.method === 'HEAD' ? null : res.body, { status: res.status, headers });
}

/* ------------------------------------------------------------------- router */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.hostname !== 'care-plan.frenchyfab.com') return fetch(request);

    const isApi = url.pathname.startsWith('/functions/v1/') || url.pathname.startsWith('/api/');
    if (isApi && request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });

    if (url.pathname.startsWith('/functions/v1/auth/')) return routeAuth(request, env, url.pathname, json);

    switch (url.pathname) {
      case '/functions/v1/create-payment':
        return request.method === 'POST' ? createPayment(request, env) : json(request, { error: 'Method not allowed' }, 405);
      case '/functions/v1/verify-payment':
        return request.method === 'POST' ? verifyPayment(request, env) : json(request, { error: 'Method not allowed' }, 405);
      case '/functions/v1/restore-purchase':
        return request.method === 'POST' ? restorePurchase(request, env) : json(request, { error: 'Method not allowed' }, 405);
      case '/functions/v1/stripe-webhook':
        return request.method === 'POST' ? handleStripeWebhook(request, env) : json(request, { error: 'Method not allowed' }, 405);
      case '/functions/v1/vault-content':
        return request.method === 'POST' ? vaultContent(request, env) : json(request, { error: 'Method not allowed' }, 405);
      case '/functions/v1/billing-portal':
        return request.method === 'POST' ? billingPortal(request, env) : json(request, { error: 'Method not allowed' }, 405);
      case '/api/ffab-care/v1/health':
        return request.method === 'GET' ? handleHealth(request, env) : json(request, { error: 'Method not allowed' }, 405);
      case '/api/ffab-care/v1/lead':
      case '/api/ffab-care/v1/email':
        return request.method === 'POST' ? handleLeadCapture(request, env, ctx) : json(request, { error: 'Method not allowed' }, 405);
      default:
        break;
    }
    if (url.pathname.startsWith('/api/ffab-care/v1')) return proxyWp(request, url);
    if (url.pathname.startsWith('/functions/v1/')) return json(request, { error: 'Not found' }, 404);
    return serveStatic(request, url);
  },
};
