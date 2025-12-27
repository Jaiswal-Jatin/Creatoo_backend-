// src/routes/creatooRequest.routes.ts
import { Router } from "express";
import CreatooRequestController from "../controllers/CreatooRequestController";
import { authJwt } from "../middleware/authJwt";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const uploadDir = path.join(__dirname, "../../uploads/images");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});


router.get(
  "/all",
  authJwt,
  (req, res) => CreatooRequestController.getAllCreatooRequestService(req, res)
);

router.get(
  "/allRedeem",
  authJwt,
  (req, res) => CreatooRequestController.getAllCreatooRedeemService(req, res)
);

router.post(
  "/change-status",
  authJwt,
  (req, res) => CreatooRequestController.changeStatus(req, res)
);

router.post(
  "/update-bill-amount",
  authJwt,
  (req, res) => CreatooRequestController.updateBillAmount(req, res)
);

router.post(
  "/",
  authJwt,
  upload.single("image"),
  (req, res) => CreatooRequestController.creatooRequest(req, res)
);

export default router;
