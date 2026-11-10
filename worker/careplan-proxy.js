/**
 * care-plan.frenchyfab.com edge worker.
 *
 * Serves the static app from GitHub Pages and is the app's only backend:
 *   POST /functions/v1/create-payment    -> Stripe Checkout Session (signed, server-side)
 *   POST /functions/v1/verify-payment    -> asks Stripe whether a session is paid and not refunded
 *   POST /functions/v1/restore-purchase  -> emails the buyer a fresh access link (no email oracle)
 *   POST /api/ffab-care/v1/lead          -> lead capture (Brevo list + central lead store)
 *   *    /api/ffab-care/v1/*             -> proxied to the FrenchyFab WordPress REST namespace
 *
 * Secrets / vars / bindings (Cloudflare dashboard -> Workers -> this worker -> Settings):
 *   STRIPE_SECRET_KEY   secret. Restricted key with Checkout Sessions read is the minimum
 *                       (verify + recovery). Checkout Sessions write lets the worker create
 *                       sessions itself; without it, set CHECKOUT_VIA_LINKS=1 and the app
 *                       uses the Stripe Payment Links (which return with {CHECKOUT_SESSION_ID}).
 *   CAREPLAN_KV         optional KV namespace for "access email sent" / recovery cooldown.
 *                       Without it the edge cache (caches.default) holds those markers.
 *   CHECKOUT_VIA_LINKS  "1" = skip session creation and let the app use Payment Links.
 *   BREVO_API_KEY       secret. Used for the list sync and the access-link emails.
 *   BREVO_LIST_ID       optional, defaults to 8.
 *   MAIL_FROM           optional, defaults to info@frenchyfab.com (must be a Brevo-verified sender).
 *
 * Without STRIPE_SECRET_KEY the payment routes answer 503 and the app falls back to the
 * Stripe Payment Links. Nothing on this worker ever unlocks premium without Stripe saying "paid".
 */

export const PUBLIC_ORIGIN = 'https://care-plan.frenchyfab.com';
export const PREMIUM_PRICE_ID = 'price_1TFD07GCqwm95OGXc26k5JkI';
export const EMERGENCY_CARD_PRICE_ID = 'price_1THjRhGCqwm95OGXJZf9x553';

const WP_ENDPOINT = 'https://frenchyfab.com/wp-json/ffab-care/v1';
const LEAD_STORE = 'https://app-lead-capture.papalexios.workers.dev/app/frenchyfab';
const LEGACY_SUPABASE = 'https://zyxsijqazzhuudhmfitw.supabase.co';
const LEGACY_LOVABLE = 'https://frenchie-care-compass.lovable.app';
const LEGACY_PREVIEW_IMAGE = 'https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a16fe0ea-6047-405d-be60-be21b4d9cf2a/id-preview-6a18becc--b482264c-d3a9-4d34-8494-65bbdfbb0069.lovable.app-1774460137350.png';
const DEV_ORIGINS = ['http://localhost:8080', 'http://127.0.0.1:8080'];
const RECOVERY_COOLDOWN_S = 10 * 60;
const SUPPORT_EMAIL = 'info@frenchyfab.com';

/* ------------------------------------------------------------------ helpers */

function allowedOrigin(request) {
  const origin = request.headers.get('origin') || '';
  return origin === PUBLIC_ORIGIN || DEV_ORIGINS.includes(origin) ? origin : PUBLIC_ORIGIN;
}

function corsHeaders(request) {
  return {
    'access-control-allow-origin': allowedOrigin(request),
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type, authorization, x-requested-with',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

function json(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...corsHeaders(request) },
  });
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

/**
 * Returns true the first time it is called for `key` (and records it), false afterwards.
 * Without a KV binding it cannot remember anything, so it returns `fallback`.
 */
