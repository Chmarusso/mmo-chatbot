import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { destroySession, getCurrentUser } from "@/lib/session";

export async function DELETE() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.user.delete({ where: { id: user.id } });
    await destroySession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete account", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
