"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Exclusive Offer Routes. Manages business-specific multi-image offers.
 * Used By: Admin Panel, Business Admin App
 * API Connected: /api/exclusiveOffer/*
 * Database Model: ExclusiveOffer
 * Critical: Yes
 */
const express_1 = require("express");
const ExclusiveOfferController_1 = __importDefault(require("../controllers/ExclusiveOfferController"));
const uploadExclusiveImages_1 = require("../middleware/uploadExclusiveImages");
const authJwt_1 = require("../middleware/authJwt");
const router = (0, express_1.Router)();
/**
 * Route: GET /api/exclusiveOffer/all
 * Role: Admin
 * Description: Lists all exclusive offers in the system.
 */
router.get("/all", authJwt_1.authJwt, ExclusiveOfferController_1.default.getAll);
/**
 * Route: GET /api/exclusiveOffer/by-business
 * Role: Business Admin
 * Description: Fetches the exclusive offer for the authenticated business.
 */
router.get("/by-business", authJwt_1.authJwt, ExclusiveOfferController_1.default.getByBusiness);
/**
 * Route: GET /api/exclusiveOffer/by-business/:businessId
 * Role: Admin
 * Description: Fetches an exclusive offer by business ID (Admin view).
 */
router.get("/by-business/:businessId", authJwt_1.authJwt, ExclusiveOfferController_1.default.getByBusinessId);
/**
 * Route: POST /api/exclusiveOffer/save
 * Role: Business Admin
 * Description: Creates or updates an exclusive offer with multi-image sections.
 */
router.post("/save", authJwt_1.authJwt, uploadExclusiveImages_1.uploadExclusiveImages, ExclusiveOfferController_1.default.saveByBusiness);
/**
 * Route: DELETE /api/exclusiveOffer/:id
 * Role: Business Admin
 * Description: Deletes a specific exclusive offer record.
 */
router.delete("/:id", authJwt_1.authJwt, ExclusiveOfferController_1.default.deleteOffer);
/**
 * Route: DELETE /api/exclusiveOffer/:id/image
 * Role: Business Admin
 * Description: Deletes a single image from a specific offer section.
 */
router.delete("/:id/image", authJwt_1.authJwt, ExclusiveOfferController_1.default.deleteOneImage);
exports.default = router;
