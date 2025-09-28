import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile, serializeProfile } from "@/lib/profile";
import { GuildChatRoom } from "@/components/guild/GuildChatRoom";
import { GuildInviteManager } from "@/components/guild/GuildInviteManager";
import { DesktopNav } from "@/components/DesktopNav";
import { MobileNav } from "@/components/MobileNav";

interface GuildPageProps {
  params: { guildId: string };
}

export const revalidate = 0;

export default async function GuildDetailPage({ params }: GuildPageProps) {
  const profile = await getOrCreateProfile();

  const guild = await prisma.guild.findUnique({
    where: { id: params.guildId },
    include: {
      owner: true,
    },
  });

  if (!guild) {
    notFound();
  }

  const directMembership = await prisma.guildMembership.findUnique({
    where: {
      guildId_profileId: {
        guildId: guild.id,
        profileId: profile.id,
      },
    },
  });

  let viewerMembership = directMembership;
  let isGuardianViewer = false;

  if (!viewerMembership) {
    viewerMembership = await prisma.guildMembership.findFirst({
      where: {
        guildId: guild.id,
        profile: {
          guardianProfileId: profile.id,
        },
      },
    });
    if (!viewerMembership) {
      notFound();
    }
    isGuardianViewer = true;
  }

  const memberCount = await prisma.guildMembership.count({ where: { guildId: guild.id } });

  const members = await prisma.guildMembership.findMany({
    where: { guildId: guild.id },
    include: {
      profile: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const memberProfiles = members.map((member) => ({
    id: member.id,
    profile: serializeProfile(member.profile, member.profile.user),
    nickname: member.nickname,
    role: member.role,
    isBlockedByGuardian: member.isBlockedByGuardian,
  }));

  const rawMessages = await prisma.guildMessage.findMany({
    where: { guildId: guild.id },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      sender: {
        select: {
          id: true,
          isShadowbanned: true,
        },
      },
    },
  });

  const visibleMessages = rawMessages.filter((message) => {
    if (isGuardianViewer) {
      return true;
    }
    if (viewerMembership?.isBlockedByGuardian) {
      return false;
    }
    if (message.senderId === profile.id) {
      return true;
    }
    return !message.sender.isShadowbanned;
  });

  const formattedMessages = visibleMessages.map((msg) => ({
    id: msg.id,
    guildId: msg.guildId,
    senderId: msg.senderId,
    content: msg.content,
    createdAt: msg.createdAt.toISOString(),
  }));

  const canManageInvites = !isGuardianViewer && (viewerMembership?.role === "OWNER" || viewerMembership?.role === "OFFICER");
  const canSendMessages = !isGuardianViewer && !viewerMembership?.isBlockedByGuardian;

  const readOnlyReason = isGuardianViewer
    ? "Guardian view: you can monitor this guild chat but cannot send messages."
    : viewerMembership?.isBlockedByGuardian
    ? "This guild has been blocked by a guardian."
    : undefined;

  const guildOwnerProfile = await prisma.profile.findUnique({
    where: { id: guild.ownerId },
    include: { user: true },
  });

  const guildDetails = {
    id: guild.id,
    name: guild.name,
    description: guild.description,
    inviteCode: guild.inviteCode,
    owner: guildOwnerProfile ? serializeProfile(guildOwnerProfile, guildOwnerProfile.user) : null,
  };

  return (
    <>
      <DesktopNav active="guilds" />
      <main className="flex-1 space-y-8 px-4 py-6 pb-24 sm:px-6 lg:mx-auto lg:max-w-6xl lg:space-y-12 lg:px-12 lg:py-12 lg:pb-16">
        <Link href="/guilds" className="inline-flex items-center text-sm text-accent-cyan hover:text-accent-purple">
          ← Back to guilds
        </Link>
        <header className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl db lg:text-4xl font-semibold">{guildDetails.name}</h1>
              <p className="text-sm text-gray-300 lg:text-base">{guildDetails.description ?? "No description yet."}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-gray-400 lg:text-sm">
              <span className="rounded-full border border-accent-cyan/30 px-3 py-1">Invite: {guild.inviteCode}</span>
              <span className="rounded-full border border-accent-purple/30 px-3 py-1">Members: {memberCount}</span>
              <span className="rounded-full border border-accent-purple/30 px-3 py-1 capitalize">
                Role: {(viewerMembership?.role ?? "member").toLowerCase()}
              </span>
            </div>
          </div>
        </header>

        <GuildInviteManager guildId={guild.id} canCreate={canManageInvites} guildName={guild.name} />

        <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr] lg:gap-8">
          <GuildChatRoom
            guildId={guild.id}
            profileId={profile.id}
            initialMessages={formattedMessages}
            guildName={guild.name}
            canSend={canSendMessages}
            readOnlyReason={readOnlyReason}
          />
          <aside className="space-y-4 rounded-3xl border border-accent-purple/30 bg-surface/80 p-6 shadow-glow lg:p-8">
            <h2 className="text-lg font-semibold lg:text-xl">Members</h2>
            <ul className="space-y-3 text-sm text-gray-300">
              {memberProfiles.map((member) => (
                <li key={member.id} className="flex flex-col">
                  <span className="font-medium text-white">
                    {member.nickname ?? member.profile.name}
                    {member.nickname ? (
                      <span className="ml-2 text-xs text-gray-500">({member.profile.name})</span>
                    ) : null}
                  </span>
                  <span className="text-xs capitalize text-gray-400">
                    {member.role.toLowerCase()}
                    {member.isBlockedByGuardian ? " · blocked by guardian" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </section>
      </main>
      <MobileNav active="guilds" />
    </>
  );
}
