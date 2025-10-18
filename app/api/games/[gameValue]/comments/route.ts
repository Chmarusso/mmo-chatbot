import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { awardExp } from "@/lib/exp";
import { moderateComment } from "@/lib/comment-moderation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameValue: string }> }
) {
  try {
    const { gameValue } = await params;
    const dbGameValue = gameValue.replace(/-/g, '_');

    const comments = await prisma.gameComment.findMany({
      where: { gameValue: dbGameValue },
      include: {
        profile: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
    const dbGameValue = gameValue.replace(/-/g, '_');
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: "Comment must be less than 1000 characters" },
        { status: 400 }
      );
    }

    // Check if game exists
    const game = await prisma.game.findUnique({
      where: { value: dbGameValue },
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const moderation = await moderateComment(content.trim());
    if (!moderation.allowed) {
      return NextResponse.json(
        {
          error: "Comment violates community guidelines.",
          reasons: moderation.reasons ?? undefined,
        },
        { status: 400 }
      );
    }

    // Create comment
    const comment = await prisma.gameComment.create({
      data: {
        gameValue: dbGameValue,
        profileId: currentUser.profile.id,
        content: content.trim(),
      },
      include: {
        profile: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Award EXP for commenting
    awardExp({
      profileId: currentUser.profile.id,
      eventType: 'GAME_COMMENT',
      metadata: { gameValue: dbGameValue, commentId: comment.id },
    }).catch(err => console.error('Failed to award comment EXP:', err));

    return NextResponse.json(comment);
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
