"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Banner Routes. Endpoints for managing app banners.
 * Used By: Admin Panel
 * API Connected: /api/banner/*
 * Database Model: Banner
 * Critical: Yes
 */
const express_1 = require("express");
const BannerController_1 = __importDefault(require("../controllers/BannerController"));
const upload_1 = require("../middleware/upload");
const authJwt_1 = require("../middleware/authJwt");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
/**
 * Route: GET /api/banner/all
 * Role: Admin
 * Description: Fetches all banners for list display.
 */
router.get("/all", authJwt_1.authJwt, BannerController_1.default.getAllBannerService);
/**
 * Route: POST /api/banner/add
 * Role: Admin
 * Description: Adds a new banner with image upload.
 */
router.post("/add", authJwt_1.authJwt, adminOnly_1.adminOnly, upload_1.uploadImage, BannerController_1.default.addBanner);
/**
 * Route: GET /api/banner/add
 * Role: Admin
 * Description: Placeholder for add banner view.
 */
router.get("/add", authJwt_1.authJwt, adminOnly_1.adminOnly, BannerController_1.default.bannerView);
/**
 * Route: GET /api/banner/edit/:id
 * Role: Admin
 * Description: Fetches data for editing a specific banner.
 */
router.get("/edit/:id", authJwt_1.authJwt, BannerController_1.default.getEditBanner);
/**
 * Route: POST /api/banner/edit/:id
 * Role: Admin
 * Description: Updates an existing banner, including optional new image.
 */
router.post("/edit/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, upload_1.uploadImage, BannerController_1.default.updateBanner);
/**
 * Route: GET /api/banner/delete/:id
 * Role: Admin
 * Description: Deletes a banner and its associated image from disk.
 */
router.get("/delete/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, BannerController_1.default.deleteBanner);
/**
 * Route: POST /api/banner/change-status
 * Role: Admin
 * Description: Toggles banner active/inactive status.
 */
router.post("/change-status", authJwt_1.authJwt, adminOnly_1.adminOnly, BannerController_1.default.changeStatus);
exports.default = router;
