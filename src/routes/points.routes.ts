/**
 * Module: Backend (API Server)
 * File Purpose: Points Routes. Handles loyalty points tracking and transfers.
 * Used By: Admin Panel, User Mobile App, Business Admin App
 * API Connected: /api/points/*
 * Database Model: CreatorPointsTransaction
 * Critical: Yes
 */
import { Router } from "express";
import PointsController from "../controllers/PointsController";
import { authJwt } from "../middleware/authJwt";

const router = Router();

/**
 * Route: POST /api/points/creatooPointsTransaction
 * Role: Creator
 * Description: Fetches loyalty points transactions for a creator.
 */
router.post(
  "/creatooPointsTransaction",
  authJwt,
  (req, res) => PointsController.creatooPointsTransaction(req, res)
);

/**
 * Route: POST /api/points/businessPointsTransaction
 * Role: Business Admin
 * Description: Fetches loyalty points transactions for a specific business.
 */
router.post(
  "/businessPointsTransaction",
  authJwt,
  (req, res) => PointsController.businessPointsTransaction(req, res)
);

/**
 * Route: POST /api/points/validateCreatooPoints
 * Role: Shared
 * Description: Validates points before a transaction or transfer.
 */
router.post(
  "/validateCreatooPoints",
  authJwt,
  (req, res) => PointsController.validateCreatooPoints(req, res)
);

/**
 * Route: POST /api/points/transferCreatooPoints
 * Role: Business Admin
 * Description: Transfers points from a business to a creator.
 */
router.post(
  "/transferCreatooPoints",
  authJwt,
  (req, res) => PointsController.transferCreatooPoints(req, res)
);

/**
 * Route: POST /api/points/getBusinessBonusInfo
 * Role: Creator
 * Description: Check if user's first visit to a business and return signup bonus info.
 */
router.post(
  "/getBusinessBonusInfo",
  authJwt,
  (req, res) => PointsController.getBusinessBonusInfo(req, res)
);

/**
 * Route: POST /api/points/calculateLoyaltyDiscount
 * Role: Creator
 * Description: Calculate loyalty discount with platform fee deduction.
 */
router.post(
  "/calculateLoyaltyDiscount",
  authJwt,
  (req, res) => PointsController.calculateLoyaltyDiscount(req, res)
);

export default router;
