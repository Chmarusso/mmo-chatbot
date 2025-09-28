import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { serializeQrInvite } from "@/lib/guild";

const INVITE_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour

async function getMembership(guildId: string, profileId: string) {
  return prisma.guildMembership.findUnique({
    where: {
      guildId_profileId: {
        guildId,
        profileId,
      },
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: { guildId: string } }
) {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getMembership(params.guildId, profile.id);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invites = await prisma.guildQrInvite.findMany({
    where: {
      guildId: params.guildId,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ invites: invites.map(serializeQrInvite) });
}

export async function POST(
  _request: Request,
  { params }: { params: { guildId: string } }
) {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getMembership(params.guildId, profile.id);
  if (!membership || (membership.role !== "OWNER" && membership.role !== "OFFICER")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invite = await prisma.$transaction(async (tx) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateInviteCode();
      try {
        return await tx.guildQrInvite.create({
          data: {
            guildId: params.guildId,
            code,
            expiresAt: new Date(Date.now() + INVITE_EXPIRATION_MS),
            createdById: profile.id,
          },
        });
      } catch (error) {
        if ((error as { code?: string }).code !== "P2002") {
          throw error;
        }
      }
    }

    throw new Error("Failed to create unique invite code");
  });

  return NextResponse.json({ invite: serializeQrInvite(invite) }, { status: 201 });
}

function generateInviteCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}
