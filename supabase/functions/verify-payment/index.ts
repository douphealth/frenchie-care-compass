import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { json } from "../_shared/http.ts";
import { retrieveCheckoutSession, sessionPriceIds } from "../_shared/stripeRest.ts";
import { EMERGENCY_CARD_PRICE_ID, PREMIUM_PRICE_ID } from "../../../src/lib/stripeConfig.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: json(req, {}).headers });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const secret = Deno.env.get("STRIPE_SECRET_KEY") || "";
  if (!secret) return json(req, { error: "Payment service is not configured" }, 503);

  try {
    const body = await req.json();
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
    if (!sessionId.startsWith("cs_") || sessionId.length > 255) {
      return json(req, { error: "Invalid checkout session" }, 400);
    }

    const session = await retrieveCheckoutSession(secret, sessionId);
    const priceIds = sessionPriceIds(session);
    const paid = session.status === "complete"
      && session.payment_status === "paid"
      && priceIds.includes(PREMIUM_PRICE_ID);

    return json(req, {
      paid,
      refunded: false,
      sessionId: session.id,
      email: session.customer_details?.email || session.customer_email || null,
      includeEmergencyCard: priceIds.includes(EMERGENCY_CARD_PRICE_ID),
      paymentStatus: session.payment_status || "unpaid",
    });
  } catch (error) {
    console.error("verify-payment failed", error);
    return json(req, { error: "Unable to verify this payment" }, 400);
  }
});
