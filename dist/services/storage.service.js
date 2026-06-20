"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveCompressedImage = exports.deleteIfExists = exports.getUploadRoot = exports.s3 = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const crypto_1 = __importDefault(require("crypto"));
const env_1 = __importDefault(require("../config/env"));
const client_s3_1 = require("@aws-sdk/client-s3");
const S3_BUCKET = env_1.default.S3_BUCKET;
const S3_REGION = env_1.default.S3_REGION;
const S3_ENDPOINT = env_1.default.S3_ENDPOINT;
const S3_BASE_URL = env_1.default.S3_BASE_URL;
const S3_ACCESS_KEY_ID = env_1.default.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = env_1.default.S3_SECRET_ACCESS_KEY;
// Hard fail early if creds are missing
if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error("S3 credentials missing: please set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY in .env");
}
exports.s3 = new client_s3_1.S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    forcePathStyle: false,
    credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
    },
});
const getUploadRoot = () => {
    const uploadDir = path_1.default.isAbsolute(env_1.default.UPLOAD_DIR)
        ? env_1.default.UPLOAD_DIR
        : path_1.default.join(process.cwd(), env_1.default.UPLOAD_DIR || "public");
    if (!fs_1.default.existsSync(uploadDir)) {
        fs_1.default.mkdirSync(uploadDir, { recursive: true });
    }
    return uploadDir;
};
exports.getUploadRoot = getUploadRoot;
const deleteIfExists = (urlOrPath) => {
    if (!urlOrPath)
        return;
    // If it's an S3/Spaces URL
    if (/^https?:\/\//.test(urlOrPath)) {
        const key = urlOrPath.replace(`${S3_BASE_URL}/`, "");
        if (!key)
            return;
        (async () => {
            try {
                await exports.s3.send(new client_s3_1.DeleteObjectCommand({
                    Bucket: S3_BUCKET,
                    Key: key,
                }));
            }
            catch (err) {
                console.warn("⚠ Failed to delete from S3:", key, err);
            }
        })();
        return;
    }
    const filePath = path_1.default.isAbsolute(urlOrPath)
        ? urlOrPath
        : path_1.default.join(process.cwd(), urlOrPath);
    try {
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
            console.log("🗑️ Deleted local:", filePath);
        }
    }
    catch (err) {
        console.warn("⚠ Failed to delete local file:", filePath, err);
    }
};
exports.deleteIfExists = deleteIfExists;
const randomFileName = (ext) => crypto_1.default.randomBytes(20).toString("hex") + ext;
const saveCompressedImage = async (file) => {
    if (!file) {
        throw new Error("No file provided for compression.");
    }
    try {
        const ext = path_1.default.extname(file.originalname).toLowerCase() || ".png";
        const fileName = randomFileName(ext);
        const key = `images/${fileName}`; // folder in your Space
        const baseSharp = file.buffer
            ? (0, sharp_1.default)(file.buffer)
            : (0, sharp_1.default)(file.path);
        let compressedBuffer;
        if (ext === ".jpg" || ext === ".jpeg") {
            compressedBuffer = await baseSharp
                .resize(1200, undefined, { withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toBuffer();
        }
        else if (ext === ".png") {
            compressedBuffer = await baseSharp
                .resize(1200, undefined, { withoutEnlargement: true })
                .png({ compressionLevel: 8 })
                .toBuffer();
        }
        else if (ext === ".webp") {
            compressedBuffer = await baseSharp
                .resize(1200, undefined, { withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();
        }
        else {
            compressedBuffer = await baseSharp
                .resize(1200, undefined, { withoutEnlargement: true })
                .png({ compressionLevel: 8 })
                .toBuffer();
        }
        // If file came from disk, remove temp file
        if (file.path) {
            try {
                fs_1.default.unlinkSync(file.path);
            }
            catch (err) {
                console.warn("⚠ Failed to delete temp file:", err);
            }
        }
        // Upload to S3 / Spaces
        await exports.s3.send(new client_s3_1.PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: compressedBuffer,
            ContentType: file.mimetype,
            ACL: "public-read",
        }));
        const fileUrl = `${S3_BASE_URL}/${key}`;
        return {
            filePath: key, // S3 object key
            fileUrl, // public URL (store in DB)
        };
    }
    catch (err) {
        console.error("❌ Image compression/upload failed:", err);
        throw new Error("Failed to save compressed image");
    }
};
exports.saveCompressedImage = saveCompressedImage;