async function firstTime(env, key, ttlSeconds, fallback) {
  const kv = env.CAREPLAN_KV;
  if (kv) {
    if (await kv.get(key)) return false;
    await kv.put(key, new Date().toISOString(), ttlSeconds ? { expirationTtl: ttlSeconds } : undefined);
    return true;
  }
  // Edge cache marker: per data centre and best effort, but enough to stop repeats on reloads.
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
      sender: { email: env.MAIL_FROM || SUPPORT_EMAIL, name: 'Frenchy Fab' },
      replyTo: { email: SUPPORT_EMAIL },
      to: [{ email: to }],
      subject: 'Your Frenchie Care Vault access link',
      htmlContent: vaultEmailHtml(accessLink(sessionId), heading),
    }),
  });
  if (!res.ok) throw new Error(`Brevo send failed with ${res.status}`);
}

/* ------------------------------------------------------------ payment routes */

async function createPayment(request, env) {
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
    'line_items[0][price]': PREMIUM_PRICE_ID,
    'line_items[0][quantity]': '1',
    success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=cancelled`,
    'metadata[product]': 'frenchie-care-vault',
    'payment_intent_data[metadata][product]': 'frenchie-care-vault',
    'payment_intent_data[description]': 'Frenchie Care Vault',
  };
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

async function verifyPayment(request, env, ctx) {
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
    if (error.status === 404) return json(request, { paid: false, sessionId, error: 'Unknown session' }, 404);
    console.error('verify-payment', error.message);
    return json(request, { error: 'Unable to reach Stripe' }, 502);
  }

  const priceIds = sessionPriceIds(session);
  const paid = isPaidVaultSession(session);
  const email = sessionEmail(session);

  // Fulfilment email: only when the success page asks (fulfil: true), and once per session.
  if (paid && email && body?.fulfil === true && env.BREVO_API_KEY && await firstTime(env, `sent:${session.id}`, 0, false)) {
    const work = (async () => {
      try {
        await sendVaultEmail(env, email, session.id, 'Your Care Vault is ready');
      } catch (error) {
        console.error('fulfilment email', error.message);
      }
    })();
    if (ctx?.waitUntil) ctx.waitUntil(work); else await work;
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

async function restorePurchase(request, env) {
  if (!env.STRIPE_SECRET_KEY || !env.BREVO_API_KEY) {
    return json(request, { error: 'Purchase recovery is not configured' }, 503);
  }
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  if (!isValidEmail(email)) return json(request, { error: 'A valid email is required' }, 400);

  try {
    // customer_details[email] also finds guest checkouts from Payment Links (no Customer object).
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

async function handleLeadCapture(request, env, ctx) {
  const payload = (await readJson(request)) || {};
  const email = normalizeEmail(payload.email);
  if (!isValidEmail(email)) return json(request, { success: false, message: 'A valid email is required.' }, 400);
  const answers = parseAnswers(payload.answers);

  const mirror = fetch(`${LEAD_STORE}/rest/v1/email_subscribers`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, name: '', source: payload.source || 'frenchie-care-compass', quiz: answers }),
  }).catch(() => {});
  if (ctx?.waitUntil) ctx.waitUntil(mirror);

  let brevo = false;
  if (env.BREVO_API_KEY) {
    try {
      const attrs = { SOURCE: 'frenchie-care-app', LAST_CARE_OPTIN_AT: new Date().toISOString() };
      if (answers) {
        attrs.FRENCHIE_STAGE = answers.lifeStage;
        attrs.FRENCHIE_CONCERN = answers.concern;
      }
      const res = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'api-key': env.BREVO_API_KEY },
        body: JSON.stringify({ email, attributes: attrs, listIds: [Number(env.BREVO_LIST_ID || 8)], updateEnabled: true }),
      });
      brevo = res.ok || res.status === 204;
      if (!brevo && answers) {
        // Unknown custom attributes make Brevo reject the whole call. Retry with the base set.
        const retry = await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'api-key': env.BREVO_API_KEY },
          body: JSON.stringify({ email, attributes: { SOURCE: attrs.SOURCE, LAST_CARE_OPTIN_AT: attrs.LAST_CARE_OPTIN_AT }, listIds: [Number(env.BREVO_LIST_ID || 8)], updateEnabled: true }),
        });
        brevo = retry.ok || retry.status === 204;
      }
    } catch (error) {
      console.error('brevo contact', error.message);
    }
  }
  return json(request, { success: true, id: `cf_${Date.now().toString(36)}`, brevo });
}

async function proxyWp(request, url) {
  const suffix = url.pathname.replace('/api/ffab-care/v1', '');
  const headers = new Headers(request.headers);
  headers.delete('origin');
  headers.delete('referer');
  headers.delete('cookie');
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

/** Only needed while an old Lovable-era bundle is still published. Harmless afterwards. */
function rewriteLegacy(body) {
  let out = body
    .replaceAll(WP_ENDPOINT, `${PUBLIC_ORIGIN}/api/ffab-care/v1`)
    .replaceAll(LEGACY_LOVABLE, PUBLIC_ORIGIN)
    .replaceAll('frenchie-care-compass.lovable.app', 'care-plan.frenchyfab.com')
    .replaceAll(LEGACY_SUPABASE, PUBLIC_ORIGIN)
    .replace(/<script[^>]+src=["']\/~flock\.js["'][^>]*><\/script>/gi, '');
  if (body.includes('<html')) {
    out = out.replace(/<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${PUBLIC_ORIGIN}/" />`);
  }
  return out;
}

