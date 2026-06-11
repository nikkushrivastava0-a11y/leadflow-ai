export async function scoreLead(lead: {
  name: string;
  email: string;
  phone: string;
  source: string;
  notes: string;
}): Promise<{ score: number; reason: string }> {
  try {
    const apiKey = process.env.GEMINI_API_KEY || "";

    const prompt = `You are a sales lead scoring expert. Analyze this lead and give it a score from 0 to 100 based on how promising/qualified it is.

Lead details:
- Name: ${lead.name}
- Email: ${lead.email || "not provided"}
- Phone: ${lead.phone || "not provided"}
- Source: ${lead.source}
- Notes: ${lead.notes || "none"}

Scoring guidelines:
- Higher score if email AND phone are provided
- Higher score if source is "referral" or "website"
- Higher score if notes show clear buying interest
- Lower score if minimal info or low intent

Respond ONLY with valid JSON in this exact format, nothing else:
{"score": <number 0-100>, "reason": "<one short sentence>"}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      console.error("Gemini API error:", response.status, await response.text());
      return { score: 50, reason: "AI scoring unavailable." };
    }

    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { score: 50, reason: "Could not analyze lead." };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
      reason: parsed.reason || "No reason provided.",
    };
  } catch (error) {
    console.error("Gemini scoring error:", error);
    return { score: 50, reason: "AI scoring unavailable, default score." };
  }
}