import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile, serializeProfile } from "@/lib/profile";
import { normalizeInviteCode, isLikelyValidInviteCode } from "@/lib/invite";

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

  const resolveStringArray = (value: unknown, fallback: string[]) => {
    if (Array.isArray(value)) {
      return value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    }
    if (value === null) {
      return [];
    }
    return fallback;
  };

  const resolvedName = typeof payload.name === "string" ? payload.name : existing.name;
  const resolvedBio = resolveString(payload.bio, existing.bio);
  const resolvedTwitter = resolveString(payload.twitterLink, existing.twitterLink);
  const resolvedReddit = resolveString(payload.redditLink, existing.redditLink);
  const resolvedGamePref = resolveString(payload.gamePref, existing.gamePref);
  const resolvedGamePreferences = Array.from(
    new Set(
      resolveStringArray(payload.gamePreferences, existing.gamePreferences ?? [])
    )
  );
  const resolvedTimeSlots = Array.from(
    new Set(resolveStringArray(payload.timeSlots, existing.timeSlots ?? []))
  );
  const resolvedTimeSlot = resolveString(payload.timeSlot, existing.timeSlot);
  const primaryTimeSlot = resolvedTimeSlots.length > 0 ? resolvedTimeSlots[0] : resolvedTimeSlot;
  const resolvedLanguage = resolveString(payload.language, existing.language);
  const resolvedPlaystyle = resolveString(payload.playstyle, existing.playstyle);
  const resolvedAvatar = resolveString(payload.avatarUrl, existing.avatarUrl);
  const resolvedTheme = resolveString(payload.theme, existing.theme);
  const resolvedNotifyMatch = typeof payload.notifyOnNewMatch === "boolean" ? payload.notifyOnNewMatch : existing.notifyOnNewMatch;
  const resolvedNotifyMessage = typeof payload.notifyOnNewMessage === "boolean" ? payload.notifyOnNewMessage : existing.notifyOnNewMessage;
  const resolvedNotifyAnnouncements =
    typeof payload.notifyOnAnnouncements === "boolean" ? payload.notifyOnAnnouncements : existing.notifyOnAnnouncements;
  const currentInviteCode = existing.inviteCode?.trim() ? existing.inviteCode.toUpperCase() : null;
  let resolvedInviteCode = currentInviteCode;
  let inviteToClaim: { id: string; code: string; alreadyClaimed: boolean; maxUses: number } | null = null;

  if (Object.prototype.hasOwnProperty.call(payload, "inviteCode")) {
    if (typeof payload.inviteCode !== "string") {
      return NextResponse.json({ error: "Invite code must be a string." }, { status: 400 });
    }

    if (!isLikelyValidInviteCode(payload.inviteCode)) {
      return NextResponse.json({ error: "Invalid invite code format." }, { status: 400 });
    }

    const normalized = normalizeInviteCode(payload.inviteCode);

    if (!normalized) {
      return NextResponse.json({ error: "Invite code cannot be empty." }, { status: 400 });
    }

    if (currentInviteCode && currentInviteCode !== normalized) {
      return NextResponse.json({ error: "This profile already has an invite code applied." }, { status: 400 });
    }

    const inviteRecord = await prisma.inviteCode.findUnique({
      where: { code: normalized },
      include: {
        usageLogs: {
          where: { profileId: existing.id },
        },
      },
    });

    if (!inviteRecord) {
      return NextResponse.json({ error: "That invite code doesn't exist." }, { status: 400 });
    }

    // Check if user has already used this code
    const alreadyUsed = inviteRecord.usageLogs.length > 0;

    // Check if code has reached max uses
    if (inviteRecord.usageCount >= inviteRecord.maxUses && !alreadyUsed) {
      return NextResponse.json({ error: "That invite code has reached its usage limit." }, { status: 400 });
    }

    // For backward compatibility: check old single-use claim system
    const isSingleUseCode = (inviteRecord.maxUses ?? 1) <= 1;
    if (
      isSingleUseCode &&
      inviteRecord.claimedByProfileId &&
      inviteRecord.claimedByProfileId !== existing.id
    ) {
      return NextResponse.json({ error: "That invite code has already been used." }, { status: 400 });
    }

    resolvedInviteCode = inviteRecord.code;
    inviteToClaim = {
      id: inviteRecord.id,
      code: inviteRecord.code,
      alreadyClaimed: alreadyUsed || inviteRecord.claimedByProfileId === existing.id,
      maxUses: inviteRecord.maxUses,
    };
  }

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
  recordChange("timeSlot", existing.timeSlot, primaryTimeSlot);
  recordChange("language", existing.language, resolvedLanguage);
  recordChange("playstyle", existing.playstyle, resolvedPlaystyle);
  recordChange("avatarUrl", existing.avatarUrl ?? null, resolvedAvatar);
  recordChange("theme", existing.theme, resolvedTheme);
  recordChange("inviteCode", currentInviteCode, resolvedInviteCode);
  recordChange("notifyOnNewMatch", existing.notifyOnNewMatch, resolvedNotifyMatch);
  recordChange("notifyOnNewMessage", existing.notifyOnNewMessage, resolvedNotifyMessage);
  recordChange("notifyOnAnnouncements", existing.notifyOnAnnouncements, resolvedNotifyAnnouncements);
  if (
    JSON.stringify(existing.gamePreferences ?? []) !==
    JSON.stringify(resolvedGamePreferences ?? [])
  ) {
    changeSet.gamePreferences = {
      before: existing.gamePreferences ?? [],
      after: resolvedGamePreferences ?? [],
    };
  }
  if (
    JSON.stringify(existing.timeSlots ?? []) !==
    JSON.stringify(resolvedTimeSlots ?? [])
  ) {
    changeSet.timeSlots = {
      before: existing.timeSlots ?? [],
      after: resolvedTimeSlots ?? [],
    };
  }

  try {
    const updatedProfile = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.update({
        where: { id: existing.id },
        data: {
          name: resolvedName,
          bio: resolvedBio,
          twitterLink: resolvedTwitter,
          redditLink: resolvedReddit,
          gamePref: resolvedGamePref,
          gamePreferences: { set: resolvedGamePreferences },
          timeSlot: primaryTimeSlot,
          timeSlots: { set: resolvedTimeSlots },
          language: resolvedLanguage,
          playstyle: resolvedPlaystyle,
          avatarUrl: resolvedAvatar,
          theme: resolvedTheme,
          inviteCode: resolvedInviteCode,
          notifyOnNewMatch: resolvedNotifyMatch,
          notifyOnNewMessage: resolvedNotifyMessage,
          notifyOnAnnouncements: resolvedNotifyAnnouncements,
        },
        include: { user: true },
      });

      if (inviteToClaim && !inviteToClaim.alreadyClaimed) {
        // Create usage log
        await tx.inviteCodeUsage.create({
          data: {
            inviteCodeId: inviteToClaim.id,
            profileId: existing.id,
          },
        });

        // Increment usage count
        const inviteUpdateData: Prisma.InviteCodeUpdateInput = {
          usageCount: { increment: 1 },
          claimedAt: new Date(),
        };

        if ((inviteToClaim.maxUses ?? 1) <= 1) {
          inviteUpdateData.claimedBy = { connect: { id: existing.id } };
        }

        await tx.inviteCode.update({
          where: { id: inviteToClaim.id },
          data: inviteUpdateData,
        });
      }

      if (Object.keys(changeSet).length > 0) {
        await tx.analyticsEvent.create({
          data: {
            eventType: "profile.updated",
            profileId: profile.id,
            userId: profile.userId,
            metadata: changeSet as Prisma.JsonObject,
          },
        });
      }

      return profile;
    });

    return NextResponse.json({ profile: serializeProfile(updatedProfile, updatedProfile.user) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json({ error: "Invalid preference selection" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "InviteCodeClaimFailed") {
      return NextResponse.json({ error: "That invite code has already been used." }, { status: 400 });
    }
    throw error;
  }
}
