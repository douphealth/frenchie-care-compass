import { describe, expect, it } from 'vitest';
import { acceptServerVerification, canAccessPremium, fulfillmentDecision } from '@/lib/entitlement';
import { includedPremiumPages } from '@/lib/pdfOutline';
import { PREMIUM_PRICE_ID } from '@/lib/stripeConfig';

describe('premium gating', () => {
  it('rejects a local paid flag that the server did not echo', () => {
    expect(acceptServerVerification('cs_test_123', { paid: true })).toBeNull();
    expect(acceptServerVerification('cs_test_123', { paid: true, sessionId: 'cs_other' })).toBeNull();
    expect(acceptServerVerification('not-a-session', { paid: true, sessionId: 'not-a-session' })).toBeNull();
    expect(canAccessPremium(null)).toBe(false);
  });

  it('accepts a matching paid session and keeps refunds locked', () => {
    const entitlement = acceptServerVerification('cs_test_123', {
      paid: true,
      refunded: false,
      sessionId: 'cs_test_123',
      email: 'owner@example.com',
      includeEmergencyCard: true,
    }, '2026-11-09T00:00:00.000Z');
    expect(canAccessPremium(entitlement)).toBe(true);
    expect(entitlement?.includeEmergencyCard).toBe(true);
    expect(acceptServerVerification('cs_test_123', {
      paid: true,
      refunded: true,
      sessionId: 'cs_test_123',
    })).toBeNull();
  });

  it('fulfills a paid premium checkout once', () => {
    expect(fulfillmentDecision({ paid: true, hasPremiumPrice: true, alreadySent: false })).toBe('fulfill');
    expect(fulfillmentDecision({ paid: true, hasPremiumPrice: true, alreadySent: true })).toBe('duplicate');
    expect(fulfillmentDecision({ paid: false, hasPremiumPrice: true, alreadySent: false })).toBe('ignore');
    expect(PREMIUM_PRICE_ID.startsWith('price_')).toBe(true);
  });

  it('keeps vault pages out of the free PDF', () => {
    expect(includedPremiumPages('free')).toEqual([]);
    expect(includedPremiumPages('premium')).toContain('emergency-reference');
    expect(includedPremiumPages('premium')).not.toContain('emergency-fridge-card');
    expect(includedPremiumPages('premium', true)).toContain('emergency-fridge-card');
  });
});
