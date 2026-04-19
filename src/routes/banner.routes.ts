/**
 * Module: Backend (API Server)
 * File Purpose: Banner Routes. Endpoints for managing app banners.
 * Used By: Admin Panel
 * API Connected: /api/banner/*
 * Database Model: Banner
 * Critical: Yes
 */
import { Router } from "express";
import BannerController from "../controllers/BannerController";
import { uploadImage } from "../middleware/upload";
import { authJwt } from "../middleware/authJwt";     
import { adminOnly } from "../middleware/adminOnly"; 

const router = Router();

/**
 * Route: GET /api/banner/all
 * Role: Admin
 * Description: Fetches all banners for list display.
 */
router.get("/all", authJwt,  BannerController.getAllBannerService);

/**
 * Route: POST /api/banner/add
 * Role: Admin
 * Description: Adds a new banner with image upload.
 */
router.post("/add", authJwt, adminOnly, uploadImage, BannerController.addBanner);

/**
 * Route: GET /api/banner/add
 * Role: Admin
 * Description: Placeholder for add banner view.
 */
router.get("/add", authJwt, adminOnly, BannerController.bannerView);

/**
 * Route: GET /api/banner/edit/:id
 * Role: Admin
 * Description: Fetches data for editing a specific banner.
 */
router.get("/edit/:id", authJwt,  BannerController.getEditBanner);

/**
 * Route: POST /api/banner/edit/:id
 * Role: Admin
 * Description: Updates an existing banner, including optional new image.
 */
router.post("/edit/:id", authJwt, adminOnly, uploadImage, BannerController.updateBanner);

/**
 * Route: GET /api/banner/delete/:id
 * Role: Admin
 * Description: Deletes a banner and its associated image from disk.
 */
router.get("/delete/:id", authJwt, adminOnly, BannerController.deleteBanner);

/**
 * Route: POST /api/banner/change-status
 * Role: Admin
 * Description: Toggles banner active/inactive status.
 */
router.post("/change-status", authJwt, adminOnly, BannerController.changeStatus);

export default router;
