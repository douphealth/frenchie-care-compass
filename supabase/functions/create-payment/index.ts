import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { json } from "../_shared/http.ts";
import { createCheckoutSession } from "../_shared/stripeRest.ts";
import { ALLOWED_APP_ORIGINS, APP_ORIGIN } from "../../../src/lib/stripeConfig.ts";
import { isValidEmail, normalizeEmail, parseQuizAnswers } from "../../../src/lib/quizValidation.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: json(req, {}).headers });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const secret = Deno.env.get("STRIPE_SECRET_KEY") || "";
  if (!secret) return json(req, { error: "Payment service is not configured" }, 503);

  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
    if (!isValidEmail(email)) return json(req, { error: "A valid email is required" }, 400);

    const answers = parseQuizAnswers(body?.answers);
    if (!answers) return json(req, { error: "Frenchie profile is required" }, 400);
    const addBump = body?.addBump === true;

    const requestOrigin = req.headers.get("origin") || "";
    const origin = ALLOWED_APP_ORIGINS.includes(requestOrigin) ? requestOrigin : APP_ORIGIN;

    const session = await createCheckoutSession(secret, {
      email,
      origin,
      addBump,
      answersJson: JSON.stringify(answers),
    });
    if (!session.url) return json(req, { error: "Stripe did not return a checkout URL" }, 502);
    return json(req, { url: session.url });
  } catch (error) {
    console.error("create-payment failed", error);
    return json(req, { error: "Unable to open secure checkout" }, 500);
  }
});
