import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = process.env.MODERATION_SECRET;

const unauthorized = NextResponse.json({ error: "Forbidden" }, { status: 403 });

export async function POST(request: Request) {
  if (!SECRET) {
    return NextResponse.json({ error: "Moderation secret not configured" }, { status: 500 });
  }

  const providedSecret = request.headers.get("x-moderation-secret")?.trim();
  if (providedSecret !== SECRET) {
    return unauthorized;
  }

  const { profileId, shadowban = true } = (await request.json().catch(() => ({}))) as {
    profileId?: string;
    shadowban?: boolean;
  };

  if (!profileId || typeof profileId !== "string") {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  const updated = await prisma.profile.update({
    where: { id: profileId },
    data: { isShadowbanned: Boolean(shadowban) },
    select: {
      id: true,
      isShadowbanned: true,
    },
  }).catch(() => null);

  if (!updated) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    profileId: updated.id,
    isShadowbanned: updated.isShadowbanned,
  });
}
