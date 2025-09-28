import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const DAYS = 7;

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sevenDaysAgo = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();

  const [
    totalUsers,
    totalProfiles,
    completedProfiles,
    totalMatches,
    totalSwipes,
    activeSessions,
    newUsersLast7Days,
    messagesLast7Days,
    kidProfiles,
    guardians,
    totalBadges,
    badgeCollections,
    upcomingEvents,
    eventAlerts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.profile.count(),
    prisma.profile.count({
      where: {
        gamePref: { not: null },
        timeSlot: { not: null },
        language: { not: null },
        playstyle: { not: null },
        bio: { not: null },
      },
    }),
    prisma.match.count(),
    prisma.swipe.count(),
    prisma.session.count({ where: { expiresAt: { gt: now } } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.message.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.profile.count({ where: { isChild: true } }),
    prisma.profile.count({ where: { children: { some: {} } } }),
    prisma.badge.count(),
    prisma.profileBadge.count(),
    prisma.guildEvent.count({
      where: {
        startsAt: {
          gte: now,
        },
      },
    }),
    prisma.guildEventAlert.count(),
  ]);

  const completionRate = totalProfiles
    ? Number(((completedProfiles / totalProfiles) * 100).toFixed(1))
    : 0;

  return NextResponse.json({
    generatedAt: now.toISOString(),
    summary: {
      totalUsers,
      totalProfiles,
      completedProfiles,
      completionRate,
      totalMatches,
      totalSwipes,
    },
    engagement: {
      activeSessions,
      newUsersLast7Days,
      messagesLast7Days,
    },
    safety: {
      kidProfiles,
      guardians,
    },
    badges: {
      totalBadges,
      totalCollected: badgeCollections,
    },
    events: {
      upcomingEvents,
      alertSubscriptions: eventAlerts,
    },
  });
}
