/**
 * Module: Backend (API Server)
 * File Purpose: Stats Routes. Analytics endpoints for the Admin Panel.
 * Used By: Admin Panel
 * API Connected: /api/stats/*
 * Database Model: Multi-model (Visit, Card, CreatorPointsTransaction, etc.)
 * Critical: No
 */
import { Router } from "express";
import StatsController from "../controllers/StatsController";
import { authJwt } from "../middleware/authJwt";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

/**
 * Route: GET /api/stats/overallStats
 * Role: Admin
 * Description: Fetches high-level totals for users, visits, and points.
 */
router.get(
  "/overallStats",
  authJwt,
  adminOnly,
  (req, res) => StatsController.overallStats(req, res)
);

/**
 * Route: GET /api/stats/overallBusinessStats
 * Role: Admin
 * Description: Fetches high-level totals for businesses.
 */
router.get(
  "/overallBusinessStats",
  authJwt,
  adminOnly,
  (req, res) => StatsController.overallBusinessStats(req, res)
);

/**
 * Route: GET /api/stats/discountStatsByUser
 * Role: Admin
 * Description: Retrieves detailed discount usage reports per user.
 */
router.get(
  "/discountStatsByUser",
  authJwt,
  adminOnly,
  (req, res) => StatsController.discountStatsByUser(req, res)
);

/**
 * Route: GET /api/stats/discountStatsByBusiness
 * Role: Admin
 * Description: Retrieves detailed discount usage reports per business.
 */
router.get(
  "/discountStatsByBusiness",
  authJwt,
  adminOnly,
  (req, res) => StatsController.discountStatsByBusiness(req, res)
);

/**
 * Route: GET /api/stats/pointsStatsByUser
 * Role: Admin
 * Description: Reports on point accrual and redemption per user.
 */
router.get(
  "/pointsStatsByUser",
  authJwt,
  adminOnly,
  (req, res) => StatsController.pointsStatsByUser(req, res)
);

/**
 * Route: GET /api/stats/pointsStatsByBusiness
 * Role: Admin
 * Description: Reports on point accrual and redemption per business.
 */
router.get(
  "/pointsStatsByBusiness",
  authJwt,
  adminOnly,
  (req, res) => StatsController.pointsStatsByBusiness(req, res)
);

/**
 * Route: GET /api/stats/cardsStats
 * Role: Admin
 * Description: Summarizes loyalty card status and distribution.
 */
router.get(
  "/cardsStats",
  authJwt,
  adminOnly,
  (req, res) => StatsController.cardsStats(req, res)
);

export default router;
