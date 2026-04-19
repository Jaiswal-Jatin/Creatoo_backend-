/**
 * Module: Backend (API Server)
 * File Purpose: Business Routes. Defines endpoints for business management, discounts, and associates.
 * Used By: Business Admin App, Admin Panel
 * API Connected: /api/business/*
 * Database Model: User (Business role), BusinessAssociate
 * Critical: Yes
 * Notes: Protected by authJwt and adminOnly middlewares where applicable.
 */
import { Router } from "express";
import BusinessController from "../controllers/BusinessController";
import { authJwt } from "../middleware/authJwt";
import { adminOnly } from "../middleware/adminOnly";
import multer from "multer";

const router = Router();

// Memory storage (NO LOCAL SAVE)
const upload = multer({ storage: multer.memoryStorage() });

// Prefix: /api/business

/**
 * Route: POST /api/business/setDiscount
 * Role: Business Admin / Admin
 * Description: Sets discount percentages and minimum order requirements.
 */
router.post("/setDiscount", authJwt,  BusinessController.setDiscount);

/**
 * Route: POST /api/business/businessDescription
 * Role: Business Admin / Admin
 * Description: Updates business profile details including images and menu cards.
 */
router.post(
  "/businessDescription",
  authJwt,
  upload.fields([
    { name: "business_image", maxCount: 1 },

    { name: "menu_card_1", maxCount: 1 },
    { name: "menu_card_2", maxCount: 1 },
    { name: "menu_card_3", maxCount: 1 },
    { name: "menu_card_4", maxCount: 1 },
    { name: "menu_card_5", maxCount: 1 },

    { name: "business_image_1", maxCount: 1 },
    { name: "business_image_2", maxCount: 1 },
    { name: "business_image_3", maxCount: 1 },
    { name: "business_image_4", maxCount: 1 },
    { name: "business_image_5", maxCount: 1 },
  ]),
  BusinessController.businessDescription
);

/**
 * Route: POST /api/business/getBusinessList
 * Role: Shared
 * Description: Searches for businesses by name.
 */
router.post("/getBusinessList", authJwt, BusinessController.getBusinessList);

/**
 * Route: POST /api/business/customerSummary
 * Role: Business Admin / Admin
 * Description: Provides a summary of customers, visits, and spending for a business.
 */
router.post("/customerSummary", authJwt, BusinessController.customerSummary);

// Associate management routes (admin only)
/**
 * Route: POST /api/business/addAssociate
 * Role: Admin
 * Description: Links an associate business to a parent business.
 */
router.post("/addAssociate", authJwt, adminOnly, BusinessController.addAssociate);

/**
 * Route: POST /api/business/editAssociateDetails
 * Role: Admin
 * Description: Edis details of an associate business.
 */
router.post("/editAssociateDetails", authJwt, adminOnly, BusinessController.editAssociateDetails);

/**
 * Route: POST /api/business/removeAssociate
 * Role: Admin
 * Description: Unlinks an associate business from a parent business.
 */
router.post("/removeAssociate", authJwt, adminOnly, BusinessController.removeAssociate);

// Associate viewing routes (admin or business owner)
/**
 * Route: POST /api/business/getAssociates
 * Role: Business Admin / Admin
 * Description: Retrieves all associates (parent, children, siblings) for a business.
 */
router.post("/getAssociates", authJwt, BusinessController.getAssociates);

/**
 * Route: POST /api/business/getParentAssociations
 * Role: Business Admin / Admin
 * Description: Retrieves parent-child relationships for businesses.
 */
router.post("/getParentAssociations", authJwt, BusinessController.getParentAssociations);

/**
 * Route: POST /api/business/getAssociateSummary
 * Role: Business Admin / Admin
 * Description: Provides transaction summary for the associate network.
 */
router.post("/getAssociateSummary", authJwt, BusinessController.getAssociateSummary);

// Associate visit tracking routes
/**
 * Route: POST /api/business/associateNetworkHistory
 * Role: Business Admin / Admin
 * Description: Tracks visit history across the entire associate network.
 */
router.post("/associateNetworkHistory", authJwt, BusinessController.associateNetworkHistory);

/**
 * Route: POST /api/business/associateOnlyHistory
 * Role: Business Admin / Admin
 * Description: Tracks visit history specifically for associates.
 */
router.post("/associateOnlyHistory", authJwt, BusinessController.associateOnlyHistory);

// Admin only routes
/**
 * Route: POST /api/business/getAllBusinesses
 * Role: Admin
 * Description: Lists all registered businesses.
 */
router.post("/getAllBusinesses", authJwt, adminOnly, BusinessController.getAllBusinesses);

export default router;
