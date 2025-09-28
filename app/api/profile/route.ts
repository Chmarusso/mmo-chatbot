import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile, serializeProfile } from "@/lib/profile";

export async function GET() {
  const profile = await getOrCreateProfile().catch(() => null);
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const existing = await getOrCreateProfile().catch(() => null);
  if (!existing) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));

  const data = {
    name: typeof payload.name === "string" ? payload.name : existing.name,
    bio: typeof payload.bio === "string" || payload.bio === null ? payload.bio : existing.bio,
    twitterLink:
      typeof payload.twitterLink === "string" || payload.twitterLink === null
        ? payload.twitterLink
        : existing.twitterLink,
    redditLink:
      typeof payload.redditLink === "string" || payload.redditLink === null
        ? payload.redditLink
        : existing.redditLink,
    gamePref:
      typeof payload.gamePref === "string" || payload.gamePref === null
        ? payload.gamePref
        : existing.gamePref,
    timeSlot:
      typeof payload.timeSlot === "string" || payload.timeSlot === null
        ? payload.timeSlot
        : existing.timeSlot,
    language:
      typeof payload.language === "string" || payload.language === null
        ? payload.language
        : existing.language,
    playstyle:
      typeof payload.playstyle === "string" || payload.playstyle === null
        ? payload.playstyle
        : existing.playstyle,
    avatarUrl:
      typeof payload.avatarUrl === "string" || payload.avatarUrl === null
        ? payload.avatarUrl
        : existing.avatarUrl,
  };

  const updatedProfile = await prisma.profile.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      bio: data.bio,
      twitterLink: data.twitterLink,
      redditLink: data.redditLink,
      gamePref: data.gamePref as any,
      timeSlot: data.timeSlot as any,
      language: data.language as any,
      playstyle: data.playstyle as any,
      avatarUrl: data.avatarUrl,
    },
    include: { user: true },
  });

  return NextResponse.json({ profile: serializeProfile(updatedProfile, updatedProfile.user) });
}
