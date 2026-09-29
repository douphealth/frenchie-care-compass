import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "npm:stripe@22.0.0";

const APP_ORIGIN = (Deno.env.get("APP_ORIGIN") || "https://care-plan.frenchyfab.com").replace(/\/$/, "");
const PREMIUM_PRICE_ID = Deno.env.get("STRIPE_PREMIUM_PRICE_ID") || "price_1TFD07GCqwm95OGXc26k5JkI";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("PREMIUM_FROM_EMAIL") || "FrenchyFab <hello@frenchyfab.com>";

async function sendRecoveryEmail(email: string, sessionId: string, amount: string) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
  const recoveryUrl = APP_ORIGIN + "/payment-success?session_id=" + encodeURIComponent(sessionId);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + RESEND_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [email],
      subject: "Your Frenchie Care Vault is ready",
      html: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:28px">' +
        '<h1 style="color:#4c281e">Your Frenchie Care Vault is ready</h1>' +
        '<p>Payment of <strong>' + amount + '</strong> was confirmed securely by Stripe.</p>' +
        '<p>Use the verified access link below to download your personalized premium PDF.</p>' +
        '<p><a href="' + recoveryUrl + '" style="display:inline-block;background:#4c281e;color:#fff;text-decoration:none;padding:14px 20px;border-radius:8px;font-weight:700">Open my Frenchie Care Vault</a></p>' +
        '<p style="font-size:12px;color:#666">Keep this email as your recovery link. General care guidance does not replace veterinary advice.</p>' +
        '</div>',
    }),
  });
  if (!response.ok) throw new Error("Resend returned " + response.status);
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) return new Response("Webhook not configured", { status: 503 });

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const cryptoProvider = Stripe.createSubtleCryptoProvider();
  const signature = req.headers.get("stripe-signature") || "";
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, STRIPE_WEBHOOK_SECRET, undefined, cryptoProvider);
  } catch (error) {
    console.error("Stripe signature verification failed", error);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return Response.json({ received: true });
  }

  try {
    const eventSession = event.data.object as Stripe.Checkout.Session;
    const session = await stripe.checkout.sessions.retrieve(eventSession.id, { expand: ["line_items.data.price"] });
    if (session.payment_status !== "paid" || session.status !== "complete") return Response.json({ received: true });

    const hasPremiumProduct = (session.line_items?.data || []).some((item) => item.price?.id === PREMIUM_PRICE_ID);
    if (!hasPremiumProduct) return Response.json({ received: true });

    if (session.metadata?.fulfillment_email_sent === "true") return Response.json({ received: true, duplicate: true });

    const email = session.customer_details?.email || session.customer_email;
    if (!email) throw new Error("Paid checkout has no customer email");

    const amount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (session.currency || "usd").toUpperCase(),
    }).format((session.amount_total || 0) / 100);

    await sendRecoveryEmail(email, session.id, amount);
    await stripe.checkout.sessions.update(session.id, {
      metadata: {
        ...session.metadata,
        fulfillment_email_sent: "true",
        fulfillment_event_id: event.id,
      },
    });

    return Response.json({ received: true, fulfilled: true });
  } catch (error) {
    console.error("Stripe fulfillment failed", error);
    return new Response("Fulfillment failed", { status: 500 });
  }
});
