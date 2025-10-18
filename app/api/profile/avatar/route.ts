import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfile } from "@/lib/profile";
import { uploadToSupabase, deleteFromSupabase } from "@/lib/supabase-storage";
import { isImageSafe } from "@/lib/nsfw";

const MAX_SIZE_BYTES = 2 * 1024 * 1024;

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
  const mimeType = file.type || "image/png";
  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

  try {
    const safe = await isImageSafe(dataUrl);
    if (!safe) {
      return NextResponse.json({ error: "Avatar appears to violate content guidelines." }, { status: 400 });
    }
  } catch (error) {
    console.error("Avatar moderation error", error);
    return NextResponse.json({ error: "Avatar moderation temporarily unavailable" }, { status: 503 });
  }
  const ext = file.name.split(".").pop() ?? "png";
  const filename = `${profile.id}-${Date.now()}.${ext}`;

  try {
    // Upload to Supabase
    const publicUrl = await uploadToSupabase(buffer, "avatars", filename);

    // Delete old avatar from Supabase if it exists and is a Supabase URL
    if (profile.avatarUrl && profile.avatarUrl.includes("supabase.co")) {
      await deleteFromSupabase(profile.avatarUrl, "avatars").catch((err) => {
        console.error("Failed to delete old avatar:", err);
      });
    }

    // Update database with new avatar URL
    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: { avatarUrl: publicUrl },
    });

    return NextResponse.json({ url: updated.avatarUrl });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    );
  }
}
