import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = process.env.MODERATION_SECRET;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.MODERATION_MODEL ?? "openrouter/auto";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

interface ModerationResult {
  shadowban: boolean;
  reason?: string;
}

async function fetchRecentMessages(profileId: string) {
  const [directMessages, guildMessages] = await Promise.all([
    prisma.message.findMany({
      where: { senderId: profileId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        content: true,
        createdAt: true,
        matchId: true,
      },
    }),
    prisma.guildMessage.findMany({
      where: { senderId: profileId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        content: true,
        createdAt: true,
        guildId: true,
      },
    }),
  ]);

  const combined = [
    ...directMessages.map((msg) => ({
      channel: `match:${msg.matchId}`,
      content: msg.content,
      createdAt: msg.createdAt,
    })),
    ...guildMessages.map((msg) => ({
      channel: `guild:${msg.guildId}`,
      content: msg.content,
      createdAt: msg.createdAt,
    })),
  ];

  return combined
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);
}

async function runModeration(messages: { channel: string; content: string; createdAt: Date }[]) {
  if (!OPENROUTER_KEY) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const formatted = messages
    .map((msg) => `- [${msg.createdAt.toISOString()}] (${msg.channel}) ${msg.content}`)
    .join("\n");

  const prompt = formatted || "No recent messages.";

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "HTTP-Referer": APP_URL,
      "X-Title": "MMO Match Moderation",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a moderation assistant. Review the provided MMO chat messages for spam, abuse, or suspicious content. Respond strictly with JSON: {\"shadowban\": boolean, \"reason\": string}. Shadowban when content is spammy, abusive, or harmful.",
        },
        {
          role: "user",
          content: `Here are the last messages from a user:\n${prompt}`,
        },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter request failed: ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("Unexpected response from OpenRouter");
  }

  try {
    const parsed = JSON.parse(content) as ModerationResult;
    if (typeof parsed.shadowban !== "boolean") {
      throw new Error("Missing shadowban field");
    }
    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse moderation response: ${(error as Error).message}`);
  }
}

export async function POST(request: Request) {
  if (!SECRET) {
    return NextResponse.json({ error: "Moderation secret not configured" }, { status: 500 });
  }

  const providedSecret = request.headers.get("x-moderation-secret")?.trim();
  if (providedSecret !== SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { profileId } = (await request.json().catch(() => ({}))) as { profileId?: string };

  if (!profileId || typeof profileId !== "string") {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const recentMessages = await fetchRecentMessages(profileId);

  const moderation = await runModeration(recentMessages);

  if (moderation.shadowban) {
    await prisma.profile.update({
      where: { id: profileId },
      data: { isShadowbanned: true },
    });
  }

  return NextResponse.json({
    profileId,
    shadowbanApplied: moderation.shadowban,
    reason: moderation.reason ?? null,
    reviewedMessages: recentMessages.length,
  });
}
