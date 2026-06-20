"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/creatooRequest.routes.ts
const express_1 = require("express");
const CreatooRequestController_1 = __importDefault(require("../controllers/CreatooRequestController"));
const authJwt_1 = require("../middleware/authJwt");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
const uploadDir = path_1.default.join(__dirname, "../../uploads/images");
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, uploadDir);
    },
    filename: function (_req, file, cb) {
        const ext = path_1.default.extname(file.originalname);
        const base = path_1.default.basename(file.originalname, ext);
        cb(null, `${base}-${Date.now()}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});
router.get("/all", authJwt_1.authJwt, (req, res) => CreatooRequestController_1.default.getAllCreatooRequestService(req, res));
router.get("/allRedeem", authJwt_1.authJwt, (req, res) => CreatooRequestController_1.default.getAllCreatooRedeemService(req, res));
router.post("/change-status", authJwt_1.authJwt, (req, res) => CreatooRequestController_1.default.changeStatus(req, res));
router.post("/update-bill-amount", authJwt_1.authJwt, (req, res) => CreatooRequestController_1.default.updateBillAmount(req, res));
router.post("/", authJwt_1.authJwt, upload.single("image"), (req, res) => CreatooRequestController_1.default.creatooRequest(req, res));
exports.default = router;
