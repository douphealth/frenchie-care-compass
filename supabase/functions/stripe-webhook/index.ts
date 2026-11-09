import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { verifyStripeSignature } from "../../../src/lib/stripeSignature.ts";
import { fulfillmentDecision } from "../../../src/lib/entitlement.ts";
import { PREMIUM_PRICE_ID } from "../../../src/lib/stripeConfig.ts";
import { markFulfillmentSent, retrieveCheckoutSession, sessionPriceIds } from "../_shared/stripeRest.ts";
import { APP_ORIGIN } from "../../../src/lib/stripeConfig.ts";
import { escapeHtml } from "../_shared/http.ts";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = Deno.env.get("STRIPE_SECRET_KEY") || "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
  if (!secret || !webhookSecret) return new Response("Webhook not configured", { status: 503 });

  const rawBody = await req.text();
  const signatureOk = await verifyStripeSignature(rawBody, req.headers.get("stripe-signature"), webhookSecret);
  if (!signatureOk) return new Response("Invalid signature", { status: 400 });

  let event: { id?: string; type?: string; data?: { object?: { id?: string } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return Response.json({ received: true });
  }

  try {
    const sessionId = event.data?.object?.id || "";
    if (!sessionId.startsWith("cs_")) return Response.json({ received: true });
    const session = await retrieveCheckoutSession(secret, sessionId);
    const decision = fulfillmentDecision({
      paid: session.payment_status === "paid" && session.status === "complete",
      hasPremiumPrice: sessionPriceIds(session).includes(PREMIUM_PRICE_ID),
      alreadySent: session.metadata?.fulfillment_email_sent === "true",
    });
    if (decision !== "fulfill") return Response.json({ received: true, duplicate: decision === "duplicate" });

    const email = session.customer_details?.email || session.customer_email;
    const resendKey = Deno.env.get("RESEND_API_KEY") || "";
    if (email && resendKey) {
      const link = `${APP_ORIGIN}/payment-success?session_id=${encodeURIComponent(session.id)}`;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: Deno.env.get("PREMIUM_FROM_EMAIL") || "FrenchyFab <hello@frenchyfab.com>",
          to: [email],
          subject: "Your Frenchie Care Vault is ready",
          html: `<p>Stripe confirmed your payment. Open the vault here:</p><p><a href="${escapeHtml(link)}">Open my vault</a></p>`,
        }),
      });
      if (!response.ok) return new Response("Fulfillment email failed", { status: 500 });
    }

    await markFulfillmentSent(secret, session.id, event.id || "unknown");
    return Response.json({ received: true, fulfilled: true });
  } catch (error) {
    console.error("stripe webhook failed", error);
    return new Response("Fulfillment failed", { status: 500 });
  }
});
