import { Router } from "express";
import BannerController from "../controllers/BannerController";
import { uploadImage } from "../middleware/upload";
import { authJwt } from "../middleware/authJwt";     
import { adminOnly } from "../middleware/adminOnly"; 

const router = Router();

// Prefix: /api/bannerQQ

router.get("/all", authJwt,  BannerController.getAllBannerService);

router.post("/add", authJwt, adminOnly, uploadImage, BannerController.addBanner);

router.get("/add", authJwt, adminOnly, BannerController.bannerView);

router.get("/edit/:id", authJwt,  BannerController.getEditBanner);

router.post("/edit/:id", authJwt, adminOnly, uploadImage, BannerController.updateBanner);

router.get("/delete/:id", authJwt, adminOnly, BannerController.deleteBanner);

router.post("/change-status", authJwt, adminOnly, BannerController.changeStatus);

export default router;
