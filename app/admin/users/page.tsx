import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { AdminUserManager } from "@/components/AdminUserManager";

type PageProps = {
  searchParams: Promise<{
    query?: string;
    status?: string;
  }>;
};

const STATUS_FILTERS = ["active", "blocked", "all"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export const metadata: Metadata = {
  title: "User Management | Admin | MMOPLAYA",
};

const parseStatus = (value?: string): StatusFilter => {
  const normalized = (value ?? "").toLowerCase();
  return STATUS_FILTERS.includes(normalized as StatusFilter) ? (normalized as StatusFilter) : "active";
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const profile = await getOrCreateProfile();
  if (!profile.isAdmin) {
    notFound();
  }

  const params = await searchParams;
  const status = parseStatus(params?.status);
  const query = params?.query?.trim() ?? "";

  const users = await prisma.user.findMany({
    where: query
      ? {
          OR: [
            { email: { contains: query, mode: "insensitive" } },
            { profile: { name: { contains: query, mode: "insensitive" } } },
          ],
        }
      : undefined,
    include: {
      profile: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const filtered = users.filter((user) => {
    const isBlocked = Boolean(user.profile?.isShadowbanned);
    if (status === "blocked") return isBlocked;
    if (status === "active") return !isBlocked;
    return true;
  });

  const initialUsers = filtered.map((user) => ({
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    name: user.profile?.name ?? user.email.split("@")[0] ?? "Player",
    profileId: user.profile?.id ?? null,
    isShadowbanned: Boolean(user.profile?.isShadowbanned),
    isAdmin: Boolean(user.profile?.isAdmin),
  }));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-12 pb-24 lg:px-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white lg:text-4xl">User Management</h1>
        <p className="text-sm text-gray-400 lg:text-base">
          Search, block, or remove users. Blocking immediately signs a user out and prevents future logins.
        </p>
      </header>

      <AdminUserManager
        initialUsers={initialUsers}
        initialQuery={query}
        initialStatus={status}
        currentUserId={profile.userId}
      />
    </main>
  );
}
