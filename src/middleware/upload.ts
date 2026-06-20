import multer from "multer";
import path from "path";
import fs from "fs";
import { getUploadRoot } from "../services/storage.service";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // temp upload goes to <UPLOAD_DIR>/temp
    const dir = path.join(getUploadRoot(), "temp");

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },

  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${timestamp}-${safeName}`);
  },
});

export const uploadImage = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg", "application/octet-stream"];
    const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

    const fileExt = path.extname(file.originalname).toLowerCase();
    const isAllowedMime = allowedMime.includes(file.mimetype);
    const isAllowedExt = allowedExts.includes(fileExt);

    if (!isAllowedMime && !isAllowedExt) {
      return cb(new Error("Only image files are allowed!"));
    }

    cb(null, true);
  }
}).single("image");
