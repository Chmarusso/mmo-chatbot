import { prisma } from "@/lib/prisma";
import { serializeProfile } from "@/lib/profile";
import type { Profile } from "@/types/profile";

export interface MatchListEntry {
  id: string;
  status: string;
  requiresGuardianApproval: boolean;
  otherProfile: Profile;
  lastMessage: string | null;
  lastMessageTime: string;
  hasUnread: boolean;
  isOnline: boolean;
}

export async function fetchMatchesForProfile(profile: Profile): Promise<MatchListEntry[]> {
  const matches = await prisma.match.findMany({
    where: {
      OR: [{ user1Id: profile.id }, { user2Id: profile.id }],
    },
    include: {
      user1: { include: { user: true } },
      user2: { include: { user: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const otherProfileIds = matches.map((match) =>
    match.user1Id === profile.id ? match.user2Id : match.user1Id
  );

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const recentSenders = otherProfileIds.length
    ? await prisma.message.groupBy({
        by: ["senderId"],
        where: {
          senderId: { in: otherProfileIds },
          createdAt: { gte: fiveMinutesAgo },
        },
        _count: { _all: true },
      })
    : [];

  const onlineSet = new Set(recentSenders.map((entry) => entry.senderId));

  const serialized = matches
    .filter((match) => {
      if (profile.isChild) {
        return match.status === "ACTIVE";
      }
      return true;
    })
    .map((match) => {
      const other = match.user1Id === profile.id ? match.user2 : match.user1;
      const lastMessage = match.messages[0];
      const isUser1 = match.user1Id === profile.id;
      const lastViewedAt = isUser1 ? match.user1LastViewedAt : match.user2LastViewedAt;
      const latestMessage = match.messages[0];

      const hasUnread = (() => {
        if (match.status !== "ACTIVE") {
          return match.status === "PENDING";
        }

        if (!latestMessage) {
          return true;
        }

        if (latestMessage.senderId === profile.id) {
          return false;
        }

        if (!lastViewedAt) {
          return true;
        }

        return latestMessage.createdAt > lastViewedAt;
      })();

      return {
        id: match.id,
        status: match.status,
        requiresGuardianApproval: match.requiresGuardianApproval,
        otherProfile: serializeProfile(other, other.user),
        lastMessage: lastMessage?.content ?? null,
        lastMessageTime: (lastMessage?.createdAt ?? match.createdAt).toISOString(),
        hasUnread,
        isOnline: onlineSet.has(other.id),
      };
    })
    .sort((a, b) => {
      const timeA = new Date(a.lastMessageTime).getTime();
      const timeB = new Date(b.lastMessageTime).getTime();
      return timeB - timeA;
    });

  return serialized;
}
