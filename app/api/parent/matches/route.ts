import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile, serializeProfile } from "@/lib/profile";

const forbidden = NextResponse.json({ error: "Forbidden" }, { status: 403 });

export async function GET() {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile || profile.isChild) {
    return forbidden;
  }

  const children = await prisma.profile.findMany({
    where: { guardianProfileId: profile.id },
    select: { id: true },
  });

  const childIds = children.map((child) => child.id);

  if (!childIds.length) {
    return NextResponse.json({ matches: [] });
  }

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ user1Id: { in: childIds } }, { user2Id: { in: childIds } }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      user1: { include: { user: true } },
      user2: { include: { user: true } },
    },
  });

  const formatted = matches.map((match) => ({
    id: match.id,
    status: match.status,
    requiresGuardianApproval: match.requiresGuardianApproval,
    approvedAt: match.approvedAt?.toISOString() ?? null,
    approvedByProfileId: match.approvedByProfileId,
    blockedAt: match.blockedAt?.toISOString() ?? null,
    blockedByProfileId: match.blockedByProfileId,
    user1: serializeProfile(match.user1, match.user1.user),
    user2: serializeProfile(match.user2, match.user2.user),
  }));

  return NextResponse.json({ matches: formatted });
}

export async function POST(request: Request) {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile || profile.isChild) {
    return forbidden;
  }

  const { childProfileId, friendProfileId } = (await request.json().catch(() => ({}))) as {
    childProfileId?: string;
    friendProfileId?: string;
  };

  if (!childProfileId || !friendProfileId) {
    return NextResponse.json({ error: "childProfileId and friendProfileId are required" }, { status: 400 });
  }

  if (childProfileId === friendProfileId) {
    return NextResponse.json({ error: "Profiles must be different" }, { status: 400 });
  }

  const child = await prisma.profile.findUnique({
    where: { id: childProfileId },
    select: {
      id: true,
      guardianProfileId: true,
    },
  });

  if (!child || child.guardianProfileId !== profile.id) {
    return forbidden;
  }

  const friend = await prisma.profile.findUnique({
    where: { id: friendProfileId },
    select: {
      id: true,
      user: true,
    },
  });

  if (!friend) {
    return NextResponse.json({ error: "Friend profile not found" }, { status: 404 });
  }

  const sorted = [childProfileId, friendProfileId].sort();
  const [user1Id, user2Id] = sorted as [string, string];

  const match = await prisma.match.upsert({
    where: {
      user1Id_user2Id: {
        user1Id,
        user2Id,
      },
    },
    update: {
      status: "ACTIVE",
      requiresGuardianApproval: false,
      approvedAt: new Date(),
      approvedByProfileId: profile.id,
      blockedAt: null,
      blockedByProfileId: null,
    },
    create: {
      user1Id,
      user2Id,
      status: "ACTIVE",
      requiresGuardianApproval: false,
      approvedAt: new Date(),
      approvedByProfileId: profile.id,
    },
    include: {
      user1: { include: { user: true } },
      user2: { include: { user: true } },
    },
  });

  return NextResponse.json({
    match: {
      id: match.id,
      status: match.status,
      user1: serializeProfile(match.user1, match.user1.user),
      user2: serializeProfile(match.user2, match.user2.user),
    },
  });
}
