"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PlanController_1 = __importDefault(require("../controllers/PlanController"));
const authJwt_1 = require("../middleware/authJwt");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
// Prefix: /api/admin/subscription/plan
// GET /api/admin/subscription/plan
router.get("/", PlanController_1.default.getPlans);
// POST /api/admin/subscription/plan
router.post("/", authJwt_1.authJwt, adminOnly_1.adminOnly, PlanController_1.default.createPlan);
// PATCH /api/admin/subscription/plan/:id
router.patch("/:id", authJwt_1.authJwt, adminOnly_1.adminOnly, PlanController_1.default.updatePlan);
exports.default = router;
