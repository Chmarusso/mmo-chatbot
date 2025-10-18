import { NextResponse } from "next/server";
import { GameSuggestionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { serializeGameUpdateSuggestion } from "@/lib/game-update-suggestions";

const VALID_STATUS: GameSuggestionStatus[] = [
  GameSuggestionStatus.PENDING,
  GameSuggestionStatus.ACCEPTED,
  GameSuggestionStatus.REJECTED,
];

export async function GET(request: Request) {
  const profile = await getOrCreateProfile().catch(() => null);
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!profile.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status")?.toUpperCase() as GameSuggestionStatus | null;

  if (statusParam && !VALID_STATUS.includes(statusParam)) {
    return NextResponse.json({ error: "Invalid status filter." }, { status: 400 });
  }

  const suggestions = await prisma.gameUpdateSuggestion.findMany({
    where: statusParam ? { status: statusParam } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      game: true,
      createdBy: { include: { user: true } },
      handledBy: { include: { user: true } },
    },
  });

  return NextResponse.json({
    suggestions: suggestions.map(serializeGameUpdateSuggestion),
  });
}
