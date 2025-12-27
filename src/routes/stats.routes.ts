// src/routes/adminStats.ts
import { Router } from "express";
import StatsController from "../controllers/StatsController";
import { authJwt } from "../middleware/authJwt";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

router.get(
  "/overallStats",
  authJwt,
  adminOnly,
  (req, res) => StatsController.overallStats(req, res)
);

router.get(
  "/overallBusinessStats",
  authJwt,
  adminOnly,
  (req, res) => StatsController.overallBusinessStats(req, res)
);

// NEW: discount stats per user
router.get(
  "/discountStatsByUser",
  authJwt,
  adminOnly,
  (req, res) => StatsController.discountStatsByUser(req, res)
);

// NEW: discount stats per business
router.get(
  "/discountStatsByBusiness",
  authJwt,
  adminOnly,
  (req, res) => StatsController.discountStatsByBusiness(req, res)
);


router.get(
  "/pointsStatsByUser",
  authJwt,
  adminOnly,
  (req, res) => StatsController.pointsStatsByUser(req, res)
);

router.get(
  "/pointsStatsByBusiness",
  authJwt,
  adminOnly,
  (req, res) => StatsController.pointsStatsByBusiness(req, res)
);

router.get(
  "/cardsStats",
  authJwt,
  adminOnly,
  (req, res) => StatsController.cardsStats(req, res)
);

export default router;
