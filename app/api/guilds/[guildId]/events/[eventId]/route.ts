import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { serializeGuildEvent } from "@/lib/guild";
import { buildSingleEventCalendar } from "@/lib/ics";

const forbidden = NextResponse.json({ error: "Forbidden" }, { status: 403 });

const canManage = (role: string) => role === "OWNER" || role === "OFFICER";

async function requireManager(guildId: string, profileId: string) {
  const membership = await prisma.guildMembership.findUnique({
    where: {
      guildId_profileId: {
        guildId,
        profileId,
      },
    },
  });

  if (!membership || !canManage(membership.role)) {
    throw new Error("forbidden");
  }
}

export async function GET(
  request: Request,
  { params }: { params: { guildId: string; eventId: string } }
) {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.guildMembership.findUnique({
    where: {
      guildId_profileId: {
        guildId: params.guildId,
        profileId: profile.id,
      },
    },
  });

  if (!membership) {
    return forbidden;
  }

  const event = await prisma.guildEvent.findUnique({
    where: {
      id: params.eventId,
      guildId: params.guildId,
    },
    include: {
      alerts: true,
      guild: true,
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get('format') === 'ics') {
    const ics = buildIcsForEvent(event);
    return new Response(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="guild-event-${event.id}.ics"`,
      },
    });
  }

  return NextResponse.json({ event: serializeGuildEvent(event, event.alerts) });
}

export async function PATCH(
  request: Request,
  { params }: { params: { guildId: string; eventId: string } }
) {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requireManager(params.guildId, profile.id);
  } catch {
    return forbidden;
  }

  const body = await request.json().catch(() => ({}));
  const {
    title,
    description,
    startsAt,
    locationType,
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

  const data: Record<string, unknown> = {};

  if (typeof title === "string") data.title = title.trim().slice(0, 120);
  if (typeof description === "string") data.description = description.trim().slice(0, 500) || null;
  if (typeof imageUrl === "string") data.imageUrl = imageUrl.trim().slice(0, 250) || null;
  if (typeof locationDetail === "string") data.locationDetail = locationDetail.trim().slice(0, 200) || null;
  if (locationType === "ONLINE" || locationType === "OFFLINE") data.locationType = locationType;
  if (typeof startsAt === "string" && !Number.isNaN(Date.parse(startsAt))) data.startsAt = new Date(startsAt);

  const updated = await prisma.guildEvent.update({
    where: {
      id: params.eventId,
      guildId: params.guildId,
    },
    data,
    include: {
      alerts: true,
    },
  }).catch(() => null);

  if (!updated) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ event: serializeGuildEvent(updated, updated.alerts) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { guildId: string; eventId: string } }
) {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requireManager(params.guildId, profile.id);
  } catch {
    return forbidden;
  }

  await prisma.guildEvent.delete({
    where: {
      id: params.eventId,
      guildId: params.guildId,
    },
  }).catch(() => null);

  return NextResponse.json({ success: true });
}
function buildIcsForEvent(event: { id: string; title: string; description: string | null; startsAt: Date; locationType: string; locationDetail: string | null; guild: { name: string } }) {
  const location = event.locationType === 'ONLINE' ? 'Online' : event.locationDetail ?? 'Offline';

  return buildSingleEventCalendar({
    uid: `${event.id}@mmo-match.gg`,
    title: event.title,
    description: [event.guild.name, event.description].filter(Boolean).join(' - '),
    location,
    startsAt: event.startsAt,
  });
}
