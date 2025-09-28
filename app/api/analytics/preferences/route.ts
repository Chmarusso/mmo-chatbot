import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const formatDistribution = (rows: Array<{ value: string | null; count: number }>) => {
  const filtered = rows.filter((row) => typeof row.value === 'string' && row.value.length > 0);
  const total = filtered.reduce((acc, row) => acc + row.count, 0);

  return filtered
    .map((row) => ({
      value: row.value as string,
      count: row.count,
      percentage: total ? Number(((row.count / total) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
};

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [gamePref, playstyle, language, timeSlot] = await Promise.all([
    prisma.profile.groupBy({
      by: ["gamePref"],
      where: { gamePref: { not: null } },
      _count: { _all: true },
    }),
    prisma.profile.groupBy({
      by: ["playstyle"],
      where: { playstyle: { not: null } },
      _count: { _all: true },
    }),
    prisma.profile.groupBy({
      by: ["language"],
      where: { language: { not: null } },
      _count: { _all: true },
    }),
    prisma.profile.groupBy({
      by: ["timeSlot"],
      where: { timeSlot: { not: null } },
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    distributions: {
      gamePref: formatDistribution(
        gamePref.map((row) => ({ value: row.gamePref, count: row._count._all }))
      ),
      playstyle: formatDistribution(
        playstyle.map((row) => ({ value: row.playstyle, count: row._count._all }))
      ),
      language: formatDistribution(
        language.map((row) => ({ value: row.language, count: row._count._all }))
      ),
      timeSlot: formatDistribution(
        timeSlot.map((row) => ({ value: row.timeSlot, count: row._count._all }))
      ),
    },
  });
}
