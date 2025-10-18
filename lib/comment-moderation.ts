const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = process.env.COMMENT_MODERATION_MODEL ?? "mistralai/mistral-7b-instruct";

type ModerationOutcome = {
  allowed: boolean;
  reasons?: string[];
};

const systemPrompt = [
  "You are a strict content moderator for MMO community comments.",
  "Return ONLY a compact JSON object: {\"allowed\": true|false, \"reasons\": [optional array of short strings]}",
  "Flag content that is sexually explicit, hateful, violent threats, self-harm instructions, spam/advertising, scams, phishing, or otherwise abusive.",
  "Treat repeated characters, nonsense, links to unknown stores, or requests for personal info as spam.",
  "If unsure, prefer allowed: true.",
].join("\n");

export async function moderateComment(content: string): Promise<ModerationOutcome> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("OPENROUTER_API_KEY not set; skipping comment moderation.");
    return { allowed: true };
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
        "X-Title": "MMOPLAYA Comment Moderation",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        temperature: 0,
        max_tokens: 150,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Comment moderation request failed:", await response.text());
      return { allowed: true };
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;

    if (typeof reply !== "string") {
      console.warn("Unexpected moderation response shape:", data);
      return { allowed: true };
    }

    const candidate = extractJson(reply);
    if (!candidate) {
      throw new Error("Could not extract moderation JSON");
    }

    const result = candidate as ModerationOutcome;
    if (typeof result.allowed !== "boolean") {
      throw new Error("Invalid moderation payload");
    }
    return result;
  } catch (error) {
    console.error("Comment moderation error:", error);
    return { allowed: true };
  }
}

function extractJson(text: string): Record<string, unknown> | null {
  const fenceMatch = text.match(/```json([\s\S]*?)```/i);
  const raw = fenceMatch ? fenceMatch[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}
