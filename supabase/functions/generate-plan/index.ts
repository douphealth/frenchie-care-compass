import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a world-class veterinary care advisor specializing in French Bulldogs. You create personalized, science-backed care plans based on the dog's profile.

IMPORTANT RULES:
- Return ONLY valid JSON, no markdown, no code fences
- Every recommendation must be specific, actionable, and backed by veterinary science
- Tailor advice precisely to the dog's life stage, weight, body condition, activity level, concerns, and environment
- Include specific numbers (calories, portions, supplement dosages, walk durations)
- Mention breed-specific issues (BOAS, IVDD, skin fold dermatitis, cherry eye, etc.)
- Be warm and caring in tone but precise and credible in content
- Never use emoji characters

Return this exact JSON structure:
{
  "sections": [
    {
      "icon": "FEEDING",
      "title": "Section Title",
      "items": ["Recommendation 1", "Recommendation 2", ...],
      "articleLink": { "label": "Article Title", "url": "https://frenchyfab.com/..." }
    }
  ]
}

Required sections (in order):
1. "Personalized Feeding Plan" - with calorie targets, portion sizes, meal frequency, protein %, specific food recommendations. Link: https://frenchyfab.com/french-bulldog-healthy-treats
2. "Grooming Routine" - wrinkle care, bathing schedule, nail trimming, dental care, ear care. Link: https://frenchyfab.com/french-bulldog-grooming-blueprint/
3. "Exercise Plan" - walk duration, play types, exercise restrictions based on breathing/age
4. "Health Watch-Outs" - breed-specific health screenings, vaccination schedule, warning signs
5. "Supplement Recommendations" - specific supplements with dosages (omega-3, probiotics, glucosamine, etc.). Link: https://frenchyfab.com/essential-nutritional-supplements-french-bulldogs/
6. "Environment & Safety" - only if environment data provided, climate-specific and housing-specific tips

If concern is "pulling", add section: "Leash Training & Harness Tips" with link https://frenchyfab.com/best-harness-for-french-bulldog-that-pulls/
If concern is "wellness", add section: "Preventive Wellness Checklist"

Each section should have 5-8 detailed, actionable recommendations. Be specific with numbers and timelines.`;

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

    const userPrompt = `Create a personalized French Bulldog care plan for:
- Life Stage: ${answers.lifeStage} (${answers.lifeStage === 'puppy' ? 'under 1 year' : answers.lifeStage === 'senior' ? '7+ years' : '1-7 years'})
- Weight: ${answers.weight === 'under20' ? 'Under 20 lbs' : answers.weight === '20-28' ? '20-28 lbs' : 'Over 28 lbs'}
- Body Condition Score: ${answers.bodyCondition}/9 (${answers.bodyCondition <= 3 ? 'underweight' : answers.bodyCondition >= 7 ? 'overweight' : 'healthy'})
- Primary Concern: ${answers.concern} (${
      answers.concern === 'skin' ? 'Skin allergies, itching, redness' :
      answers.concern === 'pulling' ? 'Leash pulling and reactivity' :
      answers.concern === 'diet' ? 'Diet optimization and weight management' :
      answers.concern === 'breathing' ? 'BOAS, breathing difficulties, exercise intolerance' :
      'General preventive wellness'
    })
- Activity Level: ${answers.activityLevel} (${
      answers.activityLevel === 'low' ? 'Prefers lounging, minimal exercise' :
      answers.activityLevel === 'active' ? 'Loves running and playing' :
      'Daily walks with some play'
    })
- Environment: ${answers.environment.length > 0 ? answers.environment.join(', ') : 'Not specified'}

Generate a comprehensive, personalized care plan with specific actionable recommendations.`;

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

    // Parse the JSON response, stripping any markdown code fences
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const planData = JSON.parse(cleanContent);

    // Transform to match PlanSection format
    const sections = planData.sections.map((s: any) => ({
      icon: s.icon || '',
      title: s.title,
      items: s.items,
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
