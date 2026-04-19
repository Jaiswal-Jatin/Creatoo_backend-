/**
 * Module: Backend (API Server)
 * File Purpose: Exclusive Offer Routes. Manages business-specific multi-image offers.
 * Used By: Admin Panel, Business Admin App
 * API Connected: /api/exclusiveOffer/*
 * Database Model: ExclusiveOffer
 * Critical: Yes
 */
import { Router } from "express";
import ExclusiveOfferController from "../controllers/ExclusiveOfferController";
import { uploadExclusiveImages } from "../middleware/uploadExclusiveImages";
import { authJwt } from "../middleware/authJwt";

const router = Router();

/**
 * Route: GET /api/exclusiveOffer/all
 * Role: Admin
 * Description: Lists all exclusive offers in the system.
 */
router.get("/all", authJwt, ExclusiveOfferController.getAll);

/**
 * Route: GET /api/exclusiveOffer/by-business
 * Role: Business Admin
 * Description: Fetches the exclusive offer for the authenticated business.
 */
router.get("/by-business", authJwt, ExclusiveOfferController.getByBusiness);

/**
 * Route: GET /api/exclusiveOffer/by-business/:businessId
 * Role: Admin
 * Description: Fetches an exclusive offer by business ID (Admin view).
 */
router.get(
  "/by-business/:businessId",
  authJwt,
  ExclusiveOfferController.getByBusinessId
);

/**
 * Route: POST /api/exclusiveOffer/save
 * Role: Business Admin
 * Description: Creates or updates an exclusive offer with multi-image sections.
 */
router.post(
  "/save",
  authJwt,
  uploadExclusiveImages,
  ExclusiveOfferController.saveByBusiness
);

/**
 * Route: DELETE /api/exclusiveOffer/:id
 * Role: Business Admin
 * Description: Deletes a specific exclusive offer record.
 */
router.delete("/:id", authJwt, ExclusiveOfferController.deleteOffer);

/**
 * Route: DELETE /api/exclusiveOffer/:id/image
 * Role: Business Admin
 * Description: Deletes a single image from a specific offer section.
 */
router.delete("/:id/image", authJwt, ExclusiveOfferController.deleteOneImage);

export default router;
