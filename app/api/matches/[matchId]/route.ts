import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";

interface RouteProps {
  params: Promise<{ matchId: string }>;
}

export async function DELETE(request: Request, { params }: RouteProps) {
  const { matchId } = await params;
  const profile = await getOrCreateProfile().catch(() => null);
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, user1Id: true, user2Id: true },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (match.user1Id !== profile.id && match.user2Id !== profile.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.match.delete({ where: { id: match.id } });
  await prisma.swipe.deleteMany({
    where: {
      OR: [
        { swiperId: match.user1Id, swipedId: match.user2Id },
        { swiperId: match.user2Id, swipedId: match.user1Id },
      ],
    },
  });

  return NextResponse.json({ success: true });
}

export async function POST(request: Request, { params }: RouteProps) {
  const { matchId } = await params;
  const profile = await getOrCreateProfile().catch(() => null);
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      user1: true,
      user2: true,
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (match.user1Id !== profile.id && match.user2Id !== profile.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json().catch(() => ({}));
  const reason = typeof payload.reason === "string" ? payload.reason.trim() : null;

  await prisma.analyticsEvent.create({
    data: {
      eventType: "match.reported",
      profileId: profile.id,
      metadata: {
        matchId: match.id,
        reason,
        reportedProfileId: match.user1Id === profile.id ? match.user2Id : match.user1Id,
        createdAt: new Date().toISOString(),
      },
    },
  });

  return NextResponse.json({ success: true });
}
