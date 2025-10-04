import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeCreationCode, getGuildCodeStatus } from "@/lib/guild";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const normalized = code.trim().toUpperCase();

  const record = await prisma.guildCreationCode.findUnique({
    where: { code: normalized },
    include: { payment: true },
  });

  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    code: serializeCreationCode(record),
    paymentStatus: record.payment?.status ?? null,
    status: getGuildCodeStatus(record),
  });
}
