import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { awardExp } from "@/lib/exp";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameValue: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { gameValue } = await params;
    const body = await request.json();
    const { rating } = body;

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Check if game exists
    const game = await prisma.game.findUnique({
      where: { value: gameValue },
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Upsert rating
    const gameRating = await prisma.gameRating.upsert({
      where: {
        gameValue_profileId: {
          gameValue,
          profileId: currentUser.profile.id,
        },
      },
      update: {
        rating,
      },
      create: {
        gameValue,
        profileId: currentUser.profile.id,
        rating,
      },
    });

    // Award EXP for rating a game (only for new ratings)
    if (!gameRating.createdAt || gameRating.createdAt.getTime() === gameRating.updatedAt.getTime()) {
      awardExp({
        profileId: currentUser.profile.id,
        eventType: 'GAME_RATING',
        metadata: { gameValue, rating },
      }).catch(err => console.error('Failed to award rating EXP:', err));
    }

    return NextResponse.json(gameRating);
  } catch (error) {
    console.error("Error submitting rating:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
