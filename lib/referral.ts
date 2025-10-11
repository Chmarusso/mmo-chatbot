import { prisma } from "@/lib/prisma";
import { awardExp } from "@/lib/exp";
import { randomBytes } from "crypto";

const REFERRAL_COOKIE_NAME = "mmo_ref";
const REFERRAL_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Generate a unique referral code for a profile
 */
export async function generateReferralCode(profileId: string): Promise<string> {
  // Generate a short, URL-friendly code
  const code = randomBytes(4).toString('hex'); // 8 characters

  // Check if code already exists (very unlikely but good to check)
  const existing = await prisma.profile.findUnique({
    where: { referralCode: code },
  });

  if (existing) {
    // Recursively try again with a new code
    return generateReferralCode(profileId);
  }

  // Save the code to the profile
  await prisma.profile.update({
    where: { id: profileId },
    data: { referralCode: code },
  });

  return code;
}

/**
 * Get or create referral code for a profile
 */
export async function getOrCreateReferralCode(profileId: string): Promise<string> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { referralCode: true },
  });

  if (profile?.referralCode) {
    return profile.referralCode;
  }

  return generateReferralCode(profileId);
}

/**
 * Track a referral visit (creates a pending referral)
 */
export async function trackReferralVisit(referralCode: string): Promise<void> {
  // Find the referrer by code
  const referrer = await prisma.profile.findUnique({
    where: { referralCode },
    select: { id: true },
  });

  if (!referrer) {
    return;
  }

  // Create a pending referral record
  await prisma.referral.create({
    data: {
      referrerId: referrer.id,
      referralCode,
      status: 'PENDING',
    },
  });
}

/**
 * Complete a referral when a user signs up
 */
export async function completeReferral(
  newProfileId: string,
  referralCode: string
): Promise<boolean> {
  try {
    // Find the referrer
    const referrer = await prisma.profile.findUnique({
      where: { referralCode },
      select: { id: true },
    });

    if (!referrer) {
      return false;
    }

    // Don't allow self-referrals
    if (referrer.id === newProfileId) {
      return false;
    }

    // Check if this profile was already referred
    const existingReferral = await prisma.profile.findUnique({
      where: { id: newProfileId },
      select: { referredById: true },
    });

    if (existingReferral?.referredById) {
      return false; // Already referred by someone
    }

    // Update the new profile with referrer
    await prisma.profile.update({
      where: { id: newProfileId },
      data: { referredById: referrer.id },
    });

    // Find or create the referral record
    const referralRecord = await prisma.referral.findFirst({
      where: {
        referrerId: referrer.id,
        referralCode,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (referralRecord) {
      // Update existing pending referral
      await prisma.referral.update({
        where: { id: referralRecord.id },
        data: {
          referredId: newProfileId,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    } else {
      // Create a new completed referral
      await prisma.referral.create({
        data: {
          referrerId: referrer.id,
          referredId: newProfileId,
          referralCode,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    }

    // Award EXP to both parties
    await Promise.all([
      // Award bonus to the new user
      awardExp({
        profileId: newProfileId,
        eventType: 'REFERRAL_SIGNUP',
        metadata: { referredBy: referrer.id },
      }),
      // Award bonus to the referrer
      awardExp({
        profileId: referrer.id,
        eventType: 'REFERRAL_BONUS',
        metadata: { referredUser: newProfileId },
      }),
    ]);

    // Mark referral as rewarded
    await prisma.referral.updateMany({
      where: {
        referrerId: referrer.id,
        referredId: newProfileId,
        status: 'COMPLETED',
      },
      data: {
        status: 'REWARDED',
        rewardedAt: new Date(),
      },
    });

    return true;
  } catch (error) {
    console.error('Error completing referral:', error);
    return false;
  }
}

/**
 * Get referral stats for a profile
 */
export async function getReferralStats(profileId: string) {
  const [totalReferrals, completedReferrals, pendingReferrals] = await Promise.all([
    prisma.referral.count({
      where: { referrerId: profileId },
    }),
    prisma.referral.count({
      where: {
        referrerId: profileId,
        status: { in: ['COMPLETED', 'REWARDED'] },
      },
    }),
    prisma.referral.count({
      where: {
        referrerId: profileId,
        status: 'PENDING',
      },
    }),
  ]);

  return {
    total: totalReferrals,
    completed: completedReferrals,
    pending: pendingReferrals,
  };
}

/**
 * Get referral cookie configuration
 */
export function getReferralCookieConfig() {
  return {
    name: REFERRAL_COOKIE_NAME,
    maxAge: REFERRAL_COOKIE_MAX_AGE,
  };
}
