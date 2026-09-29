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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  if (!STRIPE_SECRET_KEY) return Response.json({ error: "Pricing unavailable" }, { status: 503, headers: corsHeaders(req) });

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const price = await stripe.prices.retrieve(PREMIUM_PRICE_ID);
    if (!price.active || price.unit_amount == null || !price.currency) throw new Error("Inactive or invalid price");
    const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency.toUpperCase() }).format(price.unit_amount / 100);
    return new Response(JSON.stringify({ unitAmount: price.unit_amount, currency: price.currency, formatted }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    });
  } catch (error) {
    console.error("get-pricing failed", error);
    return new Response(JSON.stringify({ error: "Pricing unavailable" }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
});
