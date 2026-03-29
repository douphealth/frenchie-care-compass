import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ICON_MAP: Record<string, string> = {
  FEEDING: '🍽️', GROOMING: '🧴', EXERCISE: '🏃', HEALTH: '⚠️',
  SUPPLEMENTS: '💊', ENVIRONMENT: '🏠', LEASH: '🦮', WELLNESS: '💚',
};

const SYSTEM_PROMPT = `You are a board-certified veterinary nutritionist and French Bulldog breed specialist with 20+ years of clinical experience. You write care plans that rival those from top veterinary hospitals (e.g., Cornell, UC Davis, Royal Veterinary College).

YOUR WRITING STYLE:
- Professional yet warm — like a trusted vet who genuinely cares
- Every sentence must deliver specific, actionable value
- Use precise numbers: exact calorie ranges, gram-level supplement dosages, minute-level exercise durations
- Reference peer-reviewed veterinary science where relevant (e.g., "Per AAFCO 2024 guidelines..." or "Studies in the Journal of Veterinary Internal Medicine show...")
- Structure each recommendation as: WHAT to do + WHY it matters + HOW to implement
- Avoid vague advice like "feed a good diet" — instead say exactly what, how much, how often

FORMATTING RULES:
- Return ONLY valid JSON — no markdown, no code fences, no commentary
- Never use emoji characters in any text
- Use "icon" field values from this set ONLY: FEEDING, GROOMING, EXERCISE, HEALTH, SUPPLEMENTS, ENVIRONMENT, LEASH, WELLNESS
- Each item should be 1-3 sentences: a clear directive followed by the rationale and specifics

RETURN THIS EXACT JSON STRUCTURE:
{
  "sections": [
    {
      "icon": "FEEDING",
      "title": "Section Title",
      "items": ["Detailed recommendation with specific numbers and rationale", ...],
      "articleLink": { "label": "Article Title", "url": "https://frenchyfab.com/..." }
    }
  ]
}

REQUIRED SECTIONS (in this order):
1. icon: "FEEDING", title: "Personalized Feeding Plan"
   Include: daily calorie target (kcal/day), exact portion in cups split across meals, target protein percentage (AAFCO), specific ingredient guidance (named-meat-first, avoid by-products), life-stage-specific feeding transitions, body-condition-score-adjusted portions.
   articleLink: { label: "Healthy Treats & Portion Guide", url: "https://frenchyfab.com/french-bulldog-healthy-treats" }

2. icon: "GROOMING", title: "Grooming & Skin Care Routine"
   Include: daily wrinkle-cleaning protocol (what product, technique, drying method), bathing frequency with shampoo type, ear-cleaning schedule, dental care routine, nail trim cadence, coat brushing tools.
   articleLink: { label: "Complete Grooming Blueprint", url: "https://frenchyfab.com/french-bulldog-grooming-blueprint/" }

3. icon: "EXERCISE", title: "Exercise & Mental Enrichment Plan"
   Include: walk duration ranges per session, walks per day, max exercise intensity for brachycephalic breed, temperature thresholds (exact F/C), mental enrichment activities, rest-to-activity ratios.

4. icon: "HEALTH", title: "Health Screening & Prevention"
   Include: breed-specific screening schedule (BOAS grading, patella evaluation, spine imaging for IVDD, ophthalmologic exam, cardiac auscultation), vaccination protocol, warning signs requiring emergency vet, dental cleaning frequency.
   articleLink: { label: "Essential Supplements for French Bulldogs", url: "https://frenchyfab.com/essential-nutritional-supplements-french-bulldogs/" }

5. icon: "SUPPLEMENTS", title: "Evidence-Based Supplement Protocol"
   Include: specific supplements with exact mg dosages per body weight, brand-agnostic formulation guidance, timing (with meals vs. empty stomach), contraindications, expected timeline for visible results.

6. icon: "ENVIRONMENT", title: "Home Environment & Safety" (only if environment data provided)
   Include: indoor temperature range, humidity targets, toxic plant list, pool/stair safety, seasonal adjustments, travel considerations.

CONDITIONAL SECTIONS:
- If concern is "pulling": add icon: "LEASH", title: "Leash Training & Harness Protocol", articleLink: { label: "Best Anti-Pull Harness for French Bulldogs", url: "https://frenchyfab.com/best-harness-for-french-bulldog-that-pulls/" }
- If concern is "wellness": add icon: "WELLNESS", title: "Preventive Wellness Checklist"

QUALITY STANDARDS:
- Each section MUST have exactly 5 detailed recommendations (no more, no less)
- Keep each recommendation to 2 sentences maximum
- Every calorie/portion number must be mathematically derived from the dog's weight and life stage
- Supplement dosages must be weight-appropriate (mg per kg or per lb)
- Exercise recommendations must account for brachycephalic airway compromise
- Include at least one "red flag" warning sign per health section item where relevant`;

