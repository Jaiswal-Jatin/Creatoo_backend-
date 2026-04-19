/**
 * Module: Backend (API Server)
 * File Purpose: Withdraw Request Routes. Manages Creator cash-out requests.
 * Used By: Admin Panel, User Mobile App
 * API Connected: /api/withdrawRequest/*
 * Database Model: WithdrawRequest
 * Critical: Yes
 */
import { Router } from "express";
import {
  addWithdrawRequest,
  getWithdrawRequest,
  getAllWithdrawRequest,
  updateTransaction,
  changeStatusToRejected,
} from "../controllers/WithdrawRequestController";

import { authJwt } from "../middleware/authJwt";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

/**
 * Route: POST /api/withdrawRequest/add
 * Role: Creator
 * Description: Creator initiates a withdrawal request.
 */
router.post(
  "/add",
  authJwt,
  addWithdrawRequest
);

/**
 * Route: GET /api/withdrawRequest/list
 * Role: Creator
 * Description: Lists withdrawal requests for the authenticated creator.
 */
router.get(
  "/list",
  authJwt,
  getWithdrawRequest
);

/**
 * Route: GET /api/withdrawRequest/all
 * Role: Admin
 * Description: Lists all withdrawal requests in the system with date filtering.
 */
router.get(
  "/all",
  authJwt,
  adminOnly,
  getAllWithdrawRequest
);

/**
 * Route: POST /api/withdrawRequest/update-transaction
 * Role: Admin
 * Description: Updates a request with a transaction ID and marks it as completed.
 */
router.post(
  "/update-transaction",
  authJwt,
  adminOnly,
  updateTransaction
);

/**
 * Route: POST /api/withdrawRequest/reject
 * Role: Admin
 * Description: Rejects a withdrawal request.
 */
router.post(
  "/reject",
  authJwt,
  adminOnly,
  changeStatusToRejected
);

export default router;
