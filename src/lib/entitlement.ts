import { EMERGENCY_CARD_PRICE_ID, PREMIUM_PRICE_ID } from './stripeConfig';

export type Entitlement = {
  paid: true;
  refunded: false;
  sessionId: string;
  email: string | null;
  includeEmergencyCard: boolean;
  verifiedAt: string;
};

export type VerificationBody = {
  paid?: unknown;
  refunded?: unknown;
  sessionId?: unknown;
  email?: unknown;
  includeEmergencyCard?: unknown;
  priceIds?: unknown;
};

/**
 * Accept a premium unlock only when the server echoes the session we asked
 * about and explicitly says it is paid and not refunded.
 * A local `{ paid: true }` flag is not enough.
 */
export function acceptServerVerification(
  requestedSessionId: string,
  body: unknown,
  now = new Date().toISOString(),
): Entitlement | null {
  if (!requestedSessionId.startsWith('cs_') || requestedSessionId.length > 255) return null;
  if (!body || typeof body !== 'object') return null;
  const record = body as VerificationBody;
  if (record.paid !== true || record.refunded === true) return null;
  if (record.sessionId !== requestedSessionId) return null;

  const email = typeof record.email === 'string' && record.email.includes('@') ? record.email : null;
  return {
    paid: true,
    refunded: false,
    sessionId: requestedSessionId,
    email,
    includeEmergencyCard: record.includeEmergencyCard === true,
    verifiedAt: now,
  };
}

export function canAccessPremium(entitlement: Entitlement | null | undefined): boolean {
  return Boolean(
    entitlement
    && entitlement.paid === true
    && entitlement.refunded === false
    && typeof entitlement.sessionId === 'string'
    && entitlement.sessionId.startsWith('cs_')
    && typeof entitlement.verifiedAt === 'string'
    && entitlement.verifiedAt.length > 0,
  );
}

export type FulfillmentDecision = 'ignore' | 'duplicate' | 'fulfill';

export function fulfillmentDecision(input: {
  paid: boolean;
  hasPremiumPrice: boolean;
  alreadySent: boolean;
}): FulfillmentDecision {
  if (!input.paid || !input.hasPremiumPrice) return 'ignore';
  if (input.alreadySent) return 'duplicate';
  return 'fulfill';
}

export function priceIdsIncludePremium(priceIds: string[]): boolean {
  return priceIds.includes(PREMIUM_PRICE_ID);
}

export function priceIdsIncludeEmergencyCard(priceIds: string[]): boolean {
  return priceIds.includes(EMERGENCY_CARD_PRICE_ID);
}
