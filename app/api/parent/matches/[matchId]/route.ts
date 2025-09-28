import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";

const forbidden = NextResponse.json({ error: "Forbidden" }, { status: 403 });

export async function POST(
  request: Request,
  { params }: { params: { matchId: string } }
) {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile || profile.isChild) {
    return forbidden;
  }

  const { action } = (await request.json().catch(() => ({}))) as { action?: string };

  if (!action) {
    return NextResponse.json({ error: "Action is required" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({
    where: { id: params.matchId },
    include: {
      user1: {
        select: {
          id: true,
          guardianProfileId: true,
          isChild: true,
        },
      },
      user2: {
        select: {
          id: true,
          guardianProfileId: true,
          isChild: true,
        },
      },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const isGuardian =
    match.user1.guardianProfileId === profile.id || match.user2.guardianProfileId === profile.id;

  if (!isGuardian) {
    return forbidden;
  }

  if (action === "approve") {
    const updated = await prisma.match.update({
      where: { id: match.id },
      data: {
        status: "ACTIVE",
        requiresGuardianApproval: false,
        approvedAt: new Date(),
        approvedByProfileId: profile.id,
      },
      include: {
        user1: true,
        user2: true,
      },
    });

    return NextResponse.json({ match: updated });
  }

  if (action === "block") {
    const updated = await prisma.match.update({
      where: { id: match.id },
      data: {
        status: "BLOCKED",
        blockedAt: new Date(),
        blockedByProfileId: profile.id,
      },
      include: {
        user1: true,
        user2: true,
      },
    });

    return NextResponse.json({ match: updated });
  }

  if (action === "unblock") {
    const updated = await prisma.match.update({
      where: { id: match.id },
      data: {
        status: match.requiresGuardianApproval ? "PENDING" : "ACTIVE",
        blockedAt: null,
        blockedByProfileId: null,
      },
      include: {
        user1: true,
        user2: true,
      },
    });

    return NextResponse.json({ match: updated });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
