import { EMERGENCY_CARD_PRICE_ID, PREMIUM_PRICE_ID } from "../../../src/lib/stripeConfig.ts";

type StripeSession = {
  id: string;
  url?: string | null;
  status?: string | null;
  payment_status?: string | null;
  customer_email?: string | null;
  customer_details?: { email?: string | null } | null;
  amount_total?: number | null;
  currency?: string | null;
  metadata?: Record<string, string> | null;
  line_items?: { data?: Array<{ price?: { id?: string } | null }> } | null;
};

function formBody(fields: Record<string, string>): string {
  const params = new URLSearchParams();
  Object.entries(fields).forEach(([key, value]) => params.append(key, value));
  return params.toString();
}

async function stripeFetch(secret: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(init?.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(init?.headers || {}),
    },
  });
}

export async function createCheckoutSession(secret: string, input: {
  email: string;
  origin: string;
  addBump: boolean;
  answersJson: string;
}): Promise<StripeSession> {
  const fields: Record<string, string> = {
    mode: "payment",
    "line_items[0][price]": PREMIUM_PRICE_ID,
    "line_items[0][quantity]": "1",
    success_url: `${input.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/?checkout=cancelled`,
    customer_email: input.email,
    "metadata[product]": "frenchie-care-vault",
    "metadata[answers]": input.answersJson.slice(0, 450),
    "metadata[fulfillment_email_sent]": "false",
    "metadata[include_emergency_card]": input.addBump ? "true" : "false",
  };
  if (input.addBump) {
    fields["line_items[1][price]"] = EMERGENCY_CARD_PRICE_ID;
    fields["line_items[1][quantity]"] = "1";
  }
  const response = await stripeFetch(secret, "/checkout/sessions", { method: "POST", body: formBody(fields) });
  const body = await response.json();
  if (!response.ok) throw new Error("Stripe checkout failed");
  return body as StripeSession;
}

export async function retrieveCheckoutSession(secret: string, sessionId: string): Promise<StripeSession> {
  const response = await stripeFetch(secret, `/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=line_items`);
  const body = await response.json();
  if (!response.ok) throw new Error("Stripe session lookup failed");
  return body as StripeSession;
}

export function sessionPriceIds(session: StripeSession): string[] {
  return (session.line_items?.data || [])
    .map((item) => item.price?.id || "")
    .filter(Boolean);
}

export async function findPaidSessionByEmail(secret: string, email: string): Promise<StripeSession | null> {
  const customers = await stripeFetch(secret, `/customers?email=${encodeURIComponent(email)}&limit=1`);
  const customerBody = await customers.json();
  const customerId = customerBody?.data?.[0]?.id;
  if (!customerId) return null;
  const sessions = await stripeFetch(secret, `/checkout/sessions?customer=${encodeURIComponent(customerId)}&limit=20&status=complete`);
  const sessionBody = await sessions.json();
  if (!sessions.ok) throw new Error("Stripe customer lookup failed");
  const matches = (sessionBody.data || []) as StripeSession[];
  for (const session of matches) {
    if (session.payment_status !== "paid") continue;
    const full = await retrieveCheckoutSession(secret, session.id);
    if (sessionPriceIds(full).includes(PREMIUM_PRICE_ID)) return full;
  }
  return null;
}

export async function markFulfillmentSent(secret: string, sessionId: string, eventId: string): Promise<void> {
  const response = await stripeFetch(secret, `/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    method: "POST",
    body: formBody({
      "metadata[fulfillment_email_sent]": "true",
      "metadata[fulfillment_event_id]": eventId,
    }),
  });
  if (!response.ok) throw new Error("Could not record fulfillment");
}
