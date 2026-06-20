"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImage = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const storage_service_1 = require("../services/storage.service");
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        // temp upload goes to <UPLOAD_DIR>/temp
        const dir = path_1.default.join((0, storage_service_1.getUploadRoot)(), "temp");
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/\s+/g, "_");
        cb(null, `${timestamp}-${safeName}`);
    },
});
exports.uploadImage = (0, multer_1.default)({
    storage,
    fileFilter: (_req, file, cb) => {
        const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg", "application/octet-stream"];
        const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
        const fileExt = path_1.default.extname(file.originalname).toLowerCase();
        const isAllowedMime = allowedMime.includes(file.mimetype);
        const isAllowedExt = allowedExts.includes(fileExt);
        if (!isAllowedMime && !isAllowedExt) {
            return cb(new Error("Only image files are allowed!"));
        }
        cb(null, true);
    }
}).single("image");
