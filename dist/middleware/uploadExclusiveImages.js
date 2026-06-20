"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadExclusiveImages = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const storage = multer_1.default.memoryStorage(); // we keep compressed saving in controller
const fileFilter = (_req, file, cb) => {
    const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg", "application/octet-stream"];
    const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    const fileExt = path_1.default.extname(file.originalname).toLowerCase();
    const isAllowedMime = allowedMime.includes(file.mimetype);
    const isAllowedExt = allowedExts.includes(fileExt);
    if (!isAllowedMime && !isAllowedExt) {
        return cb(new Error("Only JPEG, PNG, WEBP, GIF images are allowed!"));
    }
    cb(null, true);
};
exports.uploadExclusiveImages = (0, multer_1.default)({
    storage,
    fileFilter,
}).fields([
    { name: "premium", maxCount: 20 }, // ⬅ UPDATED
    { name: "elite", maxCount: 20 }, // ⬅ UPDATED
    { name: "core", maxCount: 20 }, // ⬅ UPDATED
]);
