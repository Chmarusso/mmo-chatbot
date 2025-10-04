import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { serializeGuildEvent } from "@/lib/guild";

const forbidden = NextResponse.json({ error: "Forbidden" }, { status: 403 });

const hasManagePermission = (role: string) => role === "OWNER" || role === "OFFICER";

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
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getMembership(guildId, profile.id);
  if (!membership) {
    return forbidden;
  }

  const events = await prisma.guildEvent.findMany({
    where: { guildId: guildId },
    orderBy: { startsAt: "asc" },
    include: {
      alerts: true,
    },
  });

  return NextResponse.json({ events: events.map((event) => serializeGuildEvent(event, event.alerts)) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getMembership(guildId, profile.id);
  if (!membership || !hasManagePermission(membership.role)) {
    return forbidden;
  }

  const body = await request.json().catch(() => ({}));
  const {
    title,
    description,
    startsAt,
    locationType = "ONLINE",
    locationDetail,
    imageUrl,
  } = body as {
    title?: string;
    description?: string;
    startsAt?: string;
    locationType?: "ONLINE" | "OFFLINE";
    locationDetail?: string;
    imageUrl?: string;
  };

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!startsAt || Number.isNaN(Date.parse(startsAt))) {
    return NextResponse.json({ error: "Valid startsAt is required" }, { status: 400 });
  }

  const event = await prisma.guildEvent.create({
    data: {
      guildId: guildId,
      title: title.trim().slice(0, 120),
      description: description?.trim().slice(0, 500) || null,
      locationType,
      locationDetail: locationDetail?.trim().slice(0, 200) || null,
      startsAt: new Date(startsAt),
      imageUrl: imageUrl?.trim().slice(0, 250) || null,
      createdByProfileId: profile.id,
    },
    include: {
      alerts: true,
    },
  });

  return NextResponse.json({ event: serializeGuildEvent(event, event.alerts) }, { status: 201 });
}
