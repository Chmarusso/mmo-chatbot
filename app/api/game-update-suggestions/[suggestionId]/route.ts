import { NextResponse } from "next/server";
import { Prisma, GameSuggestionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { serializeGameUpdateSuggestion } from "@/lib/game-update-suggestions";

const VALID_STATUS: GameSuggestionStatus[] = [
  GameSuggestionStatus.PENDING,
  GameSuggestionStatus.ACCEPTED,
  GameSuggestionStatus.REJECTED,
];

function normalizeStatus(value: unknown): GameSuggestionStatus | undefined {
  if (typeof value !== "string") return undefined;
  const upper = value.toUpperCase();
  return VALID_STATUS.includes(upper as GameSuggestionStatus)
    ? (upper as GameSuggestionStatus)
    : undefined;
}

const MUTABLE_FIELDS = new Set([
  "description",
  "summary",
  "featureSummary",
  "screenshot",
  "website",
  "genreTags",
  "platformTags",
  "gameplayTags",
  "worldTags",
  "visualStyleTags",
  "monetization",
  "idealFor",
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ suggestionId: string }> }
) {
  const { suggestionId } = await params;
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!profile.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json().catch(() => ({}));
  const nextStatus = normalizeStatus(payload.status);
  const adminNotes = typeof payload.adminNotes === "string" ? payload.adminNotes.trim() : undefined;

  if (!nextStatus && adminNotes === undefined) {
    return NextResponse.json({ error: "No updates supplied." }, { status: 400 });
  }

  try {
    const suggestion = await prisma.gameUpdateSuggestion.findUnique({
      where: { id: suggestionId },
      include: {
        game: true,
        createdBy: { include: { user: true } },
        handledBy: { include: { user: true } },
      },
    });

    if (!suggestion) {
      return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });
    }

    const updateData: Prisma.GameUpdateSuggestionUpdateInput = {};
    const now = new Date();

    if (nextStatus) {
      updateData.status = nextStatus;

      if (nextStatus === GameSuggestionStatus.PENDING) {
        updateData.handledAt = null;
        updateData.handledBy = { disconnect: true };
      } else {
        updateData.handledAt = now;
        updateData.handledBy = { connect: { id: profile.id } };
      }
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes || null;
    }

    const result = await prisma.$transaction(async (tx) => {
      if (nextStatus === GameSuggestionStatus.ACCEPTED) {
        const rawPayload = suggestion.payload as Record<string, unknown>;
        const gameUpdate: Prisma.GameUpdateInput = {};

        for (const [key, value] of Object.entries(rawPayload)) {
          if (!MUTABLE_FIELDS.has(key)) continue;

          if (Array.isArray(value)) {
            const cleaned = value.map((item) => String(item)).filter((item) => item.length > 0);
            (gameUpdate as Record<string, unknown>)[key] = { set: cleaned };
          } else if (value === null || value === undefined || value === "") {
            (gameUpdate as Record<string, unknown>)[key] = null;
          } else {
            (gameUpdate as Record<string, unknown>)[key] = value;
          }
        }

        if (Object.keys(gameUpdate).length > 0) {
          await tx.game.update({
            where: { value: suggestion.gameValue },
            data: gameUpdate,
          });
        }
      }

      const updated = await tx.gameUpdateSuggestion.update({
        where: { id: suggestionId },
        data: updateData,
        include: {
          game: true,
          createdBy: { include: { user: true } },
          handledBy: { include: { user: true } },
        },
      });

      return updated;
    });

    return NextResponse.json({ suggestion: serializeGameUpdateSuggestion(result) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });
    }
    console.error(`Failed to update game suggestion ${suggestionId}`, error);
    return NextResponse.json({ error: "Failed to update suggestion." }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ suggestionId: string }> }
) {
  const { suggestionId } = await params;
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!profile.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const suggestion = await prisma.gameUpdateSuggestion.findUnique({
    where: { id: suggestionId },
    include: {
      game: true,
      createdBy: { include: { user: true } },
      handledBy: { include: { user: true } },
    },
  });

  if (!suggestion) {
    return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });
  }

  return NextResponse.json({ suggestion: serializeGameUpdateSuggestion(suggestion) });
}
