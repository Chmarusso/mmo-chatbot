import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const unauthorized = NextResponse.json({ error: "Forbidden" }, { status: 403 });

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user?.profile?.isAdmin) {
    return null;
  }
  return user;
}

const normalizeNameFromEmail = (email: string) => email.split("@")[0] ?? "MMO Player";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return unauthorized;
  }

  const { userId: targetId } = await params;
  if (!targetId) {
    return NextResponse.json({ error: "User id is required" }, { status: 400 });
  }

  if (targetId === admin.id) {
    return NextResponse.json({ error: "You cannot modify your own account" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action.trim().toLowerCase() : undefined;

  if (action !== "block" && action !== "unblock") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetId },
    include: { profile: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (targetUser.profile?.isAdmin) {
    return NextResponse.json({ error: "Administrator accounts cannot be modified" }, { status: 400 });
  }

  let profile = targetUser.profile;

  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        userId: targetUser.id,
        name: normalizeNameFromEmail(targetUser.email),
      },
    });
  }

  const shouldBlock = action === "block";

  const updatedProfile = await prisma.profile.update({
    where: { id: profile.id },
    data: { isShadowbanned: shouldBlock },
    select: {
      id: true,
      userId: true,
      isShadowbanned: true,
      name: true,
      isAdmin: true,
    },
  });

  if (shouldBlock) {
    await Promise.all([
      prisma.session.deleteMany({ where: { userId: targetUser.id } }),
      prisma.otpToken.deleteMany({ where: { userId: targetUser.id } }),
    ]);
  }

  return NextResponse.json({
    user: {
      id: targetUser.id,
      email: targetUser.email,
      createdAt: targetUser.createdAt.toISOString(),
      profile: {
        id: updatedProfile.id,
        name: updatedProfile.name,
        isShadowbanned: updatedProfile.isShadowbanned,
        isAdmin: updatedProfile.isAdmin ?? false,
      },
    },
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return unauthorized;
  }

  const { userId: targetId } = await params;
  if (!targetId) {
    return NextResponse.json({ error: "User id is required" }, { status: 400 });
  }

  if (targetId === admin.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetId },
    include: { profile: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (targetUser.profile?.isAdmin) {
    return NextResponse.json({ error: "Administrator accounts cannot be deleted" }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id: targetId } });
  } catch (error) {
    console.error("Failed to delete user", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
