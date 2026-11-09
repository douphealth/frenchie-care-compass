import { EMERGENCY_CARD_PRICE_ID, PREMIUM_PRICE_ID, APP_ORIGIN } from "../src/lib/stripeConfig";
import { fulfillmentDecision } from "../src/lib/entitlement";
import { verifyStripeSignature } from "../src/lib/stripeSignature";
import { isValidEmail, normalizeEmail, parseQuizAnswers } from "../src/lib/quizValidation";

export type CareEnv = {
  BREVO_API_KEY?: string;
  BREVO_LIST_ID?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  RESEND_API_KEY?: string;
  PREMIUM_FROM_EMAIL?: string;
};

export type StripeSession = {
  id: string;
  url?: string | null;
  status?: string | null;
  payment_status?: string | null;
  customer_email?: string | null;
  customer_details?: { email?: string | null } | null;
  metadata?: Record<string, string> | null;
  line_items?: { data?: Array<{ price?: { id?: string } | null }> } | null;
  payment_intent?: {
    latest_charge?: { refunded?: boolean; amount?: number; amount_refunded?: number } | string | null;
  } | string | null;
};

export function sessionPriceIds(session: StripeSession): string[] {
  return (session.line_items?.data || []).map((item) => item.price?.id || "").filter(Boolean);
}

export function sessionIsRefunded(session: StripeSession): boolean {
  const intent = session.payment_intent;
  if (!intent || typeof intent === "string") return false;
  const charge = intent.latest_charge;
  if (!charge || typeof charge === "string") return false;
  if (charge.refunded) return true;
  const amount = Number(charge.amount || 0);
  const refunded = Number(charge.amount_refunded || 0);
  return amount > 0 && refunded >= amount;
}

/** Paid FrenchyFab vault sessions only. Other products on the same Stripe account stay locked. */
export function vaultAccess(session: StripeSession): { paid: boolean; includeEmergencyCard: boolean; refunded: boolean } {
  const priceIds = sessionPriceIds(session);
  const refunded = sessionIsRefunded(session);
  const paid = session.status === "complete"
    && session.payment_status === "paid"
    && priceIds.includes(PREMIUM_PRICE_ID)
    && !refunded;
  return {
    paid,
    refunded,
    includeEmergencyCard: paid && priceIds.includes(EMERGENCY_CARD_PRICE_ID),
  };
}

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
    },
  });
}

export async function retrieveCheckoutSession(secret: string, sessionId: string): Promise<StripeSession> {
  const response = await stripeFetch(
    secret,
    `/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=line_items&expand[]=payment_intent.latest_charge`,
  );
  const body = await response.json() as StripeSession;
  if (!response.ok) throw new Error("Stripe session lookup failed");
  return body;
}

