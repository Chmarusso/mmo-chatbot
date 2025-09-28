import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile, serializeProfile } from "@/lib/profile";

export async function GET() {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [directMessages, guildMessages] = await Promise.all([
    prisma.message.findMany({
      where: {
        senderId: profile.id,
      },
      orderBy: { createdAt: "desc" },
      include: {
        match: {
          include: {
            user1: { include: { user: true } },
            user2: { include: { user: true } },
          },
        },
      },
    }),
    prisma.guildMessage.findMany({
      where: {
        senderId: profile.id,
      },
      orderBy: { createdAt: "desc" },
      include: {
        guild: true,
      },
    }),
  ]);

  const directPayload = directMessages.map((msg) => {
    const { match } = msg;
    const other = match.user1Id === profile.id ? match.user2 : match.user1;
    return {
      id: msg.id,
      matchId: msg.matchId,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
      otherParticipant: serializeProfile(other, other.user),
    };
  });

  const guildPayload = guildMessages.map((msg) => ({
    id: msg.id,
    guildId: msg.guildId,
    content: msg.content,
    createdAt: msg.createdAt.toISOString(),
    guild: {
      id: msg.guild.id,
      name: msg.guild.name,
      description: msg.guild.description,
    },
  }));

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    profile,
    directMessages: directPayload,
    guildMessages: guildPayload,
  });
}
