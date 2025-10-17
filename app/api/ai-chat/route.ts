import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { classifyIntent } from "@/lib/intent-detection";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const COMPANION_MODEL = process.env.COMPANION_MODEL ?? "anthropic/claude-3.5-haiku";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const MAX_HISTORY = 12;
const MAX_MESSAGE_LENGTH = 1000;

const SYSTEM_PROMPT = `
You are the MMOPLAYA Companion, an upbeat MMO strategist who helps players plan squads, optimize builds, schedule raids, and keep play healthy. 
Give concise, encouraging answers grounded in common MMORPG knowledge. 
Ask clarifying questions when needed. 
If asked for real-world data you don't know, say so. 
Keep the conversation safe and friendly—no profanity, no personal data collection.
`.trim();

function mapRoleToApi(role: "USER" | "ASSISTANT") {
  return role === "USER" ? "user" : "assistant";
}

function buildProfileSnapshot(profile: {
  gamePref: string | null;
  playstyle: string | null;
  timeSlot: string | null;
  timeSlots?: string[] | null;
  gamePreferences?: string[] | null;
}) {
  const timeSlots = Array.from(new Set(profile.timeSlots ?? []));
  const primaryTimeSlot = timeSlots[0] ?? profile.timeSlot ?? null;

  return {
    gamePref: profile.gamePref,
    playstyle: profile.playstyle,
    timeSlot: primaryTimeSlot,
    timeSlots,
    gamePreferences: profile.gamePreferences ?? [],
  };
}

export async function GET() {
  const profile = await getOrCreateProfile();

  if (!profile.inviteCode?.trim()) {
    return NextResponse.json(
      { error: "Invite code required to use the companion." },
      { status: 403 },
    );
  }

  const profileSnapshot = buildProfileSnapshot(profile);

  const conversation = await prisma.aiConversation.findUnique({
    where: { profileId: profile.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) {
    await prisma.aiConversation.create({
      data: {
        profileId: profile.id,
      },
    });

    return NextResponse.json({ messages: [], profile: profileSnapshot });
  }

  const messages = conversation.messages.map((message) => ({
    id: message.id,
    role: message.role.toLowerCase(),
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    ...(message.intent && {
      intent: message.intent,
      intentConfidence: message.intentConfidence,
      intentEntities: message.intentEntities,
    }),
  }));

  return NextResponse.json({ messages, profile: profileSnapshot });
}

export async function POST(request: Request) {
  if (!OPENROUTER_KEY) {
    return NextResponse.json(
      { error: "AI chat is not configured. Set OPENROUTER_API_KEY." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { message?: string }
    | null;

  const message = body?.message?.trim();

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).` },
      { status: 400 },
    );
  }

  const profile = await getOrCreateProfile();

  if (!profile.inviteCode?.trim()) {
    return NextResponse.json(
      { error: "Invite code required to use the companion." },
      { status: 403 },
    );
  }

  const conversation = await prisma.aiConversation.upsert({
    where: { profileId: profile.id },
    update: {},
    create: {
      profileId: profile.id,
    },
  });

  let userMessageRecord: { id: string; createdAt: Date; content: string } | null = null;

  try {
    // Detect intent for user message
    const intentResult = await classifyIntent(message);

    userMessageRecord = await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: message,
        intent: intentResult.intent,
        intentConfidence: intentResult.confidence,
        intentEntities: intentResult.entities,
      },
    });

    const totalMessages = await prisma.aiMessage.count({
      where: { conversationId: conversation.id },
    });

    const skip = Math.max(0, totalMessages - MAX_HISTORY * 2);

    const history = await prisma.aiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      skip,
      take: MAX_HISTORY * 2,
    });

    const chatHistory = history.map((entry) => ({
      role: mapRoleToApi(entry.role),
      content: entry.content,
    }));

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": APP_URL,
        "X-Title": "MMOPLAYA Companion",
      },
      body: JSON.stringify({
        model: COMPANION_MODEL,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          ...chatHistory,
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter error: ${errorText}`);
    }

    const data = await response.json();
    const assistantContent =
      (data?.choices?.[0]?.message?.content as string | undefined)?.trim();

    if (!assistantContent) {
      throw new Error("No response from AI companion.");
    }

    const assistantMessage = await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: assistantContent,
      },
    });

    // Fetch the complete user message with intent data
    const completeUserMessage = await prisma.aiMessage.findUnique({
      where: { id: userMessageRecord.id },
    });

    return NextResponse.json({
      messages: [
        {
          id: userMessageRecord.id,
          role: "user",
          content: message,
          createdAt: userMessageRecord.createdAt.toISOString(),
          ...(completeUserMessage?.intent && {
            intent: completeUserMessage.intent,
            intentConfidence: completeUserMessage.intentConfidence,
            intentEntities: completeUserMessage.intentEntities,
          }),
        },
        {
          id: assistantMessage.id,
          role: "assistant",
          content: assistantContent,
          createdAt: assistantMessage.createdAt.toISOString(),
        },
      ],
      profile: buildProfileSnapshot(profile),
    });
  } catch (error) {
    if (userMessageRecord) {
      await prisma.aiMessage
        .delete({ where: { id: userMessageRecord.id } })
        .catch(() => {});
    }

    console.error("AI companion error:", error);
    const messageText =
      error instanceof Error ? error.message : "Failed to contact AI companion.";
    return NextResponse.json({ error: messageText }, { status: 502 });
  }
}
