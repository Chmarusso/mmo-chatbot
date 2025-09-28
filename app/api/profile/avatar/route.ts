import { NextResponse } from "next/server";
import { writeFile, mkdir, stat, unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";

const MAX_SIZE_BYTES = 2 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function ensureUploadDir() {
  try {
    await stat(UPLOAD_DIR);
  } catch {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function POST(request: Request) {
  const profile = await getOrCreateProfile().catch(() => null);

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = file.name.split(".").pop() ?? "png";
  const filename = `${profile.id}-${Date.now()}.${ext}`;

  await ensureUploadDir();

  const filePath = path.join(UPLOAD_DIR, filename);
  await writeFile(filePath, buffer);

  const relativePath = `/uploads/${filename}`;

  // Clean up previous avatar if it existed and was stored locally
  if (profile.avatarUrl?.startsWith("/uploads/")) {
    const previousPath = path.join(process.cwd(), "public", profile.avatarUrl.replace(/^\//, ""));
    await unlink(previousPath).catch(() => undefined);
  }

  const updated = await prisma.profile.update({
    where: { id: profile.id },
    data: { avatarUrl: relativePath },
  });

  return NextResponse.json({ url: updated.avatarUrl });
}
