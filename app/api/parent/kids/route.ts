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
    where: {
      guardianProfileId: profile.id,
    },
    include: {
      user: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const serialized = children.map((child) => serializeProfile(child, child.user));

  return NextResponse.json({ children: serialized });
}

export async function POST(request: Request) {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile || profile.isChild) {
    return forbidden;
  }

  const { email, name } = (await request.json().catch(() => ({}))) as {
    email?: string;
    name?: string;
  };

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) {
    return NextResponse.json({ error: "Email format invalid" }, { status: 400 });
  }

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Child name is required" }, { status: 400 });
  }

  const childUser = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      profile: {
        upsert: {
          create: {
            name: name.trim().slice(0, 80),
            isChild: true,
            guardianProfileId: profile.id,
          },
          update: {
            name: name.trim().slice(0, 80),
            isChild: true,
            guardianProfileId: profile.id,
          },
        },
      },
    },
    create: {
      email: normalizedEmail,
      profile: {
        create: {
          name: name.trim().slice(0, 80),
          isChild: true,
          guardianProfileId: profile.id,
        },
      },
    },
    include: {
      profile: true,
    },
  });

  if (!childUser.profile) {
    return NextResponse.json({ error: "Failed to create child profile" }, { status: 500 });
  }

  return NextResponse.json({ child: serializeProfile(childUser.profile, childUser) }, { status: 201 });
}
