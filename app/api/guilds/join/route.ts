import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { serializeGuild } from "@/lib/guild";

export async function POST(request: Request) {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { inviteCode, nickname } = await request.json().catch(() => ({}));

  if (!inviteCode || typeof inviteCode !== "string") {
    return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
  }

  const normalizedCode = inviteCode.trim().toUpperCase();
  if (!normalizedCode) {
    return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
  }

  const guild = await prisma.guild.findUnique({ where: { inviteCode: normalizedCode } });

  if (!guild) {
    return NextResponse.json({ error: "Guild not found" }, { status: 404 });
  }

  const existingMembership = await prisma.guildMembership.findUnique({
    where: {
      guildId_profileId: {
        guildId: guild.id,
        profileId: profile.id,
      },
    },
  });

  if (existingMembership) {
    const updatedMembership = await prisma.guildMembership.update({
      where: { id: existingMembership.id },
      data: {
        nickname: typeof nickname === "string" && nickname.trim() ? nickname.trim().slice(0, 80) : existingMembership.nickname,
      },
    });

    return NextResponse.json({
      guild: serializeGuild(guild, updatedMembership),
      message: "You are already a member of this guild",
    });
  }

  const membership = await prisma.guildMembership.create({
    data: {
      guildId: guild.id,
      profileId: profile.id,
      role: "MEMBER",
      nickname: typeof nickname === "string" && nickname.trim() ? nickname.trim().slice(0, 80) : null,
    },
  });

  const memberCount = await prisma.guildMembership.count({ where: { guildId: guild.id } });

  return NextResponse.json({
    guild: serializeGuild(guild, membership, memberCount),
  });
}
