import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { isWithinRadius } from "@/lib/geo";
import { serializeBadge } from "@/lib/badge";

export async function POST(request: Request) {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { badgeId, latitude, longitude, token } = body as {
    badgeId?: string;
    latitude?: number;
    longitude?: number;
    token?: string;
  };

  if (!badgeId || typeof badgeId !== "string") {
    return NextResponse.json({ error: "badgeId is required" }, { status: 400 });
  }

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return NextResponse.json({ error: "latitude and longitude are required" }, { status: 400 });
  }

  const badge = await prisma.badge.findUnique({ where: { id: badgeId } });

  if (!badge) {
    return NextResponse.json({ error: "Badge not found" }, { status: 404 });
  }

  const alreadyCollected = await prisma.profileBadge.findUnique({
    where: {
      profileId_badgeId: {
        profileId: profile.id,
        badgeId,
      },
    },
  });

  if (alreadyCollected) {
    return NextResponse.json({
      badge: serializeBadge(badge, alreadyCollected),
      message: "Badge already collected",
    });
  }

  if (badge.qrRequired) {
    if (!badge.qrSecret || token !== badge.qrSecret) {
      return NextResponse.json({ error: "Invalid QR token" }, { status: 403 });
    }
  } else {
    const withinRadius = isWithinRadius(
      latitude,
      longitude,
      Number(badge.latitude),
      Number(badge.longitude),
      badge.radiusMeters
    );

    if (!withinRadius) {
      return NextResponse.json({ error: "Not within badge radius" }, { status: 409 });
    }
  }

  const collection = await prisma.profileBadge.create({
    data: {
      profileId: profile.id,
      badgeId,
    },
  });

  return NextResponse.json({
    badge: serializeBadge(badge, collection),
  });
}
