"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Stats Routes. Analytics endpoints for the Admin Panel.
 * Used By: Admin Panel
 * API Connected: /api/stats/*
 * Database Model: Multi-model (Visit, Card, CreatorPointsTransaction, etc.)
 * Critical: No
 */
const express_1 = require("express");
const StatsController_1 = __importDefault(require("../controllers/StatsController"));
const authJwt_1 = require("../middleware/authJwt");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
/**
 * Route: GET /api/stats/overallStats
 * Role: Admin
 * Description: Fetches high-level totals for users, visits, and points.
 */
router.get("/overallStats", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => StatsController_1.default.overallStats(req, res));
/**
 * Route: GET /api/stats/overallBusinessStats
 * Role: Admin
 * Description: Fetches high-level totals for businesses.
 */
router.get("/overallBusinessStats", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => StatsController_1.default.overallBusinessStats(req, res));
/**
 * Route: GET /api/stats/discountStatsByUser
 * Role: Admin
 * Description: Retrieves detailed discount usage reports per user.
 */
router.get("/discountStatsByUser", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => StatsController_1.default.discountStatsByUser(req, res));
/**
 * Route: GET /api/stats/discountStatsByBusiness
 * Role: Admin
 * Description: Retrieves detailed discount usage reports per business.
 */
router.get("/discountStatsByBusiness", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => StatsController_1.default.discountStatsByBusiness(req, res));
/**
 * Route: GET /api/stats/pointsStatsByUser
 * Role: Admin
 * Description: Reports on point accrual and redemption per user.
 */
router.get("/pointsStatsByUser", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => StatsController_1.default.pointsStatsByUser(req, res));
/**
 * Route: GET /api/stats/pointsStatsByBusiness
 * Role: Admin
 * Description: Reports on point accrual and redemption per business.
 */
router.get("/pointsStatsByBusiness", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => StatsController_1.default.pointsStatsByBusiness(req, res));
/**
 * Route: GET /api/stats/cardsStats
 * Role: Admin
 * Description: Summarizes loyalty card status and distribution.
 */
router.get("/cardsStats", authJwt_1.authJwt, adminOnly_1.adminOnly, (req, res) => StatsController_1.default.cardsStats(req, res));
exports.default = router;
