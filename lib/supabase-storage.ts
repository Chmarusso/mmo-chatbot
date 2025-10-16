import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const BUCKET_NAME = "mmoplaya";

export type UploadCategory = "avatars" | "game-screenshots";

/**
 * Upload a file to Supabase storage
 * @param file - File buffer or Blob
 * @param category - Upload category (avatars or game-screenshots)
 * @param filename - Filename to use
 * @returns Public URL of uploaded file
 */
export async function uploadToSupabase(
  file: Buffer | Blob,
  category: UploadCategory,
  filename: string
): Promise<string> {
  const filePath = `${category}/${filename}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      contentType: file instanceof Blob ? file.type : "image/jpeg",
      upsert: true, // Overwrite if exists
    });

  if (error) {
    console.error("Supabase upload error:", error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Delete a file from Supabase storage
 * @param url - Full public URL or file path
 * @param category - Upload category (avatars or game-screenshots)
 */
export async function deleteFromSupabase(
  url: string,
  category: UploadCategory
): Promise<void> {
  // Extract filename from URL
  const urlParts = url.split("/");
  const filename = urlParts[urlParts.length - 1];

  if (!filename) {
    console.warn("Could not extract filename from URL:", url);
    return;
  }

  const filePath = `${category}/${filename}`;

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

  if (error) {
    console.error("Supabase delete error:", error);
    // Don't throw - deletion failures shouldn't break the app
  }
}

/**
 * Download a file from URL and upload to Supabase
 * @param imageUrl - URL of image to download
 * @param category - Upload category (avatars or game-screenshots)
 * @param filename - Filename to use
 * @returns Public URL of uploaded file
 */
export async function downloadAndUploadToSupabase(
  imageUrl: string,
  category: UploadCategory,
  filename: string
): Promise<string> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MMOPLAYA/1.0)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const blob = await response.blob();
    return await uploadToSupabase(blob, category, filename);
  } catch (error) {
    console.error("Failed to download and upload image:", error);
    throw error;
  }
}
