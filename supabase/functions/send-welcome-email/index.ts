import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "FrenchyFab <care@frenchyfab.com>";

function buildWelcomeHTML(answers: Record<string, any>): string {
  const stage = answers.lifeStage === 'puppy' ? 'Puppy' : answers.lifeStage === 'senior' ? 'Senior' : 'Adult';
  const concern = {
    skin: 'Skin & Allergies', pulling: 'Leash Pulling', diet: 'Diet & Weight',
    breathing: 'Breathing', wellness: 'General Wellness',
  }[answers.concern as string] || answers.concern || 'General Wellness';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf5eb;font-family:Arial,'Helvetica Neue',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf5eb;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(76,40,30,0.08);">
        
        <!-- Header -->
        <tr><td style="background:#4c281e;padding:32px 40px;text-align:center;">
          <p style="color:#d2a03c;font-size:13px;font-weight:700;letter-spacing:2px;margin:0 0 8px;">FRENCHYFAB</p>
          <h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0;line-height:1.3;">Your Care Plan is Ready!</h1>
          <p style="color:#f5e6be;font-size:14px;margin:10px 0 0;font-weight:400;">Personalized recommendations for your ${stage} French Bulldog</p>
        </td></tr>
        
        <!-- Profile Summary -->
        <tr><td style="padding:32px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f4ee;border-radius:8px;padding:20px;">
            <tr><td style="padding:16px 20px;">
              <p style="color:#4c281e;font-size:12px;font-weight:700;letter-spacing:1px;margin:0 0 12px;">YOUR FRENCHIE'S PROFILE</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:4px 0;color:#82736e;font-size:13px;" width="50%">Life Stage: <strong style="color:#37261a;">${stage}</strong></td>
                  <td style="padding:4px 0;color:#82736e;font-size:13px;" width="50%">Concern: <strong style="color:#37261a;">${concern}</strong></td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        
        <!-- Free Plan Downloaded -->
        <tr><td style="padding:24px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#e6f8eb;border-radius:8px;border:1px solid #c8e6d0;">
            <tr><td style="padding:16px 20px;text-align:center;">
              <p style="color:#3c9664;font-size:14px;font-weight:700;margin:0;">Your Free Care Plan PDF is Available</p>
              <p style="color:#555;font-size:13px;margin:8px 0 0;">You can download it anytime from the quiz results page.</p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Premium Upsell -->
        <tr><td style="padding:0 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f5e6be,#f0d8a0);border-radius:10px;border:1px solid #d2a03c;">
            <tr><td style="padding:28px 24px;text-align:center;">
              <p style="color:#4c281e;font-size:10px;font-weight:700;letter-spacing:2px;margin:0 0 8px;">EXCLUSIVE OFFER</p>
              <h2 style="color:#4c281e;font-size:20px;font-weight:700;margin:0 0 10px;line-height:1.3;">Get Your Premium 12-Page Care Guide</h2>
              <p style="color:#5a3f2e;font-size:13px;line-height:1.6;margin:0 0 16px;">
                Everything in your free plan PLUS custom feeding charts, seasonal grooming checklists,
                vet visit prep sheets, emergency protocols, and breed-specific health screening timelines.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="padding:4px 0;color:#5a3f2e;font-size:12px;">&#10003; Personalized feeding portions & meal plans</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#5a3f2e;font-size:12px;">&#10003; Grooming schedules with product recommendations</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#5a3f2e;font-size:12px;">&#10003; Vet visit prep checklists by life stage</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#5a3f2e;font-size:12px;">&#10003; Emergency first-aid quick reference card</td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" style="margin:20px auto 0;">
                <tr><td style="background:#4c281e;border-radius:8px;padding:14px 36px;">
                  <a href="https://frenchie-care-compass.lovable.app/?screen=upsell" style="color:#f5e6be;font-size:15px;font-weight:700;text-decoration:none;display:block;">
                    Get Premium PDF - Just $7.99
                  </a>
                </td></tr>
              </table>
              <p style="color:#82736e;font-size:11px;margin:12px 0 0;">One-time purchase. Instant download. No subscription.</p>
            </td></tr>
          </table>
        </td></tr>
        
        <!-- Helpful Resources -->
        <tr><td style="padding:28px 40px 0;">
          <p style="color:#4c281e;font-size:14px;font-weight:700;margin:0 0 12px;">Helpful Resources from FrenchyFab</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:8px 0;border-bottom:1px solid #e8e0d6;">
              <a href="https://frenchyfab.com/french-bulldog-healthy-treats" style="color:#be7350;font-size:13px;font-weight:600;text-decoration:none;">Healthy Treats Guide &#8594;</a>
              <p style="color:#82736e;font-size:12px;margin:2px 0 0;">Safe, nutritious treats with portion guidelines</p>
            </td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #e8e0d6;">
              <a href="https://frenchyfab.com/french-bulldog-grooming-blueprint/" style="color:#be7350;font-size:13px;font-weight:600;text-decoration:none;">Complete Grooming Blueprint &#8594;</a>
              <p style="color:#82736e;font-size:12px;margin:2px 0 0;">Step-by-step routines for wrinkle care to nail trimming</p>
            </td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #e8e0d6;">
              <a href="https://frenchyfab.com/essential-nutritional-supplements-french-bulldogs/" style="color:#be7350;font-size:13px;font-weight:600;text-decoration:none;">Essential Supplements Guide &#8594;</a>
              <p style="color:#82736e;font-size:12px;margin:2px 0 0;">Evidence-based supplement recommendations with dosages</p>
            </td></tr>
            <tr><td style="padding:8px 0;">
              <a href="https://frenchyfab.com/best-harness-for-french-bulldog-that-pulls/" style="color:#be7350;font-size:13px;font-weight:600;text-decoration:none;">Best Harness for Frenchies &#8594;</a>
              <p style="color:#82736e;font-size:12px;margin:2px 0 0;">Expert-reviewed picks to prevent pulling</p>
            </td></tr>
          </table>
        </td></tr>
        
        <!-- Footer -->
        <tr><td style="padding:28px 40px 32px;text-align:center;border-top:1px solid #e8e0d6;margin-top:20px;">
          <p style="color:#82736e;font-size:11px;margin:0;">Made with care by the FrenchyFab team</p>
          <p style="color:#be7350;font-size:11px;margin:4px 0 0;"><a href="https://frenchyfab.com" style="color:#be7350;text-decoration:none;font-weight:600;">frenchyfab.com</a></p>
        </td></tr>
        
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, answers } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const html = buildWelcomeHTML(answers || {});

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: "Your Frenchie Care Plan is Ready! + Exclusive Premium Guide Offer",
        html: html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", resendData);
      return new Response(JSON.stringify({ error: "Failed to send email", details: resendData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Store lead in Supabase
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") || "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
      );
      await supabase.from("leads").insert({ email, answers, email_sent: true });
    } catch (dbErr) {
      console.log("Lead storage skipped (table may not exist yet):", dbErr);
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Email send error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
