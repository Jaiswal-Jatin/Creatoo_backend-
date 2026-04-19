/**
 * Module: Backend (API Server)
 * File Purpose: Dashboard Routes. Provides summary counts for the Admin Panel.
 * Used By: Admin Panel
 * API Connected: /api/dashboard/*
 * Database Model: N/A (Aggregates)
 * Critical: No
 */
import { Router } from "express";
import { getCounts } from "../controllers/DashboardController";
import { authJwt } from "../middleware/authJwt";        
import { adminOnly } from "../middleware/adminOnly";    

const router = Router();

/**
 * Route: GET /api/dashboard/data-counts
 * Role: Admin
 * Description: Retrieves aggregate counts for creators, businesses, posts, and orders.
 */
router.get(
  "/data-counts",
  authJwt,
  adminOnly,
  getCounts
);

export default router;
