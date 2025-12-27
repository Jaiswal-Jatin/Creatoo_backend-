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
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only image files are allowed!"));
    }

    cb(null, true);
  }
}).single("image");
