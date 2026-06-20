import multer from "multer";
import path from "path";

const storage = multer.memoryStorage(); // we keep compressed saving in controller

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg", "application/octet-stream"];
  const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

  const fileExt = path.extname(file.originalname).toLowerCase();
  const isAllowedMime = allowedMime.includes(file.mimetype);
  const isAllowedExt = allowedExts.includes(fileExt);

  if (!isAllowedMime && !isAllowedExt) {
    return cb(new Error("Only JPEG, PNG, WEBP, GIF images are allowed!"));
  }

  cb(null, true);
};

export const uploadExclusiveImages = multer({
  storage,
  fileFilter,

}).fields([
  { name: "premium", maxCount: 20}, // ⬅ UPDATED
  { name: "elite", maxCount: 20 },   // ⬅ UPDATED
  { name: "core", maxCount: 20 },    // ⬅ UPDATED
]);
