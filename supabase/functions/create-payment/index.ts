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
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const answers = body?.answers;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return json(req, { error: "A valid email is required" }, 400);
    }
    if (!answers || typeof answers !== "object") {
      return json(req, { error: "Frenchie profile is required" }, 400);
    }

    const serializedAnswers = JSON.stringify(answers);
    if (serializedAnswers.length > 450) {
      return json(req, { error: "Profile payload is too large" }, 400);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customerId = customers.data[0]?.id;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: PREMIUM_PRICE_ID, quantity: 1 }],
      mode: "payment",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: APP_ORIGIN + "/payment-success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: APP_ORIGIN + "/?checkout=cancelled",
      metadata: {
        product: "frenchie-care-vault",
        answers: serializedAnswers,
        fulfillment_email_sent: "false",
      },
    });

    if (!session.url) return json(req, { error: "Stripe did not return a checkout URL" }, 502);
    return json(req, { url: session.url });
  } catch (error) {
    console.error("create-payment failed", error);
    return json(req, { error: "Unable to open secure checkout" }, 500);
  }
});
