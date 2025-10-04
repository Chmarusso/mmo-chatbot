import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeGuild, serializeQrInvite } from "@/lib/guild";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const normalizedCode = code.trim().toUpperCase();

  const invite = await prisma.guildQrInvite.findUnique({
    where: { code: normalizedCode },
    include: {
      guild: true,
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const status = invite.expiresAt.getTime() <= Date.now() ? "expired" : "active";

  if (status === "expired") {
    return NextResponse.json({ invite: serializeQrInvite(invite), status }, { status: 410 });
  }

  return NextResponse.json({
    invite: serializeQrInvite(invite),
    guild: serializeGuild(invite.guild),
    status,
  });
}
