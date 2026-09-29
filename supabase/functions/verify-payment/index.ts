import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "npm:stripe@22.0.0";

const APP_ORIGIN = (Deno.env.get("APP_ORIGIN") || "https://care-plan.frenchyfab.com").replace(/\/$/, "");
const PREMIUM_PRICE_ID = Deno.env.get("STRIPE_PREMIUM_PRICE_ID") || "price_1TFD07GCqwm95OGXc26k5JkI";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = origin === APP_ORIGIN || origin.startsWith("http://localhost:") ? origin : APP_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  if (!STRIPE_SECRET_KEY) return json(req, { error: "Payment service is not configured" }, 503);

  try {
    const { sessionId } = await req.json();
    if (typeof sessionId !== "string" || !sessionId.startsWith("cs_") || sessionId.length > 255) {
      return json(req, { error: "Invalid checkout session" }, 400);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price", "payment_intent.latest_charge"],
    });

    const lineItems = session.line_items?.data || [];
    const hasPremiumProduct = lineItems.some((item) => item.price?.id === PREMIUM_PRICE_ID);
    const paymentIntent = typeof session.payment_intent === "object" ? session.payment_intent : null;
    const charge = paymentIntent && typeof paymentIntent.latest_charge === "object" ? paymentIntent.latest_charge : null;
    const refunded = Boolean(charge?.refunded) || Number(charge?.amount_refunded || 0) >= Number(charge?.amount || 1);
    const paid = session.status === "complete" && session.payment_status === "paid" && hasPremiumProduct && !refunded;

    let answers = null;
    if (paid && session.metadata?.answers) {
      try { answers = JSON.parse(session.metadata.answers); } catch { answers = null; }
    }

    return json(req, {
      paid,
      status: session.status,
      paymentStatus: session.payment_status,
      refunded,
      email: session.customer_details?.email || session.customer_email || null,
      amountTotal: session.amount_total,
      currency: session.currency,
      answers,
    });
  } catch (error) {
    console.error("verify-payment failed", error);
    return json(req, { error: "Unable to verify this payment" }, 400);
  }
});
