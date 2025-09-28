import type { Profile as PrismaProfile, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import type { Profile } from "@/types/profile";

export const serializeProfile = (profile: PrismaProfile, user: User): Profile => ({
  id: profile.id,
  userId: profile.userId,
  email: user.email,
  name: profile.name,
  avatarUrl: profile.avatarUrl,
  bio: profile.bio ?? null,
  twitterLink: profile.twitterLink ?? null,
  redditLink: profile.redditLink ?? null,
  gamePref: (profile.gamePref as Profile["gamePref"]) ?? null,
  timeSlot: (profile.timeSlot as Profile["timeSlot"]) ?? null,
  language: (profile.language as Profile["language"]) ?? null,
  playstyle: (profile.playstyle as Profile["playstyle"]) ?? null,
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
    return serializeProfile(existingProfile, user);
  }

  const created = await prisma.profile.create({
    data: {
      userId: user.id,
      name: user.email.split("@")[0] ?? "MMO Player",
    },
  });

  return serializeProfile(created, user);
}

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return serializeProfile(profile, user);
}
