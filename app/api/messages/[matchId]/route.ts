import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { awardExp } from "@/lib/exp";

const serializeMessage = (message: { id: string; matchId: string; senderId: string; content: string; createdAt: Date }) => ({
  id: message.id,
  matchId: message.matchId,
  senderId: message.senderId,
  content: message.content,
  createdAt: message.createdAt.toISOString(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      user1: {
        select: {
          id: true,
          guardianProfileId: true,
        },
      },
      user2: {
        select: {
          id: true,
          guardianProfileId: true,
        },
      },
    },
  });

  const isParticipant = match && (match.user1Id === profile.id || match.user2Id === profile.id);
  const isGuardian = match && (match.user1.guardianProfileId === profile.id || match.user2.guardianProfileId === profile.id);

  if (!match || (!isParticipant && !isGuardian)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  if (match.status === "BLOCKED" && !isGuardian) {
    return NextResponse.json({ error: "Conversation blocked" }, { status: 403 });
  }

  const url = new URL(request.url);
  const sinceParam = url.searchParams.get("since");
  const sinceDate = sinceParam ? new Date(sinceParam) : null;

  const retentionDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const messages = await prisma.message.findMany({
    where: {
      matchId: matchId,
      ...(sinceDate ? { createdAt: { gt: sinceDate } } : {}),
      createdAt: { gte: retentionDate },
    },
    orderBy: { createdAt: "asc" },
    include: {
      sender: {
        select: {
          id: true,
          isShadowbanned: true,
        },
      },
    },
  });

  const visibleMessages = messages.filter((message) => {
    if (isGuardian) {
      return true;
    }
    if (message.senderId === profile.id) {
      return true;
    }
    return !message.sender.isShadowbanned;
  });

  return NextResponse.json({ messages: visibleMessages.map(serializeMessage) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      user1: {
        select: { id: true, guardianProfileId: true },
      },
      user2: {
        select: { id: true, guardianProfileId: true },
      },
    },
  });

  const isParticipant = match && (match.user1Id === profile.id || match.user2Id === profile.id);
  const isGuardian = match && (match.user1.guardianProfileId === profile.id || match.user2.guardianProfileId === profile.id);

  if (!match || (!isParticipant && !isGuardian)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  if (match.status !== "ACTIVE") {
    return NextResponse.json({ error: "Conversation not available" }, { status: 403 });
  }

  if (profile.isChild && match.requiresGuardianApproval && match.status !== "ACTIVE") {
    return NextResponse.json({ error: "Awaiting guardian approval" }, { status: 403 });
  }

  const { content } = await request.json().catch(() => ({}));

  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      matchId,
      senderId: profile.id,
      content: content.trim(),
    },
  });

  // Award EXP for sending a message (rate-limited to 20/day)
  awardExp({
    profileId: profile.id,
    eventType: 'MESSAGE_SENT',
  }).catch(err => console.error('Failed to award message EXP:', err));

  return NextResponse.json({ message: serializeMessage(message) });
}
