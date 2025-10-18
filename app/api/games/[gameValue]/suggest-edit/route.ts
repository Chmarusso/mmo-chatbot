import { NextResponse } from "next/server";
import { GameSuggestionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";

const TEXT_LIMIT = 2000;
const URL_LIMIT = 500;

const ARRAY_FIELDS = [
  "genreTags",
  "platformTags",
  "gameplayTags",
  "worldTags",
  "visualStyleTags",
] as const;

const TEXT_FIELDS = [
  "description",
  "summary",
  "featureSummary",
  "monetization",
  "idealFor",
] as const;

const URL_FIELDS = ["screenshot", "website"] as const;

type UpdatePayload = Partial<
  Record<
    | typeof TEXT_FIELDS[number]
    | typeof URL_FIELDS[number]
    | typeof ARRAY_FIELDS[number],
    string | string[]
  >
>;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameValue: string }> }
) {
  const { gameValue } = await params;
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const game = await prisma.game.findUnique({ where: { value: gameValue } });
  if (!game) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  const payload = await request.json().catch(() => ({}));

  const update: UpdatePayload = {};

  for (const field of TEXT_FIELDS) {
    const raw = payload[field];
    if (typeof raw === "string" && raw.trim()) {
      const trimmed = raw.trim().slice(0, TEXT_LIMIT);
      update[field] = trimmed;
    }
  }

  for (const field of URL_FIELDS) {
    const raw = payload[field];
    if (typeof raw === "string" && raw.trim()) {
      const trimmed = raw.trim().slice(0, URL_LIMIT);
      update[field] = trimmed;
    }
  }

  for (const field of ARRAY_FIELDS) {
    const raw = payload[field];
    if (Array.isArray(raw)) {
      const values = raw
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0);
      if (values.length > 0) {
        update[field] = values;
      }
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Provide at least one field to update." }, { status: 400 });
  }

  const comment = typeof payload.comment === "string" && payload.comment.trim()
    ? payload.comment.trim().slice(0, TEXT_LIMIT)
    : null;

  try {
    const suggestion = await prisma.gameUpdateSuggestion.create({
      data: {
        gameValue: game.value,
        payload: update as Record<string, string | string[]>,
        comment,
        status: GameSuggestionStatus.PENDING,
        createdByProfileId: profile.id,
      },
    });

    return NextResponse.json({ suggestionId: suggestion.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to submit game edit", error);
    return NextResponse.json({ error: "Failed to submit update." }, { status: 500 });
  }
}
