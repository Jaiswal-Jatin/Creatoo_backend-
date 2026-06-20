"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Withdraw Request Routes. Manages Creator cash-out requests.
 * Used By: Admin Panel, User Mobile App
 * API Connected: /api/withdrawRequest/*
 * Database Model: WithdrawRequest
 * Critical: Yes
 */
const express_1 = require("express");
const WithdrawRequestController_1 = require("../controllers/WithdrawRequestController");
const authJwt_1 = require("../middleware/authJwt");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
/**
 * Route: POST /api/withdrawRequest/add
 * Role: Creator
 * Description: Creator initiates a withdrawal request.
 */
router.post("/add", authJwt_1.authJwt, WithdrawRequestController_1.addWithdrawRequest);
/**
 * Route: GET /api/withdrawRequest/list
 * Role: Creator
 * Description: Lists withdrawal requests for the authenticated creator.
 */
router.get("/list", authJwt_1.authJwt, WithdrawRequestController_1.getWithdrawRequest);
/**
 * Route: GET /api/withdrawRequest/all
 * Role: Admin
 * Description: Lists all withdrawal requests in the system with date filtering.
 */
router.get("/all", authJwt_1.authJwt, adminOnly_1.adminOnly, WithdrawRequestController_1.getAllWithdrawRequest);
/**
 * Route: POST /api/withdrawRequest/update-transaction
 * Role: Admin
 * Description: Updates a request with a transaction ID and marks it as completed.
 */
router.post("/update-transaction", authJwt_1.authJwt, adminOnly_1.adminOnly, WithdrawRequestController_1.updateTransaction);
/**
 * Route: POST /api/withdrawRequest/reject
 * Role: Admin
 * Description: Rejects a withdrawal request.
 */
router.post("/reject", authJwt_1.authJwt, adminOnly_1.adminOnly, WithdrawRequestController_1.changeStatusToRejected);
exports.default = router;
