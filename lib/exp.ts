import { prisma } from "@/lib/prisma";
import { ExpEventType } from "@prisma/client";

// EXP rewards for different activities
export const EXP_REWARDS = {
  OAUTH_VERIFICATION: 100,
  STEAM_IMPORT: 50,
  DAILY_LOGIN: 10,
  MESSAGE_SENT: 5,
  PROFILE_COMPLETE: 75,
  FIRST_MATCH: 50,
  GUILD_JOIN: 30,
  GAME_RATING: 15,
  GAME_COMMENT: 20,
  REFERRAL_SIGNUP: 25, // Bonus for person who signed up via referral
  REFERRAL_BONUS: 50,  // Bonus for referrer when someone signs up
} as const;

// Calculate level from EXP (exponential curve)
export function calculateLevel(exp: number): number {
  // Level formula: level = floor(sqrt(exp / 100)) + 1
  // This means: Level 2 = 100 exp, Level 3 = 400 exp, Level 4 = 900 exp, etc.
  return Math.floor(Math.sqrt(exp / 100)) + 1;
}

// Calculate EXP needed for next level
export function expForNextLevel(currentLevel: number): number {
  return (currentLevel * currentLevel) * 100;
}

// Calculate EXP progress to next level
export function expProgress(currentExp: number, currentLevel: number): {
  current: number;
  needed: number;
  percentage: number;
} {
  const currentLevelExp = ((currentLevel - 1) * (currentLevel - 1)) * 100;
  const nextLevelExp = expForNextLevel(currentLevel);
  const progressExp = currentExp - currentLevelExp;
  const neededExp = nextLevelExp - currentLevelExp;

  return {
    current: progressExp,
    needed: neededExp,
    percentage: Math.min(100, Math.round((progressExp / neededExp) * 100)),
  };
}

interface AwardExpOptions {
  profileId: string;
  eventType: ExpEventType;
  metadata?: Record<string, any>;
  skipDuplicateCheck?: boolean;
}

/**
 * Award EXP to a profile for a specific event
 */
export async function awardExp({
  profileId,
  eventType,
  metadata,
  skipDuplicateCheck = false,
}: AwardExpOptions): Promise<{
  expGained: number;
  totalExp: number;
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
} | null> {
  const expAmount = EXP_REWARDS[eventType];

  if (!expAmount) {
    console.error(`No EXP reward defined for event type: ${eventType}`);
    return null;
  }

  // For certain events, check if we should limit frequency
  if (!skipDuplicateCheck) {
    const shouldSkip = await shouldSkipExpAward(profileId, eventType);
    if (shouldSkip) {
      return null;
    }
  }

  // Get current profile
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { exp: true, level: true },
  });

  if (!profile) {
    return null;
  }

  const oldLevel = profile.level;
  const newTotalExp = profile.exp + expAmount;
  const newLevel = calculateLevel(newTotalExp);

  // Award EXP and update level
  const [updatedProfile] = await prisma.$transaction([
    prisma.profile.update({
      where: { id: profileId },
      data: {
        exp: newTotalExp,
        level: newLevel,
      },
    }),
    prisma.expEvent.create({
      data: {
        profileId,
        eventType,
        expGained: expAmount,
        metadata: metadata || {},
      },
    }),
  ]);

  return {
    expGained: expAmount,
    totalExp: newTotalExp,
    oldLevel,
    newLevel,
    leveledUp: newLevel > oldLevel,
  };
}

/**
 * Check if we should skip awarding EXP for rate-limited events
 */
async function shouldSkipExpAward(
  profileId: string,
  eventType: ExpEventType
): Promise<boolean> {
  const now = new Date();

  switch (eventType) {
    case 'DAILY_LOGIN': {
      // Only award once per day
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastLogin = await prisma.expEvent?.findFirst?.({
        where: {
          profileId,
          eventType: 'DAILY_LOGIN',
          createdAt: { gte: today },
        },
      });
      return !!lastLogin;
    }

    case 'MESSAGE_SENT': {
      // Limit to 20 messages per day for EXP
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const messageCount = await prisma.expEvent?.count?.({
        where: {
          profileId,
          eventType: 'MESSAGE_SENT',
          createdAt: { gte: today },
        },
      }) ?? 0;
      return messageCount >= 20;
    }

    case 'OAUTH_VERIFICATION':
    case 'STEAM_IMPORT':
    case 'PROFILE_COMPLETE':
    case 'FIRST_MATCH': {
      // Only award once ever
      const existing = await prisma.expEvent?.findFirst?.({
        where: {
          profileId,
          eventType,
        },
      });
      return !!existing;
    }

    case 'GAME_RATING':
    case 'GAME_COMMENT': {
      // Can earn multiple times, but check metadata to avoid duplicates
      // This is handled at the application level
      return false;
    }

    default:
      return false;
  }
}

/**
 * Check daily login and award EXP if eligible
 */
export async function checkDailyLogin(profileId: string): Promise<boolean> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { lastDailyLogin: true },
  });

  if (!profile) return false;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Check if already logged in today
  if (profile.lastDailyLogin && profile.lastDailyLogin >= today) {
    return false;
  }

  // Update last daily login and award EXP
  await prisma.profile.update({
    where: { id: profileId },
    data: { lastDailyLogin: now },
  });

  await awardExp({
    profileId,
    eventType: 'DAILY_LOGIN',
  });

  return true;
}
