import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";

export async function POST(request: Request) {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!profile.inviteCode?.trim()) {
    return NextResponse.json({ error: "Invite required" }, { status: 403 });
  }

  const { swipedId, direction } = await request.json();

  if (typeof swipedId !== "string" || !["yes", "no"].includes(direction)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (swipedId === profile.id) {
    return NextResponse.json({ error: "Cannot swipe on yourself" }, { status: 400 });
  }

  const targetProfile = await prisma.profile.findUnique({
    where: { id: swipedId },
    select: {
      id: true,
      isChild: true,
      guardianProfileId: true,
    },
  });

  if (!targetProfile) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  await prisma.swipe.upsert({
    where: {
      swiperId_swipedId: {
        swiperId: profile.id,
        swipedId,
      },
    },
    create: {
      swiperId: profile.id,
      swipedId,
      direction: direction === "yes" ? "YES" : "NO",
    },
    update: {
      direction: direction === "yes" ? "YES" : "NO",
    },
  });

  let matched = false;
  let matchId: string | null = null;
  let requiresApproval = false;
  let matchStatus: string | null = null;

  if (direction === "yes") {
    const reciprocal = await prisma.swipe.findUnique({
      where: {
        swiperId_swipedId: {
          swiperId: swipedId,
          swipedId: profile.id,
        },
      },
    });

    if (reciprocal && reciprocal.direction === "YES") {
      const [user1Id, user2Id] = [profile.id, swipedId].sort();

      const existingMatch = await prisma.match.findUnique({
        where: {
          user1Id_user2Id: {
            user1Id,
            user2Id,
          },
        },
      });

      if (existingMatch) {
        matched = true;
        matchId = existingMatch.id;
        requiresApproval = existingMatch.requiresGuardianApproval;
        matchStatus = existingMatch.status;
      } else {
        const childGuardianIds = [
          profile.guardianProfileId,
          targetProfile.guardianProfileId ?? null,
        ].filter((value): value is string => Boolean(value));

        requiresApproval = Boolean(
          (profile.isChild && profile.guardianProfileId) ||
            (targetProfile.isChild && targetProfile.guardianProfileId)
        );

        const match = await prisma.match.create({
          data: {
            user1Id,
            user2Id,
            status: requiresApproval ? "PENDING" : "ACTIVE",
            requiresGuardianApproval: requiresApproval,
          },
        });
        matched = true;
        matchId = match.id;
        matchStatus = match.status;
      }
    }
  }

  return NextResponse.json({ success: true, matched, matchId, requiresApproval, matchStatus });
}

export async function DELETE(request: Request) {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!profile.inviteCode?.trim()) {
    return NextResponse.json({ error: "Invite required" }, { status: 403 });
  }

  const url = new URL(request.url);
  const swipedId = url.searchParams.get("swipedId");

  if (!swipedId) {
    return NextResponse.json({ error: "Missing swipedId" }, { status: 400 });
  }

  try {
    await prisma.swipe.delete({
      where: {
        swiperId_swipedId: {
          swiperId: profile.id,
          swipedId,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Swipe not found" }, { status: 404 });
  }

  const [user1Id, user2Id] = [profile.id, swipedId].sort();
  const existingMatch = await prisma.match.findUnique({
    where: {
      user1Id_user2Id: {
        user1Id,
        user2Id,
      },
    },
  });

  let matchRemoved = false;
  if (existingMatch) {
    await prisma.match.delete({ where: { id: existingMatch.id } });
    matchRemoved = true;
  }

  return NextResponse.json({ success: true, matchRemoved });
}
