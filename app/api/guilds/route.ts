import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import {
  generateInviteCode,
  serializeGuild,
  isCodeRedeemable,
} from "@/lib/guild";

export async function GET() {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membershipWhere = profile.isChild
    ? { profileId: profile.id }
    : {
        OR: [
          { profileId: profile.id },
          {
            profile: {
              guardianProfileId: profile.id,
            },
          },
        ],
      };

  const memberships = await prisma.guildMembership.findMany({
    where: membershipWhere,
    include: {
      guild: true,
    },
  });

  const guildIds = memberships.map((membership) => membership.guildId);
  const memberCounts = guildIds.length
    ? await prisma.guildMembership.groupBy({
        by: ["guildId"],
        where: { guildId: { in: guildIds } },
        _count: { _all: true },
      })
    : [];

  const countMap = new Map(memberCounts.map((row) => [row.guildId, row._count._all]));

  const guilds = memberships.map((membership) =>
    serializeGuild(membership.guild, membership, countMap.get(membership.guildId))
  );

  return NextResponse.json({ guilds });
}

export async function POST(request: Request) {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!profile.isVerified) {
    return NextResponse.json({ error: "Only verified players can create guilds" }, { status: 403 });
  }

  const { name, description, creationCode } = await request.json().catch(() => ({}));

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Guild name is required" }, { status: 400 });
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return NextResponse.json({ error: "Guild name cannot be empty" }, { status: 400 });
  }

  if (!creationCode || typeof creationCode !== "string") {
    return NextResponse.json({ error: "Creation code is required" }, { status: 400 });
  }

  const normalizedCreationCode = creationCode.trim().toUpperCase();
  const creationCodeRecord = await prisma.guildCreationCode.findUnique({
    where: { code: normalizedCreationCode },
    include: { payment: true },
  });

  if (!creationCodeRecord) {
    return NextResponse.json({ error: "Creation code not found" }, { status: 404 });
  }

  if (!isCodeRedeemable(creationCodeRecord)) {
    return NextResponse.json({ error: "Creation code is not available" }, { status: 409 });
  }

  const inviteCode = await generateUniqueInviteCode();

  const guild = await prisma.$transaction(async (tx) => {
    const guildRecord = await tx.guild.create({
      data: {
        name: trimmedName.slice(0, 80),
        description: typeof description === "string" ? description.trim().slice(0, 250) || null : null,
        ownerId: profile.id,
        inviteCode,
        creationCodeId: creationCodeRecord.id,
        members: {
          create: {
            profileId: profile.id,
            role: "OWNER",
          },
        },
      },
      include: {
        members: {
          where: { profileId: profile.id },
          take: 1,
        },
      },
    });

    await tx.guildCreationCode.update({
      where: { id: creationCodeRecord.id },
      data: {
        redeemedAt: new Date(),
        redeemedByProfileId: profile.id,
      },
    });

    return guildRecord;
  });

  const membership = guild.members[0] ?? null;

  return NextResponse.json({ guild: serializeGuild(guild, membership, 1) }, { status: 201 });
}

async function generateUniqueInviteCode() {
  for (let attempts = 0; attempts < 5; attempts += 1) {
    const code = generateInviteCode();
    const existing = await prisma.guild.findFirst({ where: { inviteCode: code } });
    if (!existing) {
      return code;
    }
  }
  throw new Error("Failed to generate a unique invite code");
}
