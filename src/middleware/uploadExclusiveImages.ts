import multer from "multer";

const storage = multer.memoryStorage(); // we keep compressed saving in controller

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (!allowed.includes(file.mimetype)) {
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
