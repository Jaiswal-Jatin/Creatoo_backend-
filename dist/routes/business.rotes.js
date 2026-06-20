"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Business Routes. Defines endpoints for business management, discounts, and associates.
 * Used By: Business Admin App, Admin Panel
 * API Connected: /api/business/*
 * Database Model: User (Business role), BusinessAssociate
 * Critical: Yes
 * Notes: Protected by authJwt and adminOnly middlewares where applicable.
 */
const express_1 = require("express");
const BusinessController_1 = __importDefault(require("../controllers/BusinessController"));
const authJwt_1 = require("../middleware/authJwt");
const adminOnly_1 = require("../middleware/adminOnly");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
// Memory storage (NO LOCAL SAVE)
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Prefix: /api/business
/**
 * Route: POST /api/business/setDiscount
 * Role: Business Admin / Admin
 * Description: Sets discount percentages and minimum order requirements.
 */
router.post("/setDiscount", authJwt_1.authJwt, BusinessController_1.default.setDiscount);
/**
 * Route: POST /api/business/businessDescription
 * Role: Business Admin / Admin
 * Description: Updates business profile details including images and menu cards.
 */
router.post("/businessDescription", authJwt_1.authJwt, upload.fields([
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
]), BusinessController_1.default.businessDescription);
/**
 * Route: POST /api/business/getBusinessList
 * Role: Shared
 * Description: Searches for businesses by name.
 */
router.post("/getBusinessList", authJwt_1.authJwt, BusinessController_1.default.getBusinessList);
/**
 * Route: POST /api/business/customerSummary
 * Role: Business Admin / Admin
 * Description: Provides a summary of customers, visits, and spending for a business.
 */
router.post("/customerSummary", authJwt_1.authJwt, BusinessController_1.default.customerSummary);
// Associate management routes (admin only)
/**
 * Route: POST /api/business/addAssociate
 * Role: Admin
 * Description: Links an associate business to a parent business.
 */
router.post("/addAssociate", authJwt_1.authJwt, adminOnly_1.adminOnly, BusinessController_1.default.addAssociate);
/**
 * Route: POST /api/business/editAssociateDetails
 * Role: Admin
 * Description: Edis details of an associate business.
 */
router.post("/editAssociateDetails", authJwt_1.authJwt, adminOnly_1.adminOnly, BusinessController_1.default.editAssociateDetails);
/**
 * Route: POST /api/business/removeAssociate
 * Role: Admin
 * Description: Unlinks an associate business from a parent business.
 */
router.post("/removeAssociate", authJwt_1.authJwt, adminOnly_1.adminOnly, BusinessController_1.default.removeAssociate);
// Associate viewing routes (admin or business owner)
/**
 * Route: POST /api/business/getAssociates
 * Role: Business Admin / Admin
 * Description: Retrieves all associates (parent, children, siblings) for a business.
 */
router.post("/getAssociates", authJwt_1.authJwt, BusinessController_1.default.getAssociates);
/**
 * Route: POST /api/business/getParentAssociations
 * Role: Business Admin / Admin
 * Description: Retrieves parent-child relationships for businesses.
 */
router.post("/getParentAssociations", authJwt_1.authJwt, BusinessController_1.default.getParentAssociations);
/**
 * Route: POST /api/business/getAssociateSummary
 * Role: Business Admin / Admin
 * Description: Provides transaction summary for the associate network.
 */
router.post("/getAssociateSummary", authJwt_1.authJwt, BusinessController_1.default.getAssociateSummary);
// Associate visit tracking routes
/**
 * Route: POST /api/business/associateNetworkHistory
 * Role: Business Admin / Admin
 * Description: Tracks visit history across the entire associate network.
 */
router.post("/associateNetworkHistory", authJwt_1.authJwt, BusinessController_1.default.associateNetworkHistory);
/**
 * Route: POST /api/business/associateOnlyHistory
 * Role: Business Admin / Admin
 * Description: Tracks visit history specifically for associates.
 */
router.post("/associateOnlyHistory", authJwt_1.authJwt, BusinessController_1.default.associateOnlyHistory);
// Admin only routes
/**
 * Route: POST /api/business/getAllBusinesses
 * Role: Admin
 * Description: Lists all registered businesses.
 */
router.post("/getAllBusinesses", authJwt_1.authJwt, adminOnly_1.adminOnly, BusinessController_1.default.getAllBusinesses);
exports.default = router;
