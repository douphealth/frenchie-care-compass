const textEncoder = new TextEncoder();

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Stripe webhook signature check (t= timestamp, v1= hex HMAC of `${t}.${body}`).
 * Rejects missing secrets, stale timestamps, and mismatched signatures.
 */
export async function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  nowMs = Date.now(),
  toleranceSec = 300,
): Promise<boolean> {
  if (!secret || !header || !payload) return false;
  const parts = header.split(',').map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return false;

  const ageSec = Math.abs(nowMs / 1000 - Number(timestamp));
  if (ageSec > toleranceSec) return false;

  const expected = await hmacHex(secret, `${timestamp}.${payload}`);
  return signatures.some((signature) => timingSafeEqual(signature, expected));
}
