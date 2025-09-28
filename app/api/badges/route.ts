import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { serializeBadge } from "@/lib/badge";
import { buildBadgeQrPayload } from "@/lib/qr/badge";

export async function GET() {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";

  const badges = await prisma.badge.findMany({
    orderBy: { name: "asc" },
    include: {
      collections: {
        where: { profileId: profile.id },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    badges: badges.map((badge) => ({
      ...serializeBadge(badge, badge.collections[0]),
      qrPayload:
        badge.qrRequired && badge.qrSecret
          ? buildBadgeQrPayload(badge.id, badge.qrSecret, baseUrl)
          : null,
    })),
  });
}
