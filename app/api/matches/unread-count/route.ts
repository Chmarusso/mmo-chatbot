import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";

export const revalidate = 0;

export async function GET() {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ unreadMatches: 0 }, { status: 200 });
  }

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ user1Id: profile.id }, { user2Id: profile.id }],
    },
    select: {
      id: true,
      user1Id: true,
      user2Id: true,
      status: true,
      requiresGuardianApproval: true,
      user1LastViewedAt: true,
      user2LastViewedAt: true,
      user1: { include: { user: true } },
      user2: { include: { user: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          createdAt: true,
          senderId: true,
        },
      },
    },
  });

  const unreadMatches = matches.filter((match) => {
    if (match.status !== "ACTIVE") {
      return match.status === "PENDING";
    }

    const latestMessage = match.messages[0];

    if (!latestMessage) {
      return true;
    }

    // If the latest message was sent by the current user, it's not unread
    if (latestMessage.senderId === profile.id) {
      return false;
    }

    // Check if the user has viewed the match since the latest message
    const isUser1 = match.user1Id === profile.id;
    const lastViewedAt = isUser1 ? match.user1LastViewedAt : match.user2LastViewedAt;
    
    if (!lastViewedAt) {
      // If never viewed, it's unread
      return true;
    }

    // If the latest message was sent after the last viewed time, it's unread
    return new Date(latestMessage.createdAt) > new Date(lastViewedAt);
  }).length;

  const summaries = matches.map((match) => {
    const other = match.user1Id === profile.id ? match.user2 : match.user1;
    return {
      matchId: match.id,
      otherProfileId: other.id,
      otherName: other.name,
      gamePref: other.gamePref ?? null,
      timeSlot: other.timeSlot ?? null,
      language: other.language ?? null,
      playstyle: other.playstyle ?? null,
      bio: other.bio ?? null,
    };
  });

  return NextResponse.json({ unreadMatches, matches: summaries });
}
