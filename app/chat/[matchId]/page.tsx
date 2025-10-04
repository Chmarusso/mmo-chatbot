import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile, serializeProfile } from "@/lib/profile";
import { ChatRoom } from "@/components/ChatRoom";
import type { ChatMessage } from "@/types/chat";

interface ChatPageProps {
  params: Promise<{ matchId: string }>;
}

export async function generateMetadata({ params }: ChatPageProps): Promise<Metadata> {
  const { matchId } = await params;
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      user1: { include: { user: true } },
      user2: { include: { user: true } },
    },
  });

  if (!match) {
    return { title: "Chat not found | MMO Match" };
  }

  const name1 = match.user1.name;
  const name2 = match.user2.name;

  return {
    title: `${name1} & ${name2} | Chat | MMO Match`,
    description: "Coordinate your next run with real-time MMO Match chat.",
  };
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { matchId } = await params;
  const profile = await getOrCreateProfile();

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      user1: { include: { user: true } },
      user2: { include: { user: true } },
    },
  });

  if (!match) {
    notFound();
  }

  const isParticipant = match.user1Id === profile.id || match.user2Id === profile.id;
  const isGuardian =
    match.user1.guardianProfileId === profile.id || match.user2.guardianProfileId === profile.id;

  if (!isParticipant && !isGuardian) {
    notFound();
  }

  const viewerIsChild = profile.isChild;

  const childProfile = isGuardian
    ? match.user1.guardianProfileId === profile.id
      ? match.user1
      : match.user2
    : null;

  const other = isParticipant
    ? match.user1Id === profile.id
      ? match.user2
      : match.user1
    : childProfile && childProfile.id === match.user1.id
    ? match.user2
    : match.user1;

  const otherProfile = serializeProfile(other, other.user);

  const retentionDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const rawMessages = await prisma.message.findMany({
    where: {
      matchId: matchId,
      createdAt: { gte: retentionDate },
    },
    orderBy: { createdAt: "asc" },
    include: {
      sender: {
        select: {
          id: true,
          isShadowbanned: true,
        },
      },
    },
  });

  const filteredMessages = rawMessages.filter((msg) => {
    if (isGuardian) {
      return true;
    }
    if (msg.senderId === profile.id) {
      return true;
    }
    return !msg.sender.isShadowbanned;
  });

  const formattedMessages: ChatMessage[] = filteredMessages.map((msg) => ({
    id: msg.id,
    matchId: msg.matchId,
    senderId: msg.senderId,
    content: msg.content,
    createdAt: msg.createdAt.toISOString(),
  }));

  const canSend = isParticipant && match.status === "ACTIVE";

  const readOnlyReason = !canSend
    ? match.status === "PENDING" && match.requiresGuardianApproval
      ? "Awaiting guardian approval. Messages will unlock once approved."
      : match.status === "BLOCKED"
      ? "This conversation has been blocked by a guardian."
      : undefined
    : isGuardian
    ? "Guardian view: you can monitor this conversation but cannot send messages."
    : undefined;

  return (
    <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:mx-auto lg:max-w-4xl lg:px-12 lg:py-12 lg:pb-12">
      <Link
        href="/matches"
        className="mb-6 inline-flex items-center text-sm text-accent-cyan hover:text-accent-purple"
      >
        ← Back to matches
      </Link>
      <ChatRoom
        matchId={matchId}
        profileId={profile.id}
        initialMessages={formattedMessages}
        otherUserName={otherProfile.name}
        otherProfile={otherProfile}
        canSend={canSend && !isGuardian}
        readOnlyReason={readOnlyReason}
      />
    </main>
  );
}
