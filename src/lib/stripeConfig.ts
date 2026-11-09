/** Public Stripe identifiers. Secret keys stay in server env, never here. */
export const APP_ORIGIN = 'https://care-plan.frenchyfab.com';

export const PREMIUM_PRICE_ID = 'price_1TFD07GCqwm95OGXc26k5JkI';
export const EMERGENCY_CARD_PRICE_ID = 'price_1THjRhGCqwm95OGXJZf9x553';

/** Payment Links already used by the live site. They open Checkout without a server. */
export const PAYMENT_LINKS = {
  vault: 'https://buy.stripe.com/dRm14ncpW1qw3oh9f0ejK09',
  vaultPlusChecklist: 'https://buy.stripe.com/8x25kD4Xu6KQ5wp2QCejK0a',
} as const;

export const ALLOWED_APP_ORIGINS = [
  APP_ORIGIN,
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];
