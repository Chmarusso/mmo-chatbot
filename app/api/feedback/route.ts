import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";

export async function POST(request: Request) {
  const profile = await getOrCreateProfile().catch(() => null);
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));
  const message = typeof payload.message === "string" ? payload.message.trim() : "";

  if (!message) {
    return NextResponse.json({ error: "Feedback message is required" }, { status: 400 });
  }

  await prisma.feedback.create({
    data: {
      profileId: profile.id,
      message,
    },
  });

  return NextResponse.json({ success: true });
}
