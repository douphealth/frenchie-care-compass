const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? '';

export type AuthSession = {
  authenticated: boolean;
  email?: string;
  premium?: boolean;
  sessionId?: string | null;
  includeEmergencyCard?: boolean;
};

async function parse(response: Response): Promise<AuthSession & { ok?: boolean; error?: string }> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Request failed');
  }
  return data;
}

export async function authSession(): Promise<AuthSession> {
  const response = await fetch(`${API_BASE}/functions/v1/auth/session`, { credentials: 'include' });
  return parse(response);
}

export async function authSignup(email: string, password: string): Promise<AuthSession> {
  const response = await fetch(`${API_BASE}/functions/v1/auth/signup`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return parse(response);
}

export async function authLogin(email: string, password: string): Promise<AuthSession> {
  const response = await fetch(`${API_BASE}/functions/v1/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return parse(response);
}

export async function authLogout(): Promise<void> {
  const response = await fetch(`${API_BASE}/functions/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  await parse(response);
}

export async function authForgot(email: string): Promise<void> {
  const response = await fetch(`${API_BASE}/functions/v1/auth/forgot`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  await parse(response);
}

export async function authReset(token: string, password: string): Promise<AuthSession> {
  const response = await fetch(`${API_BASE}/functions/v1/auth/reset`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  return parse(response);
}
