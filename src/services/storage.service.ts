import fs from "fs";
import path from "path";
import sharp from "sharp";
import crypto from "crypto";

import env from "../config/env";

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";


const S3_BUCKET = env.S3_BUCKET;
const S3_REGION = env.S3_REGION;
const S3_ENDPOINT = env.S3_ENDPOINT;
const S3_BASE_URL = env.S3_BASE_URL;
const S3_ACCESS_KEY_ID = env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = env.S3_SECRET_ACCESS_KEY;

// Hard fail early if creds are missing
if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
  throw new Error(
    "S3 credentials missing: please set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY in .env"
  );
}

export const s3 = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  forcePathStyle: false,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
});


export const getUploadRoot = (): string => {
  const uploadDir = path.isAbsolute(env.UPLOAD_DIR)
    ? env.UPLOAD_DIR
    : path.join(process.cwd(), env.UPLOAD_DIR || "public");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return uploadDir;
};


export const deleteIfExists = (urlOrPath?: string | null): void => {
  if (!urlOrPath) return;

  // If it's an S3/Spaces URL
  if (/^https?:\/\//.test(urlOrPath)) {
    const key = urlOrPath.replace(`${S3_BASE_URL}/`, "");
    if (!key) return;

    (async () => {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
          })
        );
      } catch (err) {
        console.warn("⚠ Failed to delete from S3:", key, err);
      }
    })();

    return;
  }

  const filePath = path.isAbsolute(urlOrPath)
    ? urlOrPath
    : path.join(process.cwd(), urlOrPath);

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("🗑️ Deleted local:", filePath);
    }
  } catch (err) {
    console.warn("⚠ Failed to delete local file:", filePath, err);
  }
};


const randomFileName = (ext: string): string =>
  crypto.randomBytes(20).toString("hex") + ext;


export const saveCompressedImage = async (
  file: Express.Multer.File
): Promise<{ filePath: string; fileUrl: string }> => {
  if (!file) {
    throw new Error("No file provided for compression.");
  }

  try {
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    const fileName = randomFileName(ext);
    const key = `images/${fileName}`; // folder in your Space

    const baseSharp = file.buffer
      ? sharp(file.buffer)
      : sharp((file as any).path);

    let compressedBuffer: Buffer;

    if (ext === ".jpg" || ext === ".jpeg") {
      compressedBuffer = await baseSharp
        .resize(1200, undefined, { withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    } else if (ext === ".png") {
      compressedBuffer = await baseSharp
        .resize(1200, undefined, { withoutEnlargement: true })
        .png({ compressionLevel: 8 })
        .toBuffer();
    } else if (ext === ".webp") {
      compressedBuffer = await baseSharp
        .resize(1200, undefined, { withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    } else {
      compressedBuffer = await baseSharp
        .resize(1200, undefined, { withoutEnlargement: true })
        .png({ compressionLevel: 8 })
        .toBuffer();
    }

    // If file came from disk, remove temp file
    if ((file as any).path) {
      try {
        fs.unlinkSync((file as any).path);
      } catch (err) {
        console.warn("⚠ Failed to delete temp file:", err);
      }
    }

    // Upload to S3 / Spaces
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: compressedBuffer,
        ContentType: file.mimetype,
        ACL: "public-read",
      })
    );

    const fileUrl = `${S3_BASE_URL}/${key}`;

    return {
      filePath: key, // S3 object key
      fileUrl, // public URL (store in DB)
    };
  } catch (err) {
    console.error("❌ Image compression/upload failed:", err);
    throw new Error("Failed to save compressed image");
  }
};
