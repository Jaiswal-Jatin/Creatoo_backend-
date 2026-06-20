/**
 * Module: Backend (API Server)
 * File Purpose: Setting Routes. Manages global platform and business-specific loyalty settings.
 * Used By: Admin Panel, Business Admin App
 * API Connected: /api/setting/*
 * Database Model: Setting, User
 * Critical: Yes
 */
import { Router } from "express";
import SettingController from "../controllers/SettingController";
import { authJwt } from "../middleware/authJwt";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

/**
 * Route: GET /api/setting/edit/:id
 * Role: Admin
 * Description: Fetches global settings for editing.
 */
router.get("/edit/:id", authJwt, adminOnly, SettingController.getEditSetting);

/**
 * Route: PUT /api/setting/edit/:id
 * Role: Admin
 * Description: Updates global settings (platform fees, etc.).
 */
router.put("/edit/:id", authJwt, adminOnly, SettingController.updateSetting);

/**
 * Route: POST /api/setting/setting
 * Role: Business Admin
 * Description: Retrieves business-specific settings (GST, etc.).
 */
router.post(
  "/setting",
  authJwt,
  (req, res) => SettingController.getBusinessSetting(req, res)
);

/**
 * Route: POST /api/setting/businessSetting
 * Role: Business Admin
 * Description: Updates business-specific loyalty settings (discounts, expiry).
 */
router.post(
  "/businessSetting",
  authJwt,
  (req, res) => SettingController.updateBusinessSetting(req, res)
);

/**
 * Route: POST /api/setting/getBusinessSetting
 * Role: Business Admin
 * Description: Detailed retrieval of business loyalty configs.
 */
router.post(
  "/getBusinessSetting",
  authJwt,
  (req, res) => SettingController.getBusinessSettingDetails(req, res)
);

/**
 * Route: GET /api/setting/advance-payment
 * Role: Admin
 * Description: Get advance payment settings (platform fee & GST).
 */
router.get(
  "/advance-payment",
  authJwt,
  adminOnly,
  (req, res) => SettingController.getAdvancePaymentSettings(req, res)
);

/**
 * Route: PUT /api/setting/advance-payment
 * Role: Admin
 * Description: Update advance payment settings (platform fee & GST).
 */
router.put(
  "/advance-payment",
  authJwt,
  adminOnly,
  (req, res) => SettingController.updateAdvancePaymentSettings(req, res)
);

/**
 * Route: GET /api/setting/advance-payment/public
 * Role: Public (authenticated user)
 * Description: Get advance payment settings for mobile app display.
 */
router.get(
  "/advance-payment/public",
  authJwt,
  (req, res) => SettingController.getAdvancePaymentSettings(req, res)
);

export default router;
