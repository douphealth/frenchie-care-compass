import { describe, expect, it } from 'vitest';
import { verifyStripeSignature } from '@/lib/stripeSignature';

async function sign(secret: string, payload: string, timestamp: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const hex = Array.from(new Uint8Array(mac)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `t=${timestamp},v1=${hex}`;
}

describe('Stripe webhook signatures', () => {
  const secret = 'whsec_test_secret';
  const payload = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' });
  const now = 1_700_000_000_000;

  it('accepts a current matching signature', async () => {
    const header = await sign(secret, payload, now / 1000);
    await expect(verifyStripeSignature(payload, header, secret, now)).resolves.toBe(true);
  });

  it('rejects a tampered body, a stale timestamp, and a missing secret', async () => {
    const header = await sign(secret, payload, now / 1000);
    await expect(verifyStripeSignature(payload + ' ', header, secret, now)).resolves.toBe(false);
    await expect(verifyStripeSignature(payload, header, secret, now + 3_600_000)).resolves.toBe(false);
    await expect(verifyStripeSignature(payload, header, '', now)).resolves.toBe(false);
    await expect(verifyStripeSignature(payload, null, secret, now)).resolves.toBe(false);
  });
});