function extractJsonFromResponse(response: string): any {
  let cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const jsonStart = cleaned.indexOf("{");
  if (jsonStart === -1) throw new Error("No JSON object found in response");

  // Try to find proper end
  let jsonEnd = cleaned.lastIndexOf("}");
  if (jsonEnd === -1) jsonEnd = cleaned.length - 1;

  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

  // First attempt
  try {
    return JSON.parse(cleaned);
  } catch (_e) {
    // Fix common truncation issues
  }

  // Fix trailing commas, control chars
  cleaned = cleaned
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/[\x00-\x1F\x7F]/g, (c) => c === "\n" || c === "\t" ? c : "");

  try {
    return JSON.parse(cleaned);
  } catch (_e2) {
    // Response likely truncated — try to repair by closing open brackets/braces
  }

  // Count and close unclosed brackets
  const openBrackets = (cleaned.match(/\[/g) || []).length;
  const closeBrackets = (cleaned.match(/\]/g) || []).length;
  const openBraces = (cleaned.match(/\{/g) || []).length;
  const closeBraces = (cleaned.match(/\}/g) || []).length;

  // Trim to last complete string (remove partial trailing item)
  cleaned = cleaned.replace(/,\s*"[^"]*$/, "");
  cleaned = cleaned.replace(/,\s*$/, "");

  // Close arrays then objects
  for (let i = 0; i < openBrackets - closeBrackets; i++) cleaned += "]";
  for (let i = 0; i < openBraces - closeBraces; i++) cleaned += "}";

  // Final cleanup pass
  cleaned = cleaned
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]");

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON repair failed. First 500 chars:", cleaned.substring(0, 500));
    console.error("Last 200 chars:", cleaned.substring(cleaned.length - 200));
    throw new Error("Failed to parse AI response as JSON after repair attempts");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { answers } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const bcsInterpretation = answers.bodyCondition <= 3
      ? 'underweight — visible ribs, minimal muscle mass'
      : answers.bodyCondition <= 5
      ? 'ideal — ribs palpable with slight fat cover, visible waist'
      : answers.bodyCondition <= 7
      ? 'overweight — ribs difficult to palpate, waist barely visible'
      : 'obese — no palpable ribs, abdominal distension';

    const userPrompt = `Create a comprehensive, personalized French Bulldog care plan for this specific dog:

PATIENT PROFILE:
- Life Stage: ${answers.lifeStage} (${answers.lifeStage === 'puppy' ? 'Under 12 months — growth phase' : answers.lifeStage === 'senior' ? '7+ years — geriatric considerations' : '1-7 years — maintenance phase'})
- Weight Range: ${answers.weight === 'under20' ? 'Under 20 lbs (8-9 kg)' : answers.weight === '20-28' ? '20-28 lbs (9-13 kg)' : 'Over 28 lbs (13+ kg)'}
- Body Condition Score: ${answers.bodyCondition}/9 — ${bcsInterpretation}
- Primary Health Concern: ${answers.concern} — ${
      answers.concern === 'skin' ? 'Presenting with dermatological issues: pruritus, erythema, possible atopic dermatitis or food allergy' :
      answers.concern === 'pulling' ? 'Behavioral: excessive leash pulling, possible leash reactivity, risk of tracheal injury' :
      answers.concern === 'diet' ? 'Nutritional optimization needed: weight management, food selection, portion control' :
      answers.concern === 'breathing' ? 'Brachycephalic Obstructive Airway Syndrome (BOAS) — stenotic nares, elongated soft palate, exercise intolerance' :
      'General preventive wellness and longevity optimization'
    }
- Activity Level: ${answers.activityLevel} — ${
      answers.activityLevel === 'low' ? 'Sedentary, minimal voluntary exercise, higher obesity risk' :
      answers.activityLevel === 'active' ? 'High energy, enthusiastic about play and walks, heat stroke risk elevated' :
      'Moderate daily activity, standard exercise tolerance'
    }
- Living Environment: ${answers.environment.length > 0 ? answers.environment.map((e: string) =>
      e === 'apartment' ? 'Apartment (limited outdoor access)' :
      e === 'house' ? 'House with yard (unsupervised outdoor risk)' :
      e === 'hot' ? 'Hot climate (heat stroke is life-threatening for this breed)' :
      'Cold climate (hypothermia risk, paw protection needed)'
    ).join('; ') : 'Not specified'}

Generate the most thorough, clinically precise care plan possible. Each recommendation should feel like it came from a specialist consultation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    const planData = extractJsonFromResponse(content);

    // Map icon codes to emoji and sanitize
    const sections = planData.sections.map((s: any) => ({
      icon: ICON_MAP[s.icon] || ICON_MAP[s.icon?.toUpperCase()] || '📋',
      title: s.title,
      items: s.items.map((item: string) => 
        item.replace(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu, '').trim()
      ),
      articleLink: s.articleLink || undefined,
    }));

    return new Response(JSON.stringify({ sections }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Plan generation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
