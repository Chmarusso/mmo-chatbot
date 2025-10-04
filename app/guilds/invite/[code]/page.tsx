import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeQrInvite, serializeGuild } from "@/lib/guild";
import { GuildInviteAcceptForm } from "@/components/guild/GuildInviteAcceptForm";
import { MobileNav } from "@/components/MobileNav";
import { DesktopNav } from "@/components/DesktopNav";

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

export const revalidate = 0;

export default async function GuildInvitePage({ params }: InvitePageProps) {
  const { code } = await params;
  const normalizedCode = code.trim().toUpperCase();

  const inviteRecord = await prisma.guildQrInvite.findUnique({
    where: { code: normalizedCode },
    include: {
      guild: true,
    },
  });

  if (!inviteRecord) {
    notFound();
  }

  const invite = serializeQrInvite(inviteRecord);
  const guild = serializeGuild(inviteRecord.guild);
  const memberCount = await prisma.guildMembership.count({ where: { guildId: invite.guildId } });

  const expired = invite.status === "expired";

  return (
    <>
      <DesktopNav active="guilds" />
      <main className="flex min-h-[70vh] flex-1 flex-col items-center justify-center gap-10 px-6 py-12 lg:px-12 lg:py-20">
        <div className="w-full max-w-3xl space-y-8">
          <div className="space-y-2 text-center">
            <p className="text-sm text-gray-400">Guild invite</p>
            <h1 className="text-3xl font-semibold lg:text-4xl">{guild.name}</h1>
            <p className="text-sm text-gray-300 lg:text-base">
              {guild.description ?? "No description provided."}
            </p>
            <p className="text-xs text-gray-400 lg:text-sm">{memberCount} member{memberCount === 1 ? "" : "s"}</p>
          </div>

          {expired ? (
            <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-center lg:p-10">
              <h2 className="text-xl font-semibold text-red-200">This invite has expired</h2>
              <p className="mt-2 text-sm text-red-100">
                Ask a guild officer for a fresh QR invite to join {guild.name}.
              </p>
              <Link href="/guilds" className="mt-4 inline-flex text-sm text-accent-cyan hover:text-accent-purple">
                Return to guilds
              </Link>
            </div>
          ) : (
            <GuildInviteAcceptForm inviteCode={invite.code} guildId={invite.guildId} guildName={guild.name} />
          )}
        </div>
      </main>
      <MobileNav active="guilds" />
    </>
  );
}
