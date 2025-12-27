import { Router } from "express";
import PlanController from "../controllers/PlanController";
import { authJwt } from "../middleware/authJwt";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

// Prefix: /api/admin/subscription/plan

// GET /api/admin/subscription/plan
router.get("/", PlanController.getPlans);

// POST /api/admin/subscription/plan
router.post("/", authJwt, adminOnly, PlanController.createPlan);

// PATCH /api/admin/subscription/plan/:id
router.patch("/:id", authJwt, adminOnly, PlanController.updatePlan);

export default router;
