import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const games = await prisma.game.findMany({
      select: {
        value: true,
        label: true,
      },
      orderBy: { label: "asc" },
    });

    return NextResponse.json({
      games: games.map((game) => ({
        value: game.value,
        label: game.label,
      })),
    });
  } catch (error) {
    console.error("Failed to load game options:", error);
    return NextResponse.json(
      { error: "Failed to load game options" },
      { status: 500 },
    );
  }
}
