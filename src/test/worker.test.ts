// Runs under jsdom like the rest of the suite; Request/Response/fetch are stubbed per test.
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker, {
  EMERGENCY_CARD_PRICE_ID,
  PREMIUM_PRICE_ID,
  isPaidVaultSession,
  parseAnswers,
  vaultEmailHtml,
  verifyStripeSignature,
  brevoListId,
} from '../../worker/careplan-proxy.js';

const SESSION = 'cs_test_a1B2c3D4e5F6g7H8';
const ANSWERS = { lifeStage: 'adult', weight: '20-28', bodyCondition: 5, concern: 'breathing', activityLevel: 'moderate', environment: ['apartment', 'hot'] };

type Call = { url: string; init?: RequestInit };

function paidSession(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION,
    status: 'complete',
    payment_status: 'paid',
    customer_details: { email: 'Buyer@Example.com' },
    metadata: { answers: JSON.stringify(ANSWERS) },
    line_items: { data: [{ price: { id: PREMIUM_PRICE_ID } }, { price: { id: EMERGENCY_CARD_PRICE_ID } }] },
    payment_intent: { id: 'pi_123', metadata: {}, latest_charge: { refunded: false, amount_refunded: 0 } },
    ...overrides,
  };
}

function mockFetch(routes: Array<[RegExp, (call: Call) => Response]>) {
  const calls: Call[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const call = { url, init };
    calls.push(call);
    const hit = routes.find(([re]) => re.test(url));
    if (!hit) return new Response('not mocked', { status: 599 });
    return hit[1](call);
  });
  vi.stubGlobal('fetch', fn);
  return calls;
}

const ok = (body: unknown) => () => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
function fakeKv(seed: Record<string, string> = {}) {
  const store = new Map(Object.entries(seed));
  return {
    store,
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => { store.set(k, v); },
    delete: async (k: string) => { store.delete(k); },
  };
}
const baseEnv = { STRIPE_SECRET_KEY: 'rk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_test_secret_123', BREVO_API_KEY: 'brevo_x' };
let env: Record<string, unknown> = { ...baseEnv, CAREPLAN_KV: fakeKv() };

