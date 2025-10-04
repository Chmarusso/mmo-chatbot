import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";

const forbidden = NextResponse.json({ error: "Forbidden" }, { status: 403 });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile || profile.isChild) {
    return forbidden;
  }

  const { childProfileId, action } = (await request.json().catch(() => ({}))) as {
    childProfileId?: string;
    action?: "block" | "unblock";
  };

  if (!childProfileId || !action) {
    return NextResponse.json({ error: "childProfileId and action are required" }, { status: 400 });
  }

  const membership = await prisma.guildMembership.findUnique({
    where: {
      guildId_profileId: {
        guildId: guildId,
        profileId: childProfileId,
      },
    },
    include: {
      profile: {
        select: {
          guardianProfileId: true,
        },
      },
    },
  });

  if (!membership || membership.profile.guardianProfileId !== profile.id) {
    return forbidden;
  }

  const isBlocked = action === "block";

  const updated = await prisma.guildMembership.update({
    where: { id: membership.id },
    data: {
      isBlockedByGuardian: isBlocked,
    },
  });

  return NextResponse.json({
    membershipId: updated.id,
    isBlockedByGuardian: updated.isBlockedByGuardian,
  });
}
