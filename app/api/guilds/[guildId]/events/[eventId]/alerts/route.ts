import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { serializeGuildEventAlert } from "@/lib/guild";

const forbidden = NextResponse.json({ error: "Forbidden" }, { status: 403 });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ guildId: string; eventId: string }> }
) {
  const { guildId, eventId } = await params;
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.guildMembership.findUnique({
    where: {
      guildId_profileId: {
        guildId: guildId,
        profileId: profile.id,
      },
    },
  });

  if (!membership || membership.isBlockedByGuardian) {
    return forbidden;
  }

  const { channel } = (await request.json().catch(() => ({}))) as {
    channel?: "EMAIL" | "SMS" | "DISCORD" | "TELEGRAM";
  };

  if (!channel || !["EMAIL", "SMS", "DISCORD", "TELEGRAM"].includes(channel)) {
    return NextResponse.json({ error: "Unsupported channel" }, { status: 400 });
  }

  const alert = await prisma.guildEventAlert.upsert({
    where: {
      eventId_profileId_channel: {
        eventId: eventId,
        profileId: profile.id,
        channel,
      },
    },
    update: {},
    create: {
      eventId: eventId,
      profileId: profile.id,
      channel,
    },
  });

  return NextResponse.json({ alert: serializeGuildEventAlert(alert) }, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ guildId: string; eventId: string }> }
) {
  const { eventId } = await params;
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { channel } = body as {
    channel?: "EMAIL" | "SMS" | "DISCORD" | "TELEGRAM";
  };

  if (!channel) {
    return NextResponse.json({ error: "Channel required" }, { status: 400 });
  }

  await prisma.guildEventAlert.deleteMany({
    where: {
      eventId: eventId,
      profileId: profile.id,
      channel,
    },
  });

  return NextResponse.json({ success: true });
}
