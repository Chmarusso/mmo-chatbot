import { NextResponse } from "next/server";
import { GameSuggestionStatus as PrismaStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { serializeGameSuggestion } from "@/lib/suggestions";
import type { GameSuggestionStatus } from "@/types/game-suggestion";

const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_REFERENCE_LENGTH = 500;

const STATUS_TO_PRISMA: Record<GameSuggestionStatus, PrismaStatus> = {
  pending: PrismaStatus.PENDING,
  accepted: PrismaStatus.ACCEPTED,
  rejected: PrismaStatus.REJECTED,
};

function isValidStatus(value: string): value is GameSuggestionStatus {
  return ["pending", "accepted", "rejected"].includes(value);
}

export async function POST(request: Request) {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const description = typeof payload.description === "string" ? payload.description.trim() : "";
  const referenceUrl = typeof payload.referenceUrl === "string" ? payload.referenceUrl.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.` }, { status: 400 });
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json({ error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.` }, { status: 400 });
  }

  if (referenceUrl && referenceUrl.length > MAX_REFERENCE_LENGTH) {
    return NextResponse.json({ error: "Reference link is too long." }, { status: 400 });
  }

  try {
    const suggestion = await prisma.gameSuggestion.create({
      data: {
        title,
        description: description || null,
        referenceUrl: referenceUrl || null,
        status: PrismaStatus.PENDING,
        createdByProfileId: profile.id,
      },
      include: {
        createdBy: { include: { user: true } },
        handledBy: { include: { user: true } },
      },
    });

    return NextResponse.json(
      { suggestion: serializeGameSuggestion(suggestion) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create game suggestion", error);
    return NextResponse.json({ error: "Failed to submit suggestion." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!profile.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status")?.toLowerCase() ?? "pending";
  let prismaStatus: PrismaStatus | undefined;

  if (statusParam) {
    if (!isValidStatus(statusParam)) {
      return NextResponse.json({ error: "Invalid status filter." }, { status: 400 });
    }
    prismaStatus = STATUS_TO_PRISMA[statusParam];
  }

  try {
    const suggestions = await prisma.gameSuggestion.findMany({
      where: prismaStatus ? { status: prismaStatus } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { include: { user: true } },
        handledBy: { include: { user: true } },
      },
    });

    return NextResponse.json({
      suggestions: suggestions.map(serializeGameSuggestion),
    });
  } catch (error) {
    console.error("Failed to load game suggestions", error);
    return NextResponse.json({ error: "Failed to load suggestions." }, { status: 500 });
  }
}