export async function createCheckoutSession(secret: string, input: {
  email: string;
  addBump: boolean;
  answersJson: string;
}): Promise<StripeSession> {
  const fields: Record<string, string> = {
    mode: "payment",
    "line_items[0][price]": PREMIUM_PRICE_ID,
    "line_items[0][quantity]": "1",
    success_url: `${APP_ORIGIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_ORIGIN}/?checkout=cancelled`,
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
  const body = await response.json() as StripeSession;
  if (!response.ok || !body.url) throw new Error("Stripe checkout failed");
  return body;
}

async function markFulfillmentSent(secret: string, sessionId: string, eventId: string): Promise<void> {
  const response = await stripeFetch(secret, `/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    method: "POST",
    body: formBody({
      "metadata[fulfillment_email_sent]": "true",
      "metadata[fulfillment_event_id]": eventId,
    }),
  });
  if (!response.ok) throw new Error("Could not record fulfillment");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function verifyPayment(env: CareEnv, body: unknown): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY) return json({ error: "Payment service is not configured" }, 503);
  const sessionId = typeof (body as { sessionId?: unknown })?.sessionId === "string"
    ? (body as { sessionId: string }).sessionId
    : "";
  if (!sessionId.startsWith("cs_") || sessionId.length > 255) {
    return json({ error: "Invalid checkout session" }, 400);
  }
  try {
    const session = await retrieveCheckoutSession(env.STRIPE_SECRET_KEY, sessionId);
    const access = vaultAccess(session);
    return json({
      paid: access.paid,
      refunded: access.refunded,
      sessionId: session.id,
      email: session.customer_details?.email || session.customer_email || null,
      includeEmergencyCard: access.includeEmergencyCard,
      paymentStatus: session.payment_status || "unpaid",
    });
  } catch (error) {
    console.error(JSON.stringify({ event: "verify_payment_failed", error: String(error) }));
    return json({ paid: false, error: "Unable to verify this payment" }, 400);
  }
}

export async function createPayment(env: CareEnv, body: unknown): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY) return json({ error: "Payment service is not configured" }, 503);
  const record = body as { email?: unknown; addBump?: unknown; answers?: unknown };
  const email = typeof record?.email === "string" ? normalizeEmail(record.email) : "";
  if (!isValidEmail(email)) return json({ error: "A valid email is required" }, 400);
  const answers = parseQuizAnswers(record?.answers);
  if (!answers) return json({ error: "Frenchie profile is required" }, 400);
  try {
    const session = await createCheckoutSession(env.STRIPE_SECRET_KEY, {
      email,
      addBump: record.addBump === true,
      answersJson: JSON.stringify(answers),
    });
    return json({ url: session.url });
  } catch (error) {
    console.error(JSON.stringify({ event: "create_payment_failed", error: String(error) }));
    return json({ error: "Unable to open secure checkout" }, 500);
  }
}

export async function restorePurchase(env: CareEnv, body: unknown): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY || !env.RESEND_API_KEY) {
    return json({ error: "Purchase recovery is not configured" }, 503);
  }
  const email = typeof (body as { email?: unknown })?.email === "string"
    ? normalizeEmail((body as { email: string }).email)
    : "";
  if (!isValidEmail(email)) return json({ error: "A valid email is required" }, 400);
  try {
    const customers = await stripeFetch(env.STRIPE_SECRET_KEY, `/customers?email=${encodeURIComponent(email)}&limit=1`);
    const customerBody = await customers.json() as { data?: Array<{ id?: string }> };
    const customerId = customerBody.data?.[0]?.id;
    if (customerId) {
      const listed = await stripeFetch(env.STRIPE_SECRET_KEY, `/checkout/sessions?customer=${encodeURIComponent(customerId)}&limit=20&status=complete`);
      const listedBody = await listed.json() as { data?: StripeSession[] };
      for (const item of listedBody.data || []) {
        if (item.payment_status !== "paid" || !item.id) continue;
        const full = await retrieveCheckoutSession(env.STRIPE_SECRET_KEY, item.id);
        if (!vaultAccess(full).paid) continue;
        const link = `${APP_ORIGIN}/payment-success?session_id=${encodeURIComponent(full.id)}`;
        const sent = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: env.PREMIUM_FROM_EMAIL || "FrenchyFab <hello@frenchyfab.com>",
            to: [email],
            subject: "Your Frenchie Care Vault access link",
            html: `<p>Stripe confirmed a FrenchyFab vault purchase for this email.</p><p><a href="${escapeHtml(link)}">Open my vault</a></p>`,
          }),
        });
        if (!sent.ok) return json({ error: "Could not send the access email" }, 502);
        break;
      }
    }
    return json({ ok: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "restore_purchase_failed", error: String(error) }));
    return json({ error: "Purchase recovery is unavailable" }, 500);
  }
}

export async function stripeWebhook(env: CareEnv, request: Request): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Webhook not configured", { status: 503, headers: securityHeaders({ "content-type": "text/plain", "cache-control": "no-store" }) });
  }
  const rawBody = await request.text();
  const ok = await verifyStripeSignature(rawBody, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return new Response("Invalid signature", { status: 400, headers: securityHeaders({ "content-type": "text/plain", "cache-control": "no-store" }) });

  let event: { id?: string; type?: string; data?: { object?: { id?: string } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return json({ received: true });
  }
  try {
    const sessionId = event.data?.object?.id || "";
    if (!sessionId.startsWith("cs_")) return json({ received: true });
    const session = await retrieveCheckoutSession(env.STRIPE_SECRET_KEY, sessionId);
    const access = vaultAccess(session);
    const decision = fulfillmentDecision({
      paid: access.paid,
      hasPremiumPrice: sessionPriceIds(session).includes(PREMIUM_PRICE_ID),
      alreadySent: session.metadata?.fulfillment_email_sent === "true",
    });
    if (decision !== "fulfill") return json({ received: true, duplicate: decision === "duplicate" });
    const email = session.customer_details?.email || session.customer_email;
    if (email && env.RESEND_API_KEY) {
      const link = `${APP_ORIGIN}/payment-success?session_id=${encodeURIComponent(session.id)}`;
      const sent = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: env.PREMIUM_FROM_EMAIL || "FrenchyFab <hello@frenchyfab.com>",
          to: [email],
          subject: "Your Frenchie Care Vault is ready",
          html: `<p>Stripe confirmed your payment.</p><p><a href="${escapeHtml(link)}">Open my vault</a></p>`,
        }),
      });
      if (!sent.ok) return new Response("Fulfillment email failed", { status: 500 });
    }
    await markFulfillmentSent(env.STRIPE_SECRET_KEY, session.id, event.id || "unknown");
    return json({ received: true, fulfilled: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "stripe_webhook_failed", error: String(error) }));
    return new Response("Fulfillment failed", { status: 500 });
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: securityHeaders({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }),
  });
}

export function securityHeaders(extra: Record<string, string> = {}): Headers {
  const headers = new Headers(extra);
  headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("x-frame-options", "DENY");
  return headers;
}