function post(path: string, body: unknown, origin = 'https://care-plan.frenchyfab.com') {
  return new Request(`https://care-plan.frenchyfab.com${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify(body),
  });
}

async function signWebhook(payload: string, secret: string, ts = Math.floor(Date.now() / 1000)) {
  const encoder = new TextEncoder();
  const key = await webcrypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await webcrypto.subtle.sign('HMAC', key, encoder.encode(`${ts}.${payload}`));
  const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `t=${ts},v1=${hex}`;
}

beforeEach(() => { vi.stubGlobal('crypto', webcrypto); });
afterEach(() => { vi.unstubAllGlobals(); env = { ...baseEnv, CAREPLAN_KV: fakeKv() }; });

describe('worker: payment rules', () => {
  it('treats only complete, paid, unrefunded vault sessions as paid', () => {
    expect(isPaidVaultSession(paidSession())).toBe(true);
    expect(isPaidVaultSession(paidSession({ payment_status: 'unpaid' }))).toBe(false);
    expect(isPaidVaultSession(paidSession({ status: 'open' }))).toBe(false);
    expect(isPaidVaultSession(paidSession({ line_items: { data: [{ price: { id: EMERGENCY_CARD_PRICE_ID } }] } }))).toBe(false);
    expect(isPaidVaultSession(paidSession({ payment_intent: { id: 'pi', latest_charge: { refunded: true } } }))).toBe(false);
    expect(isPaidVaultSession(paidSession({ payment_intent: { id: 'pi', latest_charge: { amount_refunded: 799 } } }))).toBe(false);
  });

  it('validates quiz answers before they reach Stripe metadata', () => {
    expect(parseAnswers(ANSWERS)).toEqual(ANSWERS);
    expect(parseAnswers({ ...ANSWERS, concern: 'leash' })).toBeNull();
    expect(parseAnswers({ ...ANSWERS, bodyCondition: 12 })).toBeNull();
  });

  it('escapes the link in the access email', () => {
    expect(vaultEmailHtml('https://x/"><script>', 'Hi')).not.toContain('<script>');
  });
});

describe('worker: /functions/v1/verify-payment', () => {
  it('returns 503 without a Stripe key, so the app never unlocks by default', async () => {
    mockFetch([]);
    const res = await worker.fetch(post('/functions/v1/verify-payment', { sessionId: SESSION }), {}, undefined);
    expect(res.status).toBe(503);
  });

  it('rejects malformed session ids without calling Stripe', async () => {
    const calls = mockFetch([]);
    const res = await worker.fetch(post('/functions/v1/verify-payment', { sessionId: 'cs_x"; drop' }), env, undefined);
    expect(res.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('confirms a paid session, returns answers, and sends the access email once', async () => {
    const calls = mockFetch([
      [/api\.stripe\.com\/v1\/checkout\/sessions\/cs_test/, ok(paidSession())],
      [/api\.brevo\.com\/v3\/smtp\/email/, ok({ messageId: 'm1' })],
    ]);
    const res = await worker.fetch(post('/functions/v1/verify-payment', { sessionId: SESSION, fulfil: true }), env, undefined);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ paid: true, refunded: false, sessionId: SESSION, email: 'buyer@example.com', includeEmergencyCard: true, answers: ANSWERS });
    expect(calls.some((c) => c.init?.method === 'POST' && c.url.includes('api.stripe.com'))).toBe(false);
    expect((env.CAREPLAN_KV as ReturnType<typeof fakeKv>).store.has(`sent:${SESSION}`)).toBe(true);
    const mail = calls.find((c) => c.url.includes('smtp/email'));
    expect(mail).toBeTruthy();
    expect(String(mail?.init?.body)).toContain(`session_id=${SESSION}&amp;via=email`);
  });

  it('only emails when the success page asks for fulfilment', async () => {
    const calls = mockFetch([[/checkout\/sessions\/cs_test/, ok(paidSession())]]);
    const body = await (await worker.fetch(post('/functions/v1/verify-payment', { sessionId: SESSION }), env, undefined)).json();
    expect(body.paid).toBe(true);
    expect(calls.some((c) => c.url.includes('brevo'))).toBe(false);
  });

  it('does not resend the access email once KV remembers it', async () => {
    env.CAREPLAN_KV = fakeKv({ [`sent:${SESSION}`]: 'earlier' });
    const calls = mockFetch([[/checkout\/sessions\/cs_test/, ok(paidSession())]]);
    const res = await worker.fetch(post('/functions/v1/verify-payment', { sessionId: SESSION, fulfil: true }), env, undefined);
    expect((await res.json()).paid).toBe(true);
    expect(calls.some((c) => c.url.includes('brevo'))).toBe(false);
  });

  it('reports refunded sessions as not paid and hides answers', async () => {
    mockFetch([[/checkout\/sessions\/cs_test/, ok(paidSession({ payment_intent: { id: 'pi', latest_charge: { refunded: true } } }))]]);
    const body = await (await worker.fetch(post('/functions/v1/verify-payment', { sessionId: SESSION }), env, undefined)).json();
    expect(body).toMatchObject({ paid: false, refunded: true, answers: null, includeEmergencyCard: false });
  });
});

describe('worker: /functions/v1/stripe-webhook', () => {
  it('returns 503 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
    const res = await worker.fetch(post('/functions/v1/stripe-webhook', {}), { STRIPE_SECRET_KEY: 'rk_test_x' }, undefined);
    expect(res.status).toBe(503);
  });

  it('rejects invalid signatures and stale timestamps', async () => {
    const payload = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: SESSION } } });
    const badRes = await worker.fetch(new Request('https://care-plan.frenchyfab.com/functions/v1/stripe-webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': 't=1700000000,v1=deadbeef' },
      body: payload,
    }), env, undefined);
    expect(badRes.status).toBe(400);

    const oldTs = Math.floor(Date.now() / 1000) - 600;
    const oldSig = await signWebhook(payload, baseEnv.STRIPE_WEBHOOK_SECRET, oldTs);
    expect(await verifyStripeSignature(payload, oldSig, baseEnv.STRIPE_WEBHOOK_SECRET)).toBe(false);
  });

  it('verifies checkout.session.completed and sends the fulfilment email once', async () => {
    const payload = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: SESSION } } });
    const sig = await signWebhook(payload, baseEnv.STRIPE_WEBHOOK_SECRET);
    const calls = mockFetch([
      [/checkout\/sessions\/cs_test/, ok(paidSession())],
      [/smtp\/email/, ok({ messageId: 'wh1' })],
    ]);
    const req = new Request('https://care-plan.frenchyfab.com/functions/v1/stripe-webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': sig },
      body: payload,
    });
    const res = await worker.fetch(req, env, undefined);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, fulfilled: true });
    expect(calls.filter((c) => c.url.includes('smtp/email'))).toHaveLength(1);

    // Duplicate delivery from Stripe should not resend email
    const retryCalls = mockFetch([[/checkout\/sessions\/cs_test/, ok(paidSession())]]);
    const retryReq = new Request('https://care-plan.frenchyfab.com/functions/v1/stripe-webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': sig },
      body: payload,
    });
    const retryRes = await worker.fetch(retryReq, env, undefined);
    expect(retryRes.status).toBe(200);
    expect(retryCalls.some((c) => c.url.includes('smtp/email'))).toBe(false);
  });
});

describe('worker: unknown sessions', () => {
  it('answers 200 paid:false when Stripe has no such session', async () => {
    mockFetch([[/checkout\/sessions\/cs_test/, () => new Response(JSON.stringify({ error: { message: 'No such checkout.session' } }), { status: 404 })]]);
    const res = await worker.fetch(post('/functions/v1/verify-payment', { sessionId: SESSION }), env, undefined);
    expect(res.status).toBe(200);
    expect((await res.json()).paid).toBe(false);
  });
});

describe('worker: /functions/v1/create-payment', () => {
  it('creates a Checkout Session with a session-id success URL and both prices when bumped', async () => {
    const calls = mockFetch([[/checkout\/sessions$/, ok({ id: SESSION, url: 'https://checkout.stripe.com/c/pay/x' })]]);
    const res = await worker.fetch(post('/functions/v1/create-payment', { email: 'a@b.co', addBump: true, answers: ANSWERS }), env, undefined);
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.com/c/pay/x' });
    const form = new URLSearchParams(String(calls[0].init?.body));
    expect(form.get('success_url')).toBe('https://care-plan.frenchyfab.com/payment-success?session_id={CHECKOUT_SESSION_ID}');
    expect(form.get('customer_creation')).toBe('always');
    expect(form.get('line_items[0][price]')).toBe(PREMIUM_PRICE_ID);
    expect(form.get('line_items[1][price]')).toBe(EMERGENCY_CARD_PRICE_ID);
    expect(JSON.parse(form.get('metadata[answers]') || '{}')).toEqual(ANSWERS);
  });

  it('never auto-emails without KV, so it cannot repeat on every visit', async () => {
    env = { ...baseEnv };
    const calls = mockFetch([[/checkout\/sessions\/cs_test/, ok(paidSession())]]);
    const body = await (await worker.fetch(post('/functions/v1/verify-payment', { sessionId: SESSION, fulfil: true }), env, undefined)).json();
    expect(body.paid).toBe(true);
    expect(calls.some((c) => c.url.includes('brevo'))).toBe(false);
  });
});

describe('worker: /functions/v1/create-payment (link mode)', () => {
  it('answers 503 at once when CHECKOUT_VIA_LINKS=1, so the app uses the Payment Link', async () => {
    const calls = mockFetch([]);
    const res = await worker.fetch(post('/functions/v1/create-payment', { email: 'a@b.co' }), { ...env, CHECKOUT_VIA_LINKS: '1' }, undefined);
    expect(res.status).toBe(503);
    expect(calls).toHaveLength(0);
  });

  it('uses localhost return URLs only for the dev origin', async () => {
    const calls = mockFetch([[/checkout\/sessions$/, ok({ id: SESSION, url: 'https://checkout.stripe.com/x' })]]);
    await worker.fetch(post('/functions/v1/create-payment', { email: 'a@b.co' }, 'https://evil.example'), env, undefined);
    expect(new URLSearchParams(String(calls[0].init?.body)).get('cancel_url')).toBe('https://care-plan.frenchyfab.com/?checkout=cancelled');
  });
});

describe('worker: /functions/v1/restore-purchase', () => {
  it('answers the same way for unknown emails', async () => {
    const calls = mockFetch([[/checkout\/sessions\?/, ok({ data: [] })]]);
    const res = await worker.fetch(post('/functions/v1/restore-purchase', { email: 'nobody@example.com' }), env, undefined);
    expect(await res.json()).toEqual({ ok: true });
    expect(calls[0].url).toContain('customer_details[email]=nobody%40example.com');
    expect(calls.some((c) => c.url.includes('brevo'))).toBe(false);
  });

  it('emails a buyer once per cooldown window', async () => {
    const calls = mockFetch([
      [/checkout\/sessions\?/, ok({ data: [{ id: SESSION, payment_status: 'paid' }] })],
      [/checkout\/sessions\/cs_test/, ok(paidSession())],
      [/smtp\/email/, ok({})],
    ]);
    await worker.fetch(post('/functions/v1/restore-purchase', { email: 'buyer@example.com' }), env, undefined);
    expect(calls.filter((c) => c.url.includes('smtp/email'))).toHaveLength(1);

    const recent = mockFetch([
      [/checkout\/sessions\?/, ok({ data: [{ id: SESSION, payment_status: 'paid' }] })],
      [/checkout\/sessions\/cs_test/, ok(paidSession())],
    ]);
    await worker.fetch(post('/functions/v1/restore-purchase', { email: 'buyer@example.com' }), env, undefined);
    expect(recent.some((c) => c.url.includes('smtp/email'))).toBe(false);
  });
});

describe('worker: health & lead capture', () => {
  it('exposes boolean readiness flags without leaking secrets', async () => {
    const res = await worker.fetch(new Request('https://care-plan.frenchyfab.com/api/ffab-care/v1/health'), env, undefined);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      stripeConfigured: true,
      webhookConfigured: true,
      brevoConfigured: true,
      kvBound: true,
      checkoutMode: 'checkout-sessions',
    });
    expect(JSON.stringify(body)).not.toContain('rk_test_x');
    expect(JSON.stringify(body)).not.toContain('whsec_');
  });

  it('refuses invalid emails instead of reporting success', async () => {
    mockFetch([]);
    const res = await worker.fetch(post('/api/ffab-care/v1/lead', { email: 'nope' }), env, undefined);
    expect(res.status).toBe(400);
  });

  it('reads the Brevo list id from the worker var and defaults to 8', () => {
    expect(brevoListId({})).toBe(8);
    expect(brevoListId({ BREVO_LIST_ID: '42' })).toBe(42);
    expect(brevoListId({ BREVO_LIST_ID: 'nope' })).toBeNull();
  });

  it('posts the configured Brevo list and does not report success when Brevo rejects the contact', async () => {
    env.BREVO_LIST_ID = '42';
    const calls = mockFetch([
      [/email_subscribers/, ok({})],
      [/api\.brevo\.com\/v3\/contacts/, () => new Response('{"message":"IP not allowed"}', { status: 401 })],
    ]);
    const res = await worker.fetch(post('/api/ffab-care/v1/lead', { email: 'lead@example.com', answers: ANSWERS }), env, undefined);
    const body = await res.json();
    expect(res.status).toBe(502);
    expect(body.success).toBe(false);
    expect(body.brevo).toBe(false);
    const contactCalls = calls.filter((c) => c.url.includes('/v3/contacts'));
    expect(contactCalls.length).toBeGreaterThan(0);
    for (const call of contactCalls) {
      expect(JSON.parse(String(call.init?.body)).listIds).toEqual([42]);
    }
  });
});

describe('worker: static site & security headers', () => {
  it('serves pages from the Git-connected Pages project with CSP and security headers', async () => {
    const calls = mockFetch([[/frenchie-care-compass\.pages\.dev\/payment-success/, () => new Response('<html><head></head></html>', { status: 200, headers: { 'content-type': 'text/html' } })]]);
    const res = await worker.fetch(new Request('https://care-plan.frenchyfab.com/payment-success?session_id=x'), env, undefined);
    expect(res.status).toBe(200);
    expect(calls[0].url).toBe('https://frenchie-care-compass.pages.dev/payment-success?session_id=x');
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(res.headers.get('strict-transport-security')).toContain('max-age=31536000');
  });
});

describe('worker: vault content is server-gated', () => {
  it('does not return the program when Stripe says the session is unpaid', async () => {
    mockFetch([[/checkout\/sessions\/cs_test/, ok(paidSession({ payment_status: 'unpaid' }))]]);
    const res = await worker.fetch(post('/functions/v1/vault-content', { sessionId: SESSION, answers: ANSWERS }), env, undefined);
    expect(res.status).toBe(403);
    expect(JSON.stringify(await res.json())).not.toContain('4-week');
  });

  it('returns the program only after Stripe confirms the vault price was paid', async () => {
    mockFetch([[/checkout\/sessions\/cs_test/, ok(paidSession())]]);
    const res = await worker.fetch(post('/functions/v1/vault-content', { sessionId: SESSION, answers: ANSWERS }), env, undefined);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.pack.program.weeks).toHaveLength(4);
    expect(body.pack.modules.length).toBeGreaterThan(0);
    expect((env.CAREPLAN_KV as ReturnType<typeof fakeKv>).store.has(`entitlement:email:buyer@example.com`)).toBe(true);
  });
});

describe('worker: refunds and accounts', () => {
  it('does not send a fulfilment email from the webhook without KV', async () => {
    const payload = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: SESSION } } });
    const sig = await signWebhook(payload, baseEnv.STRIPE_WEBHOOK_SECRET);
    const calls = mockFetch([[/checkout\/sessions\/cs_test/, ok(paidSession())], [/smtp\/email/, ok({})]]);
    const res = await worker.fetch(new Request('https://care-plan.frenchyfab.com/functions/v1/stripe-webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': sig },
      body: payload,
    }), { ...baseEnv }, undefined);
    expect(res.status).toBe(200);
    expect(calls.some((c) => c.url.includes('smtp'))).toBe(false);
  });

  it('revokes a stored entitlement when Stripe reports a refund', async () => {
    env.CAREPLAN_KV = fakeKv({
      'entitlement:pi:pi_123': JSON.stringify({ sessionId: SESSION, email: 'buyer@example.com', paid: true, refunded: false, paymentIntentId: 'pi_123' }),
    });
    const payload = JSON.stringify({ type: 'charge.refunded', data: { object: { payment_intent: 'pi_123' } } });
    const sig = await signWebhook(payload, baseEnv.STRIPE_WEBHOOK_SECRET);
    const res = await worker.fetch(new Request('https://care-plan.frenchyfab.com/functions/v1/stripe-webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': sig },
      body: payload,
    }), env, undefined);
    expect((await res.json()).revoked).toBe(true);
    const stored = JSON.parse(String(await (env.CAREPLAN_KV as ReturnType<typeof fakeKv>).get('entitlement:email:buyer@example.com')));
    expect(stored).toMatchObject({ paid: false, refunded: true });
  });

  it('returns 503 for accounts when KV is not bound', async () => {
    const res = await worker.fetch(post('/functions/v1/auth/login', { email: 'a@b.co', password: 'correct-horse' }), { ...baseEnv }, undefined);
    expect(res.status).toBe(503);
  });

  it('signs up, rejects a bad password, resets, and logs out', async () => {
    const signup = await worker.fetch(post('/functions/v1/auth/signup', { email: 'Owner@Example.com', password: 'correct-horse' }), env, undefined);
    expect(signup.status).toBe(200);
    expect((await signup.json()).email).toBe('owner@example.com');

    const bad = await worker.fetch(post('/functions/v1/auth/login', { email: 'owner@example.com', password: 'wrong-password' }), env, undefined);
    expect(bad.status).toBe(401);

    const forgotCalls = mockFetch([[/smtp\/email/, ok({})]]);
    const forgot = await worker.fetch(post('/functions/v1/auth/forgot', { email: 'owner@example.com' }), env, undefined);
    expect(await forgot.json()).toEqual({ ok: true });
    const mail = String(forgotCalls.find((c) => c.url.includes('smtp'))?.init?.body || '');
    const token = decodeURIComponent((mail.match(/token=([A-Za-z0-9_-]+)/) || [])[1] || '');
    expect(token.length).toBeGreaterThan(20);

    const unknown = await worker.fetch(post('/functions/v1/auth/forgot', { email: 'nobody@example.com' }), env, undefined);
    expect(await unknown.json()).toEqual({ ok: true });

    const reset = await worker.fetch(post('/functions/v1/auth/reset', { token, password: 'new-password-1' }), env, undefined);
    expect(reset.status).toBe(200);

    const relog = await worker.fetch(post('/functions/v1/auth/login', { email: 'owner@example.com', password: 'new-password-1' }), env, undefined);
    expect(relog.status).toBe(200);
    const cookie = (relog.headers.get('set-cookie') || '').split(';')[0];
    const session = await worker.fetch(new Request('https://care-plan.frenchyfab.com/functions/v1/auth/session', { headers: { cookie } }), env, undefined);
    expect((await session.json()).authenticated).toBe(true);

    const out = await worker.fetch(new Request('https://care-plan.frenchyfab.com/functions/v1/auth/logout', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: '{}',
    }), env, undefined);
    expect((await out.json()).authenticated).toBe(false);
  });
});
