"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module: Backend (API Server)
 * File Purpose: Dashboard Routes. Provides summary counts for the Admin Panel.
 * Used By: Admin Panel
 * API Connected: /api/dashboard/*
 * Database Model: N/A (Aggregates)
 * Critical: No
 */
const express_1 = require("express");
const DashboardController_1 = require("../controllers/DashboardController");
const authJwt_1 = require("../middleware/authJwt");
const adminOnly_1 = require("../middleware/adminOnly");
const router = (0, express_1.Router)();
/**
 * Route: GET /api/dashboard/data-counts
 * Role: Admin
 * Description: Retrieves aggregate counts for creators, businesses, posts, and orders.
 */
router.get("/data-counts", authJwt_1.authJwt, adminOnly_1.adminOnly, DashboardController_1.getCounts);
exports.default = router;
