/**
 * Module: Backend (API Server)
 * File Purpose: Order Routes. Endpoints for order transaction management.
 * Used By: Admin Panel
 * API Connected: /api/orders/*
 * Database Model: Order
 * Critical: Yes
 * Notes: Currently restricted to Admin users only.
 */
import { Router } from "express";
import * as OrderController from "../controllers/OrderController";
import { authJwt } from "../middleware/authJwt";        
import { adminOnly } from "../middleware/adminOnly";    

const router = Router();

/**
 * Route: GET /api/orders/all
 * Role: Admin
 * Description: Fetches all orders with filtering and summation of total amount.
 */
router.get(
  "/all",
  authJwt,
  adminOnly,
  OrderController.index
);

/**
 * Route: GET /api/orders/details/:order_id
 * Role: Admin
 * Description: Retrieves detailed information for a specific order.
 */
router.get(
  "/details/:order_id",
  authJwt,
  adminOnly,
  OrderController.showDetails
);

export default router;
