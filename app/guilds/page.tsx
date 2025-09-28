import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { serializeGuild } from "@/lib/guild";
import { DesktopNav } from "@/components/DesktopNav";
import { MobileNav } from "@/components/MobileNav";
import { GuildCreateForm } from "@/components/guild/GuildCreateForm";

export const revalidate = 0;

export default async function GuildsPage() {
  const profile = await getOrCreateProfile();

  const memberships = await prisma.guildMembership.findMany({
    where: { profileId: profile.id },
    include: {
      guild: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const guildIds = memberships.map((membership) => membership.guildId);

  const memberCounts = guildIds.length
    ? await prisma.guildMembership.groupBy({
        by: ["guildId"],
        where: { guildId: { in: guildIds } },
        _count: { _all: true },
      })
    : [];

  const countMap = new Map(memberCounts.map((row) => [row.guildId, row._count._all]));

  const guilds = memberships.map((membership) =>
    serializeGuild(membership.guild, membership, countMap.get(membership.guildId))
  );

  return (
    <>
      <DesktopNav active="guilds" />
      <main className="flex-1 space-y-8 px-4 py-6 pb-24 sm:px-6 lg:mx-auto lg:max-w-6xl lg:space-y-12 lg:px-12 lg:py-12 lg:pb-16">
        <header className="space-y-2 lg:text-left">
          <h1 className="text-3xl font-semibold lg:text-4xl">Guilds</h1>
          <p className="text-sm text-gray-400 lg:text-base">
            Manage your invite-only guilds and stay connected with your squad.
          </p>
        </header>

        <GuildCreateForm isVerified={profile.isVerified} />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold lg:text-2xl">Your guilds</h2>
          {!guilds.length ? (
            <div className="rounded-3xl border border-accent-purple/30 bg-surface/80 p-6 text-center lg:p-10">
              <p className="text-sm text-gray-300 lg:text-base">
                You’re not part of a guild yet. Create one with a creation code or join using an invite link.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
              {guilds.map((guild) => (
                <Link
                  key={guild.id}
                  href={`/guilds/${guild.id}`}
                  className="flex flex-col gap-3 rounded-3xl border border-accent-cyan/30 bg-surface/80 p-5 transition hover:border-accent-cyan/60 hover:shadow-glow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold lg:text-xl">{guild.name}</h3>
                      <p className="text-xs text-gray-400 lg:text-sm">
                        {guild.description ?? "No description yet"}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 lg:text-sm">
                      {guild.memberCount ?? 1} member{(guild.memberCount ?? 1) === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="rounded-full border border-accent-cyan/30 px-3 py-1">
                      Invite: {guild.inviteCode}
                    </span>
                    <span className="rounded-full border border-accent-purple/30 px-3 py-1">
                      Role: {(guild.role ?? "member").toLowerCase()}
                    </span>
                    {guild.nickname ? (
                      <span className="rounded-full border border-accent-purple/30 px-3 py-1">
                        Nickname: {guild.nickname}
                      </span>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <MobileNav active="guilds" />
    </>
  );
}