async function serveStatic(request, url) {
  const method = request.method === 'HEAD' ? 'GET' : request.method;
  let res = await fetch(new Request(request, { method, redirect: 'follow' }));
  if (url.pathname === '/og-image.png' && res.status === 404) {
    res = await fetch(LEGACY_PREVIEW_IMAGE);
  }
  // SPA routes such as /payment-success: serve the app shell instead of the host's 404.
  if (res.status === 404 && method === 'GET' && !/\.[a-z0-9]{2,5}$/i.test(url.pathname)) {
    const shell = await fetch(new URL('/index.html', url).toString());
    if (shell.ok) res = new Response(shell.body, { status: 200, headers: shell.headers });
  }
  const headers = new Headers(res.headers);
  headers.set('x-careplan-edge', 'worker-2026-11-10');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.delete('x-robots-tag');
  if (url.pathname.startsWith('/payment-success')) headers.set('x-robots-tag', 'noindex');

  const ct = headers.get('content-type') || '';
  if (ct.includes('text/html') || ct.includes('javascript')) {
    const text = rewriteLegacy(await res.text());
    headers.delete('content-length');
    if (ct.includes('text/html')) headers.set('cache-control', 'public, max-age=300, must-revalidate');
    return new Response(request.method === 'HEAD' ? null : text, { status: res.status, headers });
  }
  return new Response(request.method === 'HEAD' ? null : res.body, { status: res.status, headers });
}

/* ------------------------------------------------------------------- router */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.hostname !== 'care-plan.frenchyfab.com') return fetch(request);

    const isApi = url.pathname.startsWith('/functions/v1/') || url.pathname.startsWith('/api/') || url.pathname.startsWith('/rest/v1/');
    if (isApi && request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });

    switch (url.pathname) {
      case '/functions/v1/create-payment':
        return request.method === 'POST' ? createPayment(request, env) : json(request, { error: 'Method not allowed' }, 405);
      case '/functions/v1/verify-payment':
        return request.method === 'POST' ? verifyPayment(request, env, ctx) : json(request, { error: 'Method not allowed' }, 405);
      case '/functions/v1/restore-purchase':
        return request.method === 'POST' ? restorePurchase(request, env) : json(request, { error: 'Method not allowed' }, 405);
      case '/functions/v1/generate-plan':
        // The plan is built in the browser. Old bundles still call this; answer instantly.
        return json(request, { sections: null, fallback: true });
      case '/functions/v1/send-welcome-email':
        return json(request, { ok: true });
      case '/api/ffab-care/v1/lead':
      case '/api/ffab-care/v1/email':
        return request.method === 'POST' ? handleLeadCapture(request, env, ctx) : json(request, { error: 'Method not allowed' }, 405);
      default:
        break;
    }
    if (url.pathname.startsWith('/api/ffab-care/v1')) return proxyWp(request, url);
    if (url.pathname.startsWith('/rest/v1/')) {
      // Legacy Supabase table calls from the 2026-06 bundle. Accept and ignore.
      return json(request, []);
    }
    if (url.pathname.startsWith('/functions/v1/')) return json(request, { error: 'Not found' }, 404);
    return serveStatic(request, url);
  },
};
