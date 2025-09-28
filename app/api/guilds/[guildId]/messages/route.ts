import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { serializeGuildMessage } from "@/lib/guild";

const MAX_LENGTH = 500;

async function resolveMembershipContext(guildId: string, viewerId: string) {
  const membership = await prisma.guildMembership.findUnique({
    where: {
      guildId_profileId: {
        guildId,
        profileId: viewerId,
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

  if (membership) {
    return { membership, isGuardian: false } as const;
  }

  const guardianMembership = await prisma.guildMembership.findFirst({
    where: {
      guildId,
      profile: {
        guardianProfileId: viewerId,
      },
    },
    include: {
      profile: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!guardianMembership) {
    throw new Error("not-member");
  }

  return { membership: guardianMembership, isGuardian: true } as const;
}

export async function GET(
  _request: Request,
  { params }: { params: { guildId: string } }
) {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let context;
  try {
    context = await resolveMembershipContext(params.guildId, profile.id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const retentionDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const messages = await prisma.guildMessage.findMany({
    where: {
      guildId: params.guildId,
      createdAt: { gte: retentionDate },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      sender: {
        select: {
          id: true,
          isShadowbanned: true,
        },
      },
    },
  });

  const visibleMessages = messages.filter((message) => {
    if (context.isGuardian) {
      return true;
    }
    if (message.senderId === profile.id) {
      return true;
    }
    if (context.membership.isBlockedByGuardian) {
      return false;
    }
    return !message.sender.isShadowbanned;
  });

  return NextResponse.json({ messages: visibleMessages.map(serializeGuildMessage) });
}

export async function POST(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let context;
  try {
    context = await resolveMembershipContext(params.guildId, profile.id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (context.isGuardian) {
    return NextResponse.json({ error: "Guardians cannot send messages" }, { status: 403 });
  }

  if (context.membership.isBlockedByGuardian) {
    return NextResponse.json({ error: "Conversation blocked by guardian" }, { status: 403 });
  }

  const { content } = await request.json().catch(() => ({}));

  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  if (content.length > MAX_LENGTH) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const message = await prisma.guildMessage.create({
    data: {
      guildId: params.guildId,
      senderId: profile.id,
      content: content.trim(),
    },
  });

  return NextResponse.json({ message: serializeGuildMessage(message) }, { status: 201 });
}
