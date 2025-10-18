import { NextResponse } from "next/server";
import { Prisma, GameSuggestionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { serializeGameSuggestion } from "@/lib/suggestions";

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
    const now = new Date();
    const data: Prisma.GameSuggestionUpdateInput = {};

    if (nextStatus) {
      data.status = nextStatus;
      if (nextStatus === GameSuggestionStatus.PENDING) {
        data.handledAt = null;
        data.handledBy = { disconnect: true };
      } else {
        data.handledAt = now;
        data.handledBy = { connect: { id: profile.id } };
      }
    }

    if (adminNotes !== undefined) {
      data.adminNotes = adminNotes || null;
    }

    const updated = await prisma.gameSuggestion.update({
      where: { id: suggestionId },
      data,
      include: {
        createdBy: { include: { user: true } },
        handledBy: { include: { user: true } },
      },
    });

    return NextResponse.json({ suggestion: serializeGameSuggestion(updated) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });
    }
    console.error(`Failed to update suggestion ${suggestionId}`, error);
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

  try {
    const suggestion = await prisma.gameSuggestion.findUnique({
      where: { id: suggestionId },
      include: {
        createdBy: { include: { user: true } },
        handledBy: { include: { user: true } },
      },
    });

    if (!suggestion) {
      return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });
    }

    return NextResponse.json({ suggestion: serializeGameSuggestion(suggestion) });
  } catch (error) {
    console.error(`Failed to load suggestion ${suggestionId}`, error);
    return NextResponse.json({ error: "Failed to load suggestion." }, { status: 500 });
  }
}
