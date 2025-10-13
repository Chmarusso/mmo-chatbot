import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.gameCategory.findMany({
      include: {
        _count: {
          select: { games: true },
        },
      },
      orderBy: { label: "asc" },
    });

    return NextResponse.json({
      categories: categories.map((category) => ({
        id: category.id,
        value: category.value,
        label: category.label,
        description: category.description,
        gameCount: category._count.games,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
