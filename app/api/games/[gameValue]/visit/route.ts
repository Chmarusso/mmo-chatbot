import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ gameValue: string }> }
) {
  const { gameValue } = await context.params;

  // Convert URL format (with dashes) to database format (with underscores)
  const dbGameValue = gameValue.replace(/-/g, '_');

  try {
    // Find the game
    const game = await prisma.game.findUnique({
      where: { value: dbGameValue },
      select: { website: true },
    });

    if (!game || !game.website) {
      return NextResponse.json(
        { error: "Game website not found" },
        { status: 404 }
      );
    }

    // Get current user (optional)
    const currentUser = await getCurrentUser();

    // Get IP address
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0] || realIp || null;

    // Get user agent
    const userAgent = request.headers.get("user-agent") || null;

    // Track the click
    await prisma.gameWebsiteClick.create({
      data: {
        gameValue: dbGameValue,
        profileId: currentUser?.profile?.id || null,
        userId: currentUser?.id || null,
        ipAddress,
        userAgent,
      },
    });

    // Redirect to the game's official website
    return NextResponse.redirect(game.website, { status: 302 });
  } catch (error) {
    console.error("Error tracking game website click:", error);
    // Even if tracking fails, try to redirect
    const game = await prisma.game.findUnique({
      where: { value: dbGameValue },
      select: { website: true },
    });

    if (game?.website) {
      return NextResponse.redirect(game.website, { status: 302 });
    }

    return NextResponse.json(
      { error: "Failed to redirect" },
      { status: 500 }
    );
  }
}
