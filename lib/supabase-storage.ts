import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

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
 * Download a file from URL to temp folder, validate it, and upload to Supabase
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
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `mmoplaya-${Date.now()}-${filename}`);

  try {
    // Step 1: Download image to temp folder
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MMOPLAYA/1.0)",
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Get content type
    const contentType = response.headers.get("content-type");

    // Verify it's an image
    if (!contentType || !contentType.startsWith("image/")) {
      throw new Error(`Invalid content-type: ${contentType || "none"}`);
    }

    // Get the buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verify buffer has content
    if (buffer.length === 0) {
      throw new Error("Empty file (0 bytes)");
    }

    // Verify size is reasonable (min 1KB, max 10MB)
    if (buffer.length < 1024) {
      throw new Error(`Too small: ${buffer.length} bytes`);
    }
    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error(`Too large: ${buffer.length} bytes (max 10MB)`);
    }

    // Step 2: Write to temp file
    fs.writeFileSync(tempFilePath, buffer);

    // Step 3: Verify file was written successfully
    const stats = fs.statSync(tempFilePath);
    if (stats.size !== buffer.length) {
      throw new Error(`File write verification failed: expected ${buffer.length}, got ${stats.size}`);
    }

    // Step 4: Read back from temp file and upload to Supabase
    const fileBuffer = fs.readFileSync(tempFilePath);
    const uploadResult = await uploadToSupabase(fileBuffer, category, filename);

    // Step 5: Clean up temp file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (cleanupError) {
      console.warn("Failed to delete temp file:", cleanupError);
    }

    return uploadResult;
  } catch (error) {
    // Clean up temp file if it exists
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    throw error;
  }
}
