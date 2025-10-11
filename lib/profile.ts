import type { Profile as PrismaProfile, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import type { Profile } from "@/types/profile";
import { checkDailyLogin } from "@/lib/exp";
import { completeReferral } from "@/lib/referral";
import { cookies } from "next/headers";

export const serializeProfile = (profile: PrismaProfile, user: User): Profile => ({
  id: profile.id,
  userId: profile.userId,
  email: user.email,
  name: profile.name,
  avatarUrl: profile.avatarUrl,
  bio: profile.bio ?? null,
  twitterLink: profile.twitterLink ?? null,
  redditLink: profile.redditLink ?? null,
  gamePref: (profile.gamePref ?? null) as Profile["gamePref"],
  timeSlot: (profile.timeSlot ?? null) as Profile["timeSlot"],
  language: (profile.language ?? null) as Profile["language"],
  playstyle: (profile.playstyle ?? null) as Profile["playstyle"],
  theme: profile.theme ?? null,
  notifyOnNewMatch: Boolean((profile as PrismaProfile & { notifyOnNewMatch?: boolean }).notifyOnNewMatch ?? true),
  notifyOnNewMessage: Boolean((profile as PrismaProfile & { notifyOnNewMessage?: boolean }).notifyOnNewMessage ?? true),
  notifyOnAnnouncements: Boolean(
    (profile as PrismaProfile & { notifyOnAnnouncements?: boolean }).notifyOnAnnouncements ?? true
  ),
  isVerified: (profile as Record<string, unknown>).isVerified === undefined ? false : Boolean((profile as Record<string, unknown>).isVerified),
  isShadowbanned: (profile as Record<string, unknown>).isShadowbanned === undefined ? false : Boolean((profile as Record<string, unknown>).isShadowbanned),
  isChild: (profile as Record<string, unknown>).isChild === undefined ? false : Boolean((profile as Record<string, unknown>).isChild),
  guardianProfileId: profile.guardianProfileId ?? null,
  createdAt: profile.createdAt.toISOString(),
  updatedAt: profile.updatedAt.toISOString(),
});

export async function getOrCreateProfile(): Promise<Profile> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User session not found");
  }

  const existingProfile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });

  if (existingProfile) {
    // Check and award daily login EXP
    checkDailyLogin(existingProfile.id).catch(err =>
      console.error('Failed to check daily login:', err)
    );

    return serializeProfile(existingProfile, user);
  }

  const created = await prisma.profile.create({
    data: {
      userId: user.id,
      name: user.email.split("@")[0] ?? "MMO Player",
    },
  });

  // Check for referral cookie and complete referral
  const cookieStore = await cookies();
  const referralCode = cookieStore.get('mmo_ref')?.value;

  if (referralCode) {
    completeReferral(created.id, referralCode).catch(err =>
      console.error('Failed to complete referral:', err)
    );

    // Clear the referral cookie after use
    cookieStore.delete('mmo_ref');
  }

  return serializeProfile(created, user);
}

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return serializeProfile(profile, user);
}
