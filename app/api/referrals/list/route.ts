import { NextResponse } from "next/server";
import { getOrCreateProfile } from "@/lib/profile";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const profile = await getOrCreateProfile();

    // Get all referrals made by this user
    const referrals = await prisma.referral.findMany({
      where: {
        referrerId: profile.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to recent 100
    });

    // Get referred profiles for completed referrals
    const referredProfileIds = referrals
      .filter(r => r.referredId)
      .map(r => r.referredId!);

    const referredProfiles = await prisma.profile.findMany({
      where: {
        id: { in: referredProfileIds },
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    const profileMap = new Map(
      referredProfiles.map(p => [p.id, p])
    );

    // Combine data
    const referralList = referrals.map(ref => ({
      id: ref.id,
      status: ref.status,
      visitedAt: ref.visitedAt.toISOString(),
      completedAt: ref.completedAt?.toISOString() || null,
      rewardedAt: ref.rewardedAt?.toISOString() || null,
      referredUser: ref.referredId ? {
        id: profileMap.get(ref.referredId)?.id || ref.referredId,
        name: profileMap.get(ref.referredId)?.name || 'Unknown User',
        avatarUrl: profileMap.get(ref.referredId)?.avatarUrl || null,
        joinedAt: profileMap.get(ref.referredId)?.createdAt.toISOString() || null,
      } : null,
    }));

    return NextResponse.json({ referrals: referralList });
  } catch (error) {
    console.error('Error fetching referral list:', error);
    return NextResponse.json(
      { error: "Unauthorized or error fetching referrals" },
      { status: 401 }
    );
  }
}
