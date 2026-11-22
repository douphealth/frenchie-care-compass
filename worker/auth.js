/**
 * Email + password accounts in CAREPLAN_KV.
 * The free quiz does not require an account. A paid vault stays tied to the Stripe
 * session; logging in with the checkout email surfaces that entitlement.
 *
 * Passwords are PBKDF2-SHA256 (100k). Only a hash of the session token is stored.
 */

const ITERATIONS = 100000;
const SESSION_TTL_S = 60 * 60 * 24 * 30;
const RESET_TTL_S = 60 * 30;
const COOKIE = 'care_session';
const PUBLIC_ORIGIN = 'https://care-plan.frenchyfab.com';
const SUPPORT_EMAIL = 'info@frenchyfab.com';
const FIXED_SALT = 'c2VydmVyLXNhbHQtZm9yLXRpbWluZw==';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isValidEmail(value) {
  const email = normalizeEmail(value);
  return email.length <= 254 && EMAIL_RE.test(email);
}

function bytesToB64(bytes) {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function b64ToBytes(value) {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function b64url(bytes) {
  return bytesToB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomBytes(n) {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password, saltB64) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: b64ToBytes(saltB64), iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return bytesToB64(new Uint8Array(bits));
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function passwordError(password, email) {
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    return 'Use a password between 10 and 128 characters.';
  }
  if (password.toLowerCase() === email) return 'Password cannot be the email address.';
  return '';
}

function parseCookies(request) {
  const out = {};
  const raw = request.headers.get('cookie') || '';
  raw.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i === -1) return;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function sessionCookie(request, token, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${token ? encodeURIComponent(token) : ''}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

async function rateLimit(env, request, bucket, limit) {
  const kv = env.CAREPLAN_KV;
  if (!kv) return false;
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  const key = `rl:${bucket}:${ip}`;
  const current = Number(await kv.get(key) || '0');
  if (current >= limit) return true;
  await kv.put(key, String(current + 1), { expirationTtl: 60 });
  return false;
}

async function readUser(env, email) {
  const raw = await env.CAREPLAN_KV.get(`user:${email}`);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function readAuthSession(request, env) {
  if (!env.CAREPLAN_KV) return null;
  const token = parseCookies(request)[COOKIE];
  if (!token || token.length < 20) return null;
  const raw = await env.CAREPLAN_KV.get(`session:${await sha256Hex(token)}`);
  if (!raw) return null;
  try {
    const record = JSON.parse(raw);
    if (!record?.email || (record.exp && record.exp < Date.now())) return null;
    return record;
  } catch {
    return null;
  }
}

async function entitlementFor(env, email) {
  const raw = await env.CAREPLAN_KV.get(`entitlement:email:${email}`);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendResetEmail(env, to, token) {
  if (!env.BREVO_API_KEY) throw new Error('Email is not configured');
  const link = `${PUBLIC_ORIGIN}/account?mode=reset&token=${encodeURIComponent(token)}`;
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'api-key': env.BREVO_API_KEY },
    body: JSON.stringify({
      sender: { email: env.MAIL_FROM || SUPPORT_EMAIL, name: 'FrenchyFab' },
      replyTo: { email: SUPPORT_EMAIL },
      to: [{ email: to }],
      subject: 'Reset your FrenchyFab Care Compass password',
      htmlContent: `<p>We received a request to reset the password for your FrenchyFab Care Compass account.</p><p><a href="${escapeHtml(link)}">Choose a new password</a></p><p>This link expires in 30 minutes. If you did not ask for it, you can ignore this email.</p>`,
    }),
  });
  if (!res.ok) throw new Error(`Brevo send failed with ${res.status}`);
}

async function startSession(request, env, json, email) {
  const token = b64url(randomBytes(32));
  const exp = Date.now() + SESSION_TTL_S * 1000;
  await env.CAREPLAN_KV.put(`session:${await sha256Hex(token)}`, JSON.stringify({ email, exp }), { expirationTtl: SESSION_TTL_S });
  const entitlement = await entitlementFor(env, email);
  return json(request, {
    authenticated: true,
    email,
    premium: Boolean(entitlement?.paid && !entitlement?.refunded),
    sessionId: entitlement?.paid && !entitlement?.refunded ? entitlement.sessionId : null,
    includeEmergencyCard: Boolean(entitlement?.includeEmergencyCard),
  }, 200, { 'set-cookie': sessionCookie(request, token, SESSION_TTL_S) });
}

/**
 * @param {(request: Request, body: unknown, status?: number, extra?: Record<string, string>) => Response} json
 */
export async function routeAuth(request, env, pathname, json) {
  if (!env.CAREPLAN_KV) {
    return json(request, { error: 'Accounts are unavailable until CAREPLAN_KV is bound.' }, 503);
  }
  const route = pathname.slice('/functions/v1/auth/'.length);

  if (request.method === 'GET' && route === 'session') {
    const session = await readAuthSession(request, env);
    if (!session) return json(request, { authenticated: false });
    const entitlement = await entitlementFor(env, session.email);
    const premium = Boolean(entitlement?.paid && !entitlement?.refunded);
    return json(request, {
      authenticated: true,
      email: session.email,
      premium,
      sessionId: premium ? entitlement.sessionId : null,
      includeEmergencyCard: Boolean(premium && entitlement.includeEmergencyCard),
    });
  }

  if (request.method !== 'POST') return json(request, { error: 'Method not allowed' }, 405);

  if (await rateLimit(env, request, `auth:${route}`, route === 'forgot' ? 5 : 10)) {
    return json(request, { error: 'Too many attempts. Wait a minute and try again.' }, 429);
  }

  let body = {};
  try {
    const text = await request.text();
    if (text.length > 4000) return json(request, { error: 'Payload too large' }, 413);
    body = text ? JSON.parse(text) : {};
  } catch {
    return json(request, { error: 'Malformed JSON' }, 400);
  }

  if (route === 'signup') {
    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) return json(request, { error: 'Enter a valid email address.' }, 400);
    const problem = passwordError(body.password, email);
    if (problem) return json(request, { error: problem }, 400);
    if (await readUser(env, email)) return json(request, { error: 'An account with that email already exists. Log in instead.' }, 409);
    const salt = bytesToB64(randomBytes(16));
    const hash = await hashPassword(body.password, salt);
    await env.CAREPLAN_KV.put(`user:${email}`, JSON.stringify({ salt, hash, createdAt: new Date().toISOString() }));
    return startSession(request, env, json, email);
  }

  if (route === 'login') {
    const email = normalizeEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!isValidEmail(email) || password.length < 1 || password.length > 128) {
      return json(request, { error: 'Email or password is incorrect.' }, 401);
    }
    const user = await readUser(env, email);
    const hash = await hashPassword(password, user?.salt || FIXED_SALT);
    if (!user || !safeEqual(hash, user.hash)) {
      return json(request, { error: 'Email or password is incorrect.' }, 401);
    }
    return startSession(request, env, json, email);
  }

  if (route === 'logout') {
    const token = parseCookies(request)[COOKIE];
    if (token) await env.CAREPLAN_KV.delete(`session:${await sha256Hex(token)}`);
    return json(request, { authenticated: false }, 200, { 'set-cookie': sessionCookie(request, '', 0) });
  }

  if (route === 'forgot') {
    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) return json(request, { error: 'Enter a valid email address.' }, 400);
    const user = await readUser(env, email);
    if (user && env.BREVO_API_KEY) {
      const token = b64url(randomBytes(32));
      await env.CAREPLAN_KV.put(`reset:${await sha256Hex(token)}`, JSON.stringify({ email }), { expirationTtl: RESET_TTL_S });
      try {
        await sendResetEmail(env, email, token);
      } catch (error) {
        console.error('password reset email', error.message);
      }
    }
    return json(request, { ok: true });
  }

  if (route === 'reset') {
    const token = typeof body.token === 'string' ? body.token : '';
    if (token.length < 20) return json(request, { error: 'This reset link is invalid or has expired.' }, 400);
    const key = `reset:${await sha256Hex(token)}`;
    const raw = await env.CAREPLAN_KV.get(key);
    let record = null;
    try { record = raw ? JSON.parse(raw) : null; } catch { record = null; }
    if (!record?.email) return json(request, { error: 'This reset link is invalid or has expired.' }, 400);
    const problem = passwordError(body.password, record.email);
    if (problem) return json(request, { error: problem }, 400);
    const salt = bytesToB64(randomBytes(16));
    const hash = await hashPassword(body.password, salt);
    await env.CAREPLAN_KV.put(`user:${record.email}`, JSON.stringify({ salt, hash, createdAt: new Date().toISOString() }));
    await env.CAREPLAN_KV.delete(key);
    return startSession(request, env, json, record.email);
  }

  return json(request, { error: 'Not found' }, 404);
}
