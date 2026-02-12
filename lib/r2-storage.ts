import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;
const R2_PATH_PREFIX = process.env.R2_PATH_PREFIX || "mmoplaya";

if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
  throw new Error("Missing R2 environment variables");
}

const s3 = new S3Client({
  endpoint: R2_ENDPOINT,
  region: "auto",
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export type UploadCategory = "avatars" | "game-screenshots";

/**
 * Upload a file to Cloudflare R2
 * @param file - File buffer or Blob
 * @param category - Upload category (avatars or game-screenshots)
 * @param filename - Filename to use
 * @returns Public URL of uploaded file
 */
export async function uploadToR2(
  file: Buffer | Blob,
  category: UploadCategory,
  filename: string
): Promise<string> {
  const key = `${R2_PATH_PREFIX}/${category}/${filename}`;

  let body: Buffer;
  let contentType = "image/jpeg";

  if (file instanceof Blob) {
    const arrayBuffer = await file.arrayBuffer();
    body = Buffer.from(arrayBuffer);
    contentType = file.type || "image/jpeg";
  } else {
    body = file;
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Delete a file from Cloudflare R2
 * @param url - Full public URL or file path
 * @param category - Upload category (avatars or game-screenshots)
 */
export async function deleteFromR2(
  url: string,
  category: UploadCategory
): Promise<void> {
  let key: string;

  if (url.startsWith(R2_PUBLIC_URL)) {
    // R2 URL — extract key from URL
    key = url.replace(`${R2_PUBLIC_URL}/`, "");
  } else {
    // External URL — extract filename and build R2 key
    const urlParts = url.split("/");
    const filename = urlParts[urlParts.length - 1];
    if (!filename) {
      console.warn("Could not extract filename from URL:", url);
      return;
    }
    key = `${R2_PATH_PREFIX}/${category}/${filename}`;
  }

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
      })
    );
  } catch (error) {
    console.error("R2 delete error:", error);
    // Don't throw - deletion failures shouldn't break the app
  }
}

/**
 * Download a file from URL to temp folder, validate it, and upload to R2
 * @param imageUrl - URL of image to download
 * @param category - Upload category (avatars or game-screenshots)
 * @param filename - Filename to use
 * @returns Public URL of uploaded file
 */
export async function downloadAndUploadToR2(
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

    // Step 4: Read back from temp file and upload to R2
    const fileBuffer = fs.readFileSync(tempFilePath);
    const uploadResult = await uploadToR2(fileBuffer, category, filename);

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
