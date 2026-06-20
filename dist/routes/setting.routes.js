"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Setting Routes. Manages global platform and business-specific loyalty settings.
 * Used By: Admin Panel, Business Admin App
 * API Connected: /api/setting/*
 * Database Model: Setting, User
 * Critical: Yes
 */
const express_1 = require("express");
const SettingController_1 = __importDefault(require("../controllers/SettingController"));
const authJwt_1 = require("../middleware/authJwt");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
/**
 * Route: GET /api/setting/edit/:id
 * Role: Admin
 * Description: Fetches global settings for editing.
 */
router.get("/edit/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, SettingController_1.default.getEditSetting);
/**
 * Route: PUT /api/setting/edit/:id
 * Role: Admin
 * Description: Updates global settings (platform fees, etc.).
 */
router.put("/edit/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, SettingController_1.default.updateSetting);
/**
 * Route: POST /api/setting/setting
 * Role: Business Admin
 * Description: Retrieves business-specific settings (GST, etc.).
 */
router.post("/setting", authJwt_1.authJwt, (req, res) => SettingController_1.default.getBusinessSetting(req, res));
/**
 * Route: POST /api/setting/businessSetting
 * Role: Business Admin
 * Description: Updates business-specific loyalty settings (discounts, expiry).
 */
router.post("/businessSetting", authJwt_1.authJwt, (req, res) => SettingController_1.default.updateBusinessSetting(req, res));
/**
 * Route: POST /api/setting/getBusinessSetting
 * Role: Business Admin
 * Description: Detailed retrieval of business loyalty configs.
 */
router.post("/getBusinessSetting", authJwt_1.authJwt, (req, res) => SettingController_1.default.getBusinessSettingDetails(req, res));
/**
 * Route: GET /api/setting/advance-payment
 * Role: Admin
 * Description: Get advance payment settings (platform fee & GST).
 */
router.get("/advance-payment", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => SettingController_1.default.getAdvancePaymentSettings(req, res));
/**
 * Route: PUT /api/setting/advance-payment
 * Role: Admin
 * Description: Update advance payment settings (platform fee & GST).
 */
router.put("/advance-payment", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => SettingController_1.default.updateAdvancePaymentSettings(req, res));
/**
 * Route: GET /api/setting/advance-payment/public
 * Role: Public (authenticated user)
 * Description: Get advance payment settings for mobile app display.
 */
router.get("/advance-payment/public", authJwt_1.authJwt, (req, res) => SettingController_1.default.getAdvancePaymentSettings(req, res));
exports.default = router;
