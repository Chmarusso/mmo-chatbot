import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";

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
    select: {
      id: true,
      user1Id: true,
      user2Id: true,
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const isParticipant = match.user1Id === profile.id || match.user2Id === profile.id;
  if (!isParticipant) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const now = new Date();
  const updateData: { user1LastViewedAt?: Date; user2LastViewedAt?: Date } = {};

  if (match.user1Id === profile.id) {
    updateData.user1LastViewedAt = now;
  } else {
    updateData.user2LastViewedAt = now;
  }

  await prisma.match.update({
    where: { id: matchId },
    data: updateData,
  });

  return NextResponse.json({ success: true });
}
