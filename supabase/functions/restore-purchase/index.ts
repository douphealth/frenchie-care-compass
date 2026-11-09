import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { escapeHtml, json } from "../_shared/http.ts";
import { findPaidSessionByEmail } from "../_shared/stripeRest.ts";
import { APP_ORIGIN } from "../../../src/lib/stripeConfig.ts";
import { isValidEmail, normalizeEmail } from "../../../src/lib/quizValidation.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: json(req, {}).headers });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const secret = Deno.env.get("STRIPE_SECRET_KEY") || "";
  const resendKey = Deno.env.get("RESEND_API_KEY") || "";
  if (!secret || !resendKey) return json(req, { error: "Purchase recovery is not configured" }, 503);

  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
    if (!isValidEmail(email)) return json(req, { error: "A valid email is required" }, 400);

    const session = await findPaidSessionByEmail(secret, email);
    if (session) {
      const link = `${APP_ORIGIN}/payment-success?session_id=${encodeURIComponent(session.id)}`;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "FrenchyFab <hello@frenchyfab.com>",
          to: [email],
          subject: "Your Frenchie Care Vault access link",
          html: `<p>Use this link to open the vault after Stripe re-checks the payment:</p><p><a href="${escapeHtml(link)}">Open my vault</a></p><p>This guide is educational and does not replace a veterinarian.</p>`,
        }),
      });
      if (!response.ok) return json(req, { error: "Could not send the access email" }, 502);
    }

    // Same response whether or not a purchase exists, so this route is not an email oracle.
    return json(req, { ok: true });
  } catch (error) {
    console.error("restore-purchase failed", error);
    return json(req, { error: "Purchase recovery is unavailable" }, 500);
  }
});
