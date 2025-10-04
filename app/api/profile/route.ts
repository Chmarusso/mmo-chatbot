import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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

  const resolveString = (value: unknown, fallback: string | null) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    if (value === null) {
      return null;
    }
    return fallback;
  };

  const resolvedName = typeof payload.name === "string" ? payload.name : existing.name;
  const resolvedBio = resolveString(payload.bio, existing.bio);
  const resolvedTwitter = resolveString(payload.twitterLink, existing.twitterLink);
  const resolvedReddit = resolveString(payload.redditLink, existing.redditLink);
  const resolvedGamePref = resolveString(payload.gamePref, existing.gamePref);
  const resolvedTimeSlot = resolveString(payload.timeSlot, existing.timeSlot);
  const resolvedLanguage = resolveString(payload.language, existing.language);
  const resolvedPlaystyle = resolveString(payload.playstyle, existing.playstyle);
  const resolvedAvatar = resolveString(payload.avatarUrl, existing.avatarUrl);
  const resolvedTheme = resolveString(payload.theme, existing.theme);
  const resolvedNotifyMatch = typeof payload.notifyOnNewMatch === "boolean" ? payload.notifyOnNewMatch : existing.notifyOnNewMatch;
  const resolvedNotifyMessage = typeof payload.notifyOnNewMessage === "boolean" ? payload.notifyOnNewMessage : existing.notifyOnNewMessage;
  const resolvedNotifyAnnouncements =
    typeof payload.notifyOnAnnouncements === "boolean" ? payload.notifyOnAnnouncements : existing.notifyOnAnnouncements;

  const changeSet: Record<string, { before: unknown; after: unknown }> = {};
  const recordChange = (key: string, before: unknown, after: unknown) => {
    const normalizedBefore = before ?? null;
    const normalizedAfter = after ?? null;
    if (normalizedBefore !== normalizedAfter) {
      changeSet[key] = { before: normalizedBefore, after: normalizedAfter };
    }
  };

  recordChange("name", existing.name, resolvedName);
  recordChange("bio", existing.bio, resolvedBio);
  recordChange("gamePref", existing.gamePref, resolvedGamePref);
  recordChange("timeSlot", existing.timeSlot, resolvedTimeSlot);
  recordChange("language", existing.language, resolvedLanguage);
  recordChange("playstyle", existing.playstyle, resolvedPlaystyle);
  recordChange("avatarUrl", existing.avatarUrl ?? null, resolvedAvatar);
  recordChange("theme", existing.theme, resolvedTheme);
  recordChange("notifyOnNewMatch", existing.notifyOnNewMatch, resolvedNotifyMatch);
  recordChange("notifyOnNewMessage", existing.notifyOnNewMessage, resolvedNotifyMessage);
  recordChange("notifyOnAnnouncements", existing.notifyOnAnnouncements, resolvedNotifyAnnouncements);

  try {
    const updatedProfile = await prisma.profile.update({
      where: { id: existing.id },
      data: {
        name: resolvedName,
        bio: resolvedBio,
        twitterLink: resolvedTwitter,
        redditLink: resolvedReddit,
        gamePref: resolvedGamePref,
        timeSlot: resolvedTimeSlot,
        language: resolvedLanguage,
        playstyle: resolvedPlaystyle,
        avatarUrl: resolvedAvatar,
        theme: resolvedTheme,
        notifyOnNewMatch: resolvedNotifyMatch,
        notifyOnNewMessage: resolvedNotifyMessage,
        notifyOnAnnouncements: resolvedNotifyAnnouncements,
      },
      include: { user: true },
    });

    if (Object.keys(changeSet).length > 0) {
      await prisma.analyticsEvent.create({
        data: {
          eventType: "profile.updated",
          profileId: updatedProfile.id,
          userId: updatedProfile.userId,
          metadata: changeSet as Prisma.JsonObject,
        },
      });
    }

    return NextResponse.json({ profile: serializeProfile(updatedProfile, updatedProfile.user) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json({ error: "Invalid preference selection" }, { status: 400 });
    }
    throw error;
  }
}
